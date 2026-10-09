import { launch, shot, BASE } from "./lib.mjs";
const FILE = process.env.APKG || "/mnt/user-data/uploads/All_decks-20261004095235.apkg";
const { browser, page, errors } = await launch();
const log = (...a) => console.log(...a);
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started");
await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning");
await page.waitForSelector(".plan-hero");
await page.click("text=Import from Anki");
await page.setInputFiles('input[type="file"]', FILE);
await page.waitForSelector("text=/Found \\d+ decks?/", { timeout: 120000 });
const inputs = page.locator('input[aria-label="cards known"]');
const setKnown = async (i, v) => { await inputs.nth(i).fill(String(v)); await inputs.nth(i).press("Enter"); };
await setKnown(0, 315); await setKnown(1, 147); await setKnown(2, 124); await setKnown(3, 41);
log("values:", await inputs.evaluateAll((els) => els.map((e) => e.value)));
await page.click("text=/Import \\d+ decks?/");
await page.waitForSelector("text=/Imported [\\d,]+ cards/", { timeout: 60000 });
await shot(page, "34-import-done");
log(await page.innerText(".lesson-body"));
await page.click("text=Back to library");
await page.waitForSelector(".page");
await shot(page, "35-library");
log("decks:", await page.evaluate(() => window.__ntStore.deckList().map((d) => `${d.id}:${d.kind}:${d.enabled}`)));
// home counts
await page.click("nav >> text=Today");
await page.waitForSelector(".plan-hero");
log("home:", (await page.innerText(".plan")).replace(/\n/g, " | "));
await shot(page, "36-home");
// study the Kaishi deck and the RRTK deck
for (const [needle, tag] of [["Kaishi", "kaishi"], ["RRTK", "rrtk"]]) {
  await page.click("nav >> text=Cards");
  await page.click(`.card:has-text("${needle}")`);
  await page.click("text=Study");
  await page.waitForSelector(".flash");
  await shot(page, `37-${tag}-front`);
  await page.click("button.show-btn");
  await page.waitForTimeout(400);
  await shot(page, `38-${tag}-back`);
  await page.click(".study-top button[aria-label='Close session']");
  await page.waitForSelector(".page");
}
log("errors:", errors);
await browser.close();
