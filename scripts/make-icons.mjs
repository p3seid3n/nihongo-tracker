// Renders the app icons from KanjiVG stroke data: node scripts/make-icons.mjs
// (run `node scripts/build-strokes.mjs` first). Needs playwright-core and a Chromium.
import { chromium } from "playwright-core";
import fs from "node:fs";

const GLYPH = "言"; // "word" / "speak"; the first stroke is highlighted like the next stroke to draw
const chars = [...fs.readFileSync("public/strokes/index.txt", "utf8")];
const strokes = JSON.parse(fs.readFileSync(`public/strokes/${Math.floor(chars.indexOf(GLYPH) / 96)}.json`, "utf8"))[GLYPH];
const exe = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium"].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });

const svg = (size, pad) => {
  const inner = size * (1 - pad * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7b085"/><stop offset="1" stop-color="#ea7a47"/></linearGradient>
<radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#2a2420"/><stop offset="1" stop-color="#141211"/></radialGradient></defs>
<rect width="${size}" height="${size}" fill="url(#bg)"/>
<circle cx="${size * 0.5}" cy="${size * 0.47}" r="${size * (0.5 - pad * 0.9)}" fill="#ee8559" fill-opacity=".10"/>
<g transform="translate(${size * pad} ${size * pad}) scale(${inner / 109})" fill="none" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round">${strokes.map((d, i) => `<path d="${d}" stroke="${i === 0 ? "#fff3e8" : "url(#g)"}"/>`).join("")}</g></svg>`;
};

const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const p = await b.newPage();
for (const [name, size, pad] of [["icon-192", 192, 0.15], ["icon-512", 512, 0.15], ["icon-maskable-512", 512, 0.24], ["apple-touch-icon", 180, 0.15]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<body style="margin:0">${svg(size, pad)}</body>`);
  await p.screenshot({ path: `public/${name}.png` });
}
fs.writeFileSync("public/icon.svg", svg(512, 0.15));
await b.close();
console.log("icons written");
