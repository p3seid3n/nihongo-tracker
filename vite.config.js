import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Writes dist/sw.js: a small service worker that pre-caches every file of this exact build,
// so the app opens offline and can never mix files from two different versions.
function serviceWorker() {
  let outDir = "dist";
  return {
    name: "nihongo-service-worker",
    apply: "build",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const files = [];
      const walk = (dir) => {
        for (const name of fs.readdirSync(dir)) {
          const full = path.join(dir, name);
          if (fs.statSync(full).isDirectory()) walk(full);
          else files.push(full);
        }
      };
      walk(outDir);
      const manifest = files
        .map((f) => path.relative(outDir, f).split(path.sep).join("/"))
        .filter((f) => f !== "sw.js" && !f.endsWith(".map") && !f.startsWith("strokes/") && !f.startsWith("fonts/")) // stroke data and optional fonts are fetched when first needed
        .map((f) => ({
          url: f === "index.html" ? "./" : f,
          rev: crypto.createHash("md5").update(fs.readFileSync(path.join(outDir, f))).digest("hex").slice(0, 10),
        }));
      const version = crypto.createHash("md5").update(JSON.stringify(manifest)).digest("hex").slice(0, 10);
      const template = fs.readFileSync(path.resolve("src/sw-template.js"), "utf8");
      const out = template
        .split("__VERSION__").join(version)
        .split("__PRECACHE__").join(JSON.stringify(manifest));
      fs.writeFileSync(path.join(outDir, "sw.js"), out);
      console.log(`service worker: ${manifest.length} files, version ${version}`);
    },
  };
}

// Puts the opening animation (src/splash/) straight into index.html, so it starts before the app bundle has loaded.
function inlineSplash() {
  const read = (f) => fs.readFileSync(path.resolve("src/splash", f), "utf8");
  return {
    name: "kotoba-inline-splash",
    transformIndexHtml(html) {
      const k = JSON.stringify(JSON.parse(read("constants.json")));
      const script = read("renderer.js") + "\n" + read("splash.js").split("__INK_CONSTANTS__").join(k).split("__INK_FIELD__").join(JSON.stringify("/ink/field.png")).split("__INK_FLOOD__").join(JSON.stringify("/ink/flood.png"));
      return html
        .replace(/<!-- splash:style[^>]*-->/, `<style>${read("splash.css")}</style>`)
        .replace(/<!-- splash:body[^>]*-->/, `<div id="splash" aria-hidden="true"><canvas></canvas></div>\n<script>${script}</script>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineSplash(), serviceWorker()],
  // VITE_ is Vite's own prefix. NEXT_PUBLIC_SUPABASE_ is what the Vercel–Supabase integration adds (public values only;
  // service keys and the database address have other names and stay on the server).
  envPrefix: ["VITE_", "NEXT_PUBLIC_SUPABASE_"],
  build: { target: "es2020", sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { include: ["tests/**/*.test.js"], environment: "node" },
});
