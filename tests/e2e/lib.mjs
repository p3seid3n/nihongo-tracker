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

/** Solve a matching exercise by trying the English side one by one (a wrong tap keeps the selection). */
export async function solveMatch(page) {
  const total = await page.locator(".match > div:first-child button").count();
  for (let k = 0; k < total; k++) {
    const lefts = page.locator(".match > div:first-child button:not(.gone)");
    const before = await lefts.count();
    if (!before) break;
    await lefts.first().click();
    const rights = page.locator(".match > div:last-child button:not(.gone)");
    const rc = await rights.count();
    for (let r = 0; r < rc; r++) {
      await rights.nth(r).click();
      await page.waitForTimeout(40);
      if ((await page.locator(".match > div:first-child button:not(.gone)").count()) < before) break;
    }
  }
}
