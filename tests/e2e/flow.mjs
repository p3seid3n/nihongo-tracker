import { launch, shot, BASE } from "./lib.mjs";
const { browser, page, errors } = await launch();
const log = (...a) => console.log(...a);
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started");
await page.click("text=Brand new");
await page.click("text=Continue");
await page.click("text=Continue");
await page.click("text=Continue");
await page.click("text=Start learning");
await page.waitForSelector("text=Today's cards");
await shot(page, "10-home-beginner");
log("home:", (await page.innerText("body")).split("\n").slice(0, 12).join(" | "));

// ---- study session
await page.click("text=/Study \\d+ cards/");
await page.waitForSelector(".flash");
await shot(page, "11-study-front");
await page.click("text=Show answer");
await shot(page, "12-study-back");
let n = 0;
for (let i = 0; i < 60; i++) {
  if (await page.locator("text=Session complete").count()) break;
  const show = page.locator("button.show-btn");
  if (await show.count()) await show.click();
  const good = page.locator("button.grade.g3");
  if (await good.count()) { await good.click(); n++; }
}
log("graded:", n);
await page.waitForSelector("text=Session complete", { timeout: 5000 });
await shot(page, "13-study-done");
await page.click(".overlay-wrap >> text=Done");
await page.waitForSelector(".plan-hero");

// ---- lesson
await page.click("text=Grammar");
await page.waitForSelector("text=Foundations");
await shot(page, "14-learn");
await page.click(".node.available");
await page.waitForSelector("text=How Japanese is written");
await shot(page, "15-lesson-page");
for (let i = 0; i < 8; i++) {
  const t = await page.locator("button.btn-primary.btn-lg").first().innerText();
  await page.locator("button.btn-primary.btn-lg").first().click();
  if (t.includes("Start practice")) break;
}
await page.waitForSelector(".lesson-body");
let steps = 0;
for (let i = 0; i < 80; i++) {
  if (await page.locator("text=Lesson complete, text=Almost there").count()) break;
  if (await page.locator("h1:has-text('Lesson complete'), h1:has-text('Almost there')").count()) break;
  if (steps === 2) await shot(page, "16-exercise");
  const cont = page.locator(".feedback button");
  if (await cont.count()) { await cont.click(); steps++; continue; }
  if (await page.locator(".match").count()) {
    const lefts = await page.locator(".match > div:first-child button").count();
    for (let l = 0; l < lefts; l++) {
      const lb = page.locator(".match > div:first-child button:not(.gone)").first();
      await lb.click();
      const rights = page.locator(".match > div:last-child button:not(.gone)");
      const rc = await rights.count();
      for (let r = 0; r < rc; r++) {
        await rights.nth(r).click();
        if ((await page.locator(".match > div:first-child button:not(.gone)").count()) < lefts - l) break;
        await lb.click();
      }
    }
    continue;
  }
  if (await page.locator(".opt").count()) {
    await page.locator(".opt").first().click();
    await page.locator(".sticky-actions button").click();
    continue;
  }
  if (await page.locator(".tilebtn").count()) {
    const tiles = page.locator(".tile-zone:not(.answer-zone) .tilebtn");
    const c = await tiles.count();
    for (let k = 0; k < c; k++) { const t = tiles.nth(k); if (await t.isEnabled()) await t.click(); }
    await page.locator(".sticky-actions button").click();
    continue;
  }
  await page.waitForTimeout(100);
}
log("exercise steps:", steps);
await shot(page, "17-lesson-result");
log("result:", (await page.innerText("h1")));
await page.click(".overlay-wrap >> text=Done");

// ---- other tabs
for (const [name, file] of [["Cards", "18-cards"], ["Stats", "19-stats"], ["Settings", "20-settings"]]) {
  await page.click(`nav >> text=${name}`);
  await page.waitForTimeout(300);
  await shot(page, file);
}
log("errors:", errors);
await browser.close();
