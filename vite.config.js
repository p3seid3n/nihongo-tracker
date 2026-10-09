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
        .filter((f) => f !== "sw.js" && !f.endsWith(".map") && !f.startsWith("strokes/")) // stroke data is fetched when first needed
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

export default defineConfig({
  plugins: [react(), serviceWorker()],
  build: { target: "es2020", sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { include: ["tests/**/*.test.js"], environment: "node" },
});
