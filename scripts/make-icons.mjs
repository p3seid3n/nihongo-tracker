// Renders the app icons (run once: node scripts/make-icons.mjs). Needs playwright-core and a Chromium.
import { chromium } from "playwright-core";
import fs from "node:fs";
const exe = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium"].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
const html = (size, pad) => `<html><body style="margin:0;background:#151413"><div style="width:${size}px;height:${size}px;background:#151413;display:grid;place-items:center;position:relative;overflow:hidden">
<div style="position:absolute;width:${size * 0.9}px;height:${size * 0.9}px;border-radius:50%;background:radial-gradient(closest-side,rgba(238,133,89,.35),transparent)"></div>
<div style="position:relative;font:500 ${size * (1 - pad * 2) * 0.72}px 'Noto Serif CJK JP','Noto Serif JP','Hiragino Mincho ProN',serif;color:#ee8559;line-height:1">学</div></div></body></html>`;
const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const p = await b.newPage();
for (const [name, size, pad] of [["icon-192", 192, 0.1], ["icon-512", 512, 0.1], ["icon-maskable-512", 512, 0.22], ["apple-touch-icon", 180, 0.1]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(html(size, pad));
  await p.screenshot({ path: `public/${name}.png` });
}
await b.close();
