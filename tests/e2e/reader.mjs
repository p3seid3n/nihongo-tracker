// Reading list, passage view, tap-to-gloss, coverage meter, and writing prompts with the word check.
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
await inputs.nth(3).fill("700"); await inputs.nth(3).press("Enter");
await page.click("text=/Import \\d+ decks?/");
await page.waitForSelector("text=/Imported/", { timeout: 60000 });
await page.click("text=Back to library");
await page.evaluate(() => window.__ntStore.markLessonsDone(["u1-desu", "u1-wa", "u1-ga", "u1-wo", "u1-ni-de", "u1-past", "u1-neg", "u1-noun-particles", "u1-no", "u1-adverbs", "u1-verbs", "u1-na-adj", "u1-i-adj", "u2-polite"]));

const noOverflow = (label) => page.evaluate((label) => {
  const f = document.querySelector(".fullscreen");
  const b = document.querySelector(".reader-body") || f;
  return { label, page: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, body: b.scrollWidth > b.clientWidth + 1 };
}, label);

// ---- Reading from the Grammar tab
await page.click("nav >> text=Grammar");
await page.click("text=Reading");
await page.waitForSelector(".rd-card");
const n = await page.locator(".rd-card").count();
ok(n === 20, "20 passages listed: " + n);
ok(await page.locator(".rd-card .cov-bar").count() === 20, "each has a coverage bar");
await page.waitForTimeout(900);
await shot(page, "80-reader-list");
let o = await noOverflow("list"); ok(!o.page && !o.body, "list has no sideways overflow");
const firstTitle = await page.locator(".rd-card .rd-title").first().innerText();

await page.locator(".rd-card").first().click();
await page.waitForSelector(".rd-lines");
await page.waitForTimeout(900);
ok((await page.locator(".rd-h").innerText()) === firstTitle, "opened the passage: " + firstTitle);
ok(await page.locator(".cov-bar[role=meter]").count() > 0, "coverage meter shown");
const cb = await page.locator(".reader-body .cov-bar").boundingBox();
ok(cb && cb.width > 200 && cb.x >= 0 && cb.x + cb.width <= 391, "coverage bar is full width: " + JSON.stringify(cb));
ok(await page.locator(".rd-en").count() === 0, "English hidden by default");
await shot(page, "81-reader-passage");
o = await noOverflow("passage"); ok(!o.page && !o.body, "passage has no sideways overflow");

// tap a word
const tap = page.locator(".rd-jp .tk.tap");
ok(await tap.count() > 0, "tappable words: " + await tap.count());
await tap.first().click();
await page.waitForSelector(".wpop");
const box = await page.locator(".wpop").boundingBox(); const vp = page.viewportSize();
ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1, "popup inside the screen");
await shot(page, "82-reader-popup");
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
ok(await page.locator(".wpop").count() === 0, "Escape closes the popup");
ok(await page.locator(".rd-lines").count() > 0, "passage still open");

// per-line English
await page.locator('.rd-tools button[aria-label="Show the English"]').first().click();
ok(await page.locator(".rd-en").count() === 1, "one line's English shown");
// glosses toggle
const glossBefore = await page.locator(".tk-g").count();
await page.locator(".rd-toggles label, .rd-toggles").first().waitFor();
const sw = page.locator('.rd-toggles [role=switch], .rd-toggles input[type=checkbox]');
console.log("switches:", await sw.count(), "glosses:", glossBefore);
await shot(page, "83-reader-en");

// listen start/stop (no voice in headless: just must not throw)
await page.locator(".lesson-foot button").first().click();
await page.waitForTimeout(300);
await page.locator(".lesson-foot button").first().click();
await page.waitForTimeout(200);

// footer layout
const fb = await page.locator(".lesson-foot").boundingBox();
ok(fb && fb.y + fb.height <= vp.height + 1, "footer inside the screen");

// mark read
await page.locator(".lesson-foot .btn-primary").click();
await page.waitForTimeout(500);
const done = await page.evaluate(() => Object.keys(window.__ntStore.lessons).filter((k) => k.startsWith("read.")));
ok(done.length === 1, "reading recorded: " + done.join());
await shot(page, "84-reader-after");

// back to list: read mark and order
if (await page.locator(".rd-card").count() === 0) { await page.click('button[aria-label="Back to the list"]').catch(() => {}); }
await page.waitForSelector(".rd-card");
ok(await page.locator(".rd-card").count() === 20, "back on the list");
await shot(page, "85-reader-list2");

// close and check the effort log doesn't lose anything
await page.click('button[aria-label="Close"]');
await page.waitForTimeout(500);

// ---- Writing prompts
await page.click("nav >> text=Grammar");
await page.click("text=Writing prompts");
await page.waitForSelector(".rd-card");
ok(await page.locator(".rd-card").count() === 12, "12 prompts");
await shot(page, "86-out-list");
await page.locator(".rd-card").first().click();
await page.waitForSelector("textarea");
await shot(page, "87-out-prompt");
ok(await page.locator(".lesson-foot button").isDisabled(), "Check is disabled while empty");
await page.fill("textarea", "watashiha gakuseidesu.");
const v = await page.inputValue("textarea");
ok(/わたしは/.test(v) && /がくせいです。/.test(v), "romaji turned to kana: " + v);
await page.click(".lesson-foot .btn-primary");
await page.waitForSelector(".out-res");
await page.waitForTimeout(300);
ok(await page.locator(".out-res .stat").count() === 3, "result stats");
await shot(page, "88-out-check");
await page.click("text=/one way to say it/");
ok(await page.locator(".out-box .leech-sent").count() >= 1, "model answer shown");
await shot(page, "89-out-model");
o = await noOverflow("output"); ok(!o.page && !o.body, "output has no sideways overflow");
// Edit goes back, Done records
await page.click("text=Edit");
await page.waitForSelector(".lesson-foot .btn-primary");
await page.click(".lesson-foot .btn-primary");
await page.waitForSelector(".out-res");
await page.click(".lesson-foot .btn-primary");
await page.waitForTimeout(500);
const outDone = await page.evaluate(() => Object.keys(window.__ntStore.lessons).filter((k) => k.startsWith("out.")));
ok(outDone.length === 1, "writing recorded: " + outDone.join());
// the activity shows in the effort log, not as a card
const costs = await page.evaluate(() => Object.values(window.__ntStore.log).flat().filter((r) => String(r[1]).startsWith("g.")).length);
ok(costs >= 2, "activity rows in log: " + costs);

console.log("errors:", errors);
if (errors.length) process.exitCode = 1;
await browser.close();
