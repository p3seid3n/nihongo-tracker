import { chromium } from "playwright-core";
import fs from "node:fs";

export const BASE = process.env.BASE || "http://127.0.0.1:4173";
export const SHOTS = process.env.SHOTS || "/tmp/claude-0/shots";

export async function launch(opts = {}) {
  const candidates = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome",
    "/opt/pw-browsers/chromium",
  ];
  const exe = candidates.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    serviceWorkers: opts.serviceWorkers || "block",
    ...opts.context,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  return { browser, ctx, page, errors };
}
export const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
