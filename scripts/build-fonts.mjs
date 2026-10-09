// Copies the optional kanji fonts (Noto Sans JP for "Clear", Klee One for "Textbook") from their
// npm packages into public/fonts, with a stylesheet each. Only the slices a page actually needs are
// downloaded by the browser (unicode-range), and only after you pick one of these fonts in Settings.
// Both fonts are under the SIL Open Font License; the license texts are copied along.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/fonts");
const FONTS = [
  { id: "gothic", pkg: "@fontsource-variable/noto-sans-jp", css: "wght.css", from: "Noto Sans JP Variable", to: "Kotoba Gothic", file: /noto-sans-jp-\d+-wght-normal\.woff2/ },
  { id: "textbook", pkg: "@fontsource/klee-one", css: "400.css", from: "Klee One", to: "Kotoba Textbook", file: /klee-one-\d+-400-normal\.woff2/ },
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of FONTS) {
  const dir = path.resolve("node_modules", f.pkg);
  if (!fs.existsSync(dir)) { console.warn(`fonts: ${f.pkg} is not installed, skipping`); continue; }
  const css = fs.readFileSync(path.join(dir, f.css), "utf8");
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  const keep = [];
  const used = new Set();
  for (const b of blocks) {
    const m = b.match(/url\(\.\/files\/([^)]+\.woff2)\)/);
    if (!m || !f.file.test(m[1])) continue; // japanese slices only: no latin, cyrillic, greek, vietnamese
    used.add(m[1]);
    keep.push(
      b.replace(f.from, f.to)
        .replace(/src:[^;]*;/, `src: url(./${m[1]}) format('woff2');`)
        .replace(/\s+/g, " ")
    );
  }
  for (const name of used) fs.copyFileSync(path.join(dir, "files", name), path.join(OUT, name));
  fs.writeFileSync(path.join(OUT, `${f.id}.css`), keep.join("\n") + "\n");
  const lic = path.join(dir, "LICENSE");
  if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(OUT, `LICENSE-${f.id}.txt`));
  console.log(`fonts: ${f.id} ${used.size} files`);
}
