// Sentence practice: mixed exercises from your own vocabulary sentences, glosses, tap-a-word popup.
import { launch, shot, BASE } from "./lib.mjs";
const FILE = process.env.APKG || "/mnt/user-data/uploads/All_decks-20261004095235.apkg";
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) process.exitCode = 1; };
const { browser, page, errors } = await launch();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");
await page.click("text=Import from Anki");
await page.setInputFiles('input[type="file"]', FILE);
await page.waitForSelector("text=/Found \\d+ decks?/", { timeout: 120000 });
const inputs = page.locator('input[aria-label="cards known"]');
await inputs.nth(3).fill("300"); await inputs.nth(3).press("Enter");
await page.click("text=/Import \\d+ decks?/");
await page.waitForSelector("text=/Imported/", { timeout: 60000 });
await page.click("text=Back to library");
await page.evaluate(() => window.__ntStore.markLessonsDone(["u1-desu", "u1-wa", "u1-ga", "u1-wo", "u1-ni-de", "u1-past", "u1-neg", "u1-noun-particles", "u1-no", "u1-adverbs", "u1-verbs", "u1-na-adj", "u1-i-adj", "u2-polite"]));

await page.click("nav >> text=Grammar");
await page.click("text=Sentence practice");
await page.waitForSelector(".q-instr, .match");
const kinds = new Set();
let popups = 0, glossSeen = 0, steps = 0;
for (let i = 0; i < 60; i++) {
  if (await page.locator("h1:has-text('Practice complete')").count()) break;
  const cont = page.locator(".feedback button");
  if (await cont.count()) { await cont.click(); continue; }
  steps++;
  const instr = (await page.locator(".q-instr").first().innerText().catch(() => "")) || "match";
  kinds.add(instr);
  if (await page.locator(".tk-g").count()) glossSeen++;
  // no sideways overflow
  const over = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.querySelector(".lesson-body").scrollWidth > document.querySelector(".lesson-body").clientWidth + 1);
  if (over) ok(false, "horizontal overflow on: " + instr);
  // tap a word once per session on the first exercise that has tappable words
  if (popups < 2 && await page.locator(".q-prompt .tk.tap").count()) {
    const w = page.locator(".q-prompt .tk.tap").nth(popups % 2 ? 1 : 0);
    await w.click();
    await page.waitForSelector(".wpop");
    const box = await page.locator(".wpop").boundingBox();
    const vp = page.viewportSize();
    ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1, "popup inside the screen: " + JSON.stringify(box));
    const txt = await page.locator(".wpop").innerText();
    ok(txt.length > 3, "popup has content: " + txt.replace(/\n/g, " | ").slice(0, 160));
    await shot(page, `70-popup-${popups}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    ok(await page.locator(".wpop").count() === 0, "Escape closes the popup");
    ok(await page.locator(".q-prompt").count() > 0, "exercise still open after Escape");
    popups++;
  }
  await page.waitForTimeout(650);
  await shot(page, `71-ex-${steps}`);
  if (await page.locator(".match").count()) {
    const lefts = await page.locator(".match > div:first-child button").count();
    for (let l = 0; l < lefts; l++) {
      const lb = page.locator(".match > div:first-child button:not(.gone)").first();
      await lb.click();
      const rights = page.locator(".match > div:last-child button:not(.gone)");
      const rc = await rights.count();
      for (let r = 0; r < rc; r++) { await rights.nth(r).click(); if ((await page.locator(".match > div:first-child button:not(.gone)").count()) < lefts - l) break; await lb.click(); }
    }
    continue;
  }
  if (await page.locator(".opt").count()) { await page.locator(".opt").first().click(); await page.locator(".sticky-actions button").click(); continue; }
  if (await page.locator(".tilebtn").count()) {
    // build the right answer from what is asked: click tiles in bank order (may be wrong, that is fine)
    const tiles = page.locator(".tile-zone:not(.answer-zone) .tilebtn");
    const c = await tiles.count();
    for (let k = 0; k < c; k++) { const t = tiles.nth(k); if (await t.isEnabled()) await t.click(); }
    await page.locator(".sticky-actions button").click(); continue;
  }
  await page.waitForTimeout(100);
}
console.log("kinds:", [...kinds].join(" | "));
ok(kinds.size >= 4, "at least four kinds of exercise: " + kinds.size);
ok(popups >= 1, "tapped a word and got a popup");
ok(glossSeen > 0, "unlearned words carry a translation above them");
ok(await page.locator("h1:has-text('Practice complete')").count() === 1, "session finishes");
await shot(page, "72-sentences-done");
console.log("errors:", errors);
await browser.close();
