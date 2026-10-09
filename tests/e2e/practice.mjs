import { launch, shot, BASE } from "./lib.mjs";
const FILE = "/mnt/user-data/uploads/All_decks-20261004095235.apkg";
const log = (...a) => console.log(...a);
const { browser, page, errors } = await launch();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");
// import (Kaishi 41 known) so sentences exist
await page.click("text=Import from Anki");
await page.setInputFiles('input[type="file"]', FILE);
await page.waitForSelector("text=/Found \\d+ decks?/", { timeout: 120000 });
const inputs = page.locator('input[aria-label="cards known"]');
await inputs.nth(3).fill("200"); await inputs.nth(3).press("Enter");
await page.click("text=/Import \\d+ decks?/");
await page.waitForSelector("text=/Imported/", { timeout: 60000 });
await page.click("text=Back to library");

async function runExercises(maxSteps = 120) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.locator("h1:has-text('complete'), h1:has-text('Almost'), h1:has-text('skipped'), h1:has-text('Not this time'), h1:has-text('Nothing to practise')").count()) return true;
    const cont = page.locator(".feedback button");
    if (await cont.count()) { await cont.click(); continue; }
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
      const tiles = page.locator(".tile-zone:not(.answer-zone) .tilebtn");
      const c = await tiles.count();
      for (let k = 0; k < c; k++) { const t = tiles.nth(k); if (await t.isEnabled()) await t.click(); }
      await page.locator(".sticky-actions button").click(); continue;
    }
    await page.waitForTimeout(100);
  }
  return false;
}

// sentence reading
await page.click("nav >> text=Grammar");
await page.click("text=Read sentences");
await page.waitForSelector(".q-prompt");
await shot(page, "60-sentences");
log("sentences finished:", await runExercises(), (await page.innerText("h1")));
await page.click(".overlay-wrap >> text=Done");

// test out of unit 1 (bot guesses => probably fails; just must not crash)
await page.click("nav >> text=Grammar");
await page.click("button[aria-label='Options for Everyday Japanese']");
await shot(page, "61-unit-sheet");
await page.click("text=Test out of this unit");
await page.waitForSelector(".q-instr, .match");
log("testout finished:", await runExercises(), (await page.innerText("h1")));
await shot(page, "62-testout-result");
await page.click(".overlay-wrap >> text=Done");

// mark unit known, then grammar review
await page.click("button[aria-label='Options for Everyday Japanese']");
await page.click("text=I already know this unit");
await page.click(".sheet button:has-text('Mark as known')");
await page.waitForTimeout(400);
await page.click("nav >> text=Grammar");
await page.click("button:has-text('Review')");
await page.waitForSelector(".q-instr, .match");
log("review finished:", await runExercises(), (await page.innerText("h1")));
await page.click(".overlay-wrap >> text=Done");
await shot(page, "63-learn-after");
log("lessons done:", await page.evaluate(() => Object.values(window.__ntStore.lessons).filter((l) => l.done).length));
log("errors:", errors);
await browser.close();
