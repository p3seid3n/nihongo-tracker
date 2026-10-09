// Builds public/strokes/ from KanjiVG (CC BY-SA 3.0, https://kanjivg.tagaini.net).
// Run after `npm install`: node scripts/build-strokes.mjs
// Output: index.txt (every available character, sorted) and N.json shards of SHARD characters,
// each { "字": ["M31.75,24.75c...", ...] } with the stroke centre lines in order (109 x 109 grid).
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.KANJIVG_DIR || "node_modules/@madcat/kanjivg/dist/min/main";
const SRC2 = "node_modules/@madcat/kanjivg/dist/main";
const dir = fs.existsSync(SRC) ? SRC : SRC2;
const OUT = "public/strokes";
const SHARD = 96;

const wanted = (cp) => (cp >= 0x3041 && cp <= 0x309f) || (cp >= 0x30a0 && cp <= 0x30ff) || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || cp === 0x3005;
const chars = [];
for (const f of fs.readdirSync(dir)) {
  const m = /^([0-9a-f]{5})\.svg$/.exec(f);
  if (!m) continue;
  const cp = parseInt(m[1], 16);
  if (!wanted(cp)) continue;
  const svg = fs.readFileSync(path.join(dir, f), "utf8");
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((x) => x[1]);
  if (!paths.length) continue;
  chars.push([cp, paths]);
}
chars.sort((a, b) => a[0] - b[0]);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.txt"), chars.map(([cp]) => String.fromCodePoint(cp)).join(""));
for (let i = 0; i * SHARD < chars.length; i++) {
  const obj = {};
  for (const [cp, paths] of chars.slice(i * SHARD, (i + 1) * SHARD)) obj[String.fromCodePoint(cp)] = paths;
  fs.writeFileSync(path.join(OUT, `${i}.json`), JSON.stringify(obj));
}
fs.writeFileSync(path.join(OUT, "LICENSE.txt"), "Stroke data: KanjiVG, Copyright (C) 2009-2024 Ulrich Apel and contributors, licensed under Creative Commons Attribution-ShareAlike 3.0.\nhttps://kanjivg.tagaini.net  https://creativecommons.org/licenses/by-sa/3.0/\nConverted to compact JSON for Nihongo Tracker (stroke centre lines only).\n");
console.log(`${chars.length} characters in ${Math.ceil(chars.length / SHARD)} shards`);
