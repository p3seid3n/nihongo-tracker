// 4.7: daily plan on Today, Practice tab, regrouped Settings with the card library inside, visual fixes.
import { launch, shot, BASE } from "./lib.mjs";
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) process.exitCode = 1; };

const { browser, page, errors } = await launch();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");
await page.waitForTimeout(500);
await shot(page, "v47-today");

// ---- navigation
const tabs = await page.$$eval("nav.nav .nav-item span", (els) => els.map((e) => e.textContent));
ok(tabs.join(",") === "Today,Grammar,Practice,Stats,Settings", `tabs are ${tabs.join(",")}`);

// ---- Today shows a curated plan
const steps = await page.$$eval(".plan .step .title", (els) => els.map((e) => e.textContent));
console.log("steps:", steps.join(" | "));
ok(steps.length >= 1, "Today lists plan items");
ok(await page.locator(".plan-hero >> text=/Today's plan|plan is done/").count() > 0, "hero says Today's plan");
ok(await page.locator(".week-strip .wd").count() === 7, "week strip has 7 days");
ok(await page.locator("text=/Next new grammar point/").count() > 0, "shows when the next grammar point comes");
// old labels are gone
ok(await page.locator("text=/\\d+ of \\d+ points/").count() === 0, "the confusing 'x of y points' label is gone");

// ---- Practice
await page.click("nav >> text=Practice");
await page.waitForSelector("text=Everything you can practise");
await page.waitForTimeout(700);
await shot(page, "v47-practice");
for (const t of ["Study", "Write", "Review grammar", "Sentence practice", "Reading", "Writing prompts", "Pitch practice"]) {
  ok(await page.locator(`.step .title:has-text("${t}")`).count() > 0, `Practice has ${t}`);
}

// each practice type opens its own screen and closes back to Practice
for (const [title, probe] of [["Reading", "h1:has-text('Reading')"], ["Writing prompts", "h1:has-text('Writing prompts')"], ["Study", ".flash, .summary"]]) {
  await page.locator(`.step:has-text("${title}")`).first().click();
  await page.waitForSelector(probe, { timeout: 8000 });
  ok(true, `${title} opens from Practice`);
  await page.goBack();
  await page.waitForSelector("text=Everything you can practise");
}
// the Grammar tab points to Practice for the rest
await page.click("nav >> text=Grammar");
await page.waitForSelector("text=Foundations");
await page.click("button:has-text('More practice')");
await page.waitForSelector("text=Everything you can practise");
ok(true, "Grammar tab has a link to Practice");

// ---- finishing things updates Today
await page.evaluate(() => { const s = window.__ntStore; s.logLesson("review", 1, 60000); s.markPractice("read", "intro", { ms: 60000 }); });
await page.click("nav >> text=Today");
await page.waitForTimeout(500);
ok(await page.locator(".step.done:has-text('Read a short text')").count() === 1, "a finished reading shows as done on Today");
await page.evaluate(() => { const s = window.__ntStore; s.recordLesson("u2-polite", 0.9, { first: true }); s.logLesson("u2-polite", 0.9, 60000); });
await page.waitForTimeout(500);
ok(await page.locator(".step.done:has-text('New lesson')").count() === 1, "a lesson passed today shows as done");
ok(await page.locator("text=/Next new grammar point/").innerText().then((t) => /every 7 days|every \d+ days/.test(t)), "and the next lesson is a week away");
await shot(page, "v47-today-after");

// ---- the time budget trims the day
await page.evaluate(() => window.__ntStore.updateSettings({ minutes: 10 }));
await page.waitForTimeout(300);
const small = await page.$$eval(".plan .step .title", (e) => e.length);
await page.evaluate(() => window.__ntStore.updateSettings({ minutes: 60 }));
await page.waitForTimeout(300);
const big = await page.$$eval(".plan .step .title", (e) => e.length);
ok(small <= big, `a bigger time budget never shows fewer items (${small} vs ${big})`);

// ---- Settings menu and pages
await page.click("nav >> text=Settings");
await page.waitForSelector("text=Daily plan");
await page.waitForTimeout(700);
await shot(page, "v47-settings");
for (const t of ["Daily plan", "New cards and reviews", "Cards and decks", "Memory model", "Listening and speaking", "Look and feel", "Backup and import", "About"]) {
  ok(await page.locator(`.list-item:has-text("${t}")`).count() > 0, `Settings menu has ${t}`);
}
await page.click('[data-page="plan"]');
await page.waitForSelector("text=Days between new lessons");
await page.waitForTimeout(700);
await shot(page, "v47-plan");
const before = await page.evaluate(() => window.__ntStore.settings.grammarEvery);
ok(before === 7, `default pace is a lesson every 7 days (${before})`);
await page.click('button[aria-label="Increase days between new lessons"]');
ok(await page.evaluate(() => window.__ntStore.settings.grammarEvery) === 8, "stepper changes the pace");
await page.click('button[role=switch][aria-label="Early lessons are quicker"]');
ok(await page.evaluate(() => window.__ntStore.settings.grammarEarlyFast) === false, "early speed-up can be switched off");
await page.click('button[aria-label="Back"]');
await page.waitForSelector('[data-page="cards"]');

await page.click('[data-page="cards"]');
await page.waitForSelector("h1:has-text('Decks')");
await page.waitForTimeout(700);
await shot(page, "v47-cards-in-settings");
await page.click('button[aria-label="Back"]');
await page.waitForSelector('[data-page="cards"]');
ok(true, "card library opens under Settings and goes back");

for (const id of ["pace", "memory", "sound", "look", "data", "about"]) {
  await page.click(`[data-page="${id}"]`);
  await page.waitForTimeout(150);
  ok(await page.locator("h1").first().isVisible(), `${id} page opens`);
  await page.click('button[aria-label="Back"]');
  await page.waitForSelector('[data-page="cards"]');
}

// ---- no visible scrollbar thumbs
const sb = await page.evaluate(() => getComputedStyle(document.querySelector(".page")).scrollbarWidth);
ok(sb === "none", `scrollbars are hidden (${sb})`);

ok(errors.length === 0, "no console errors " + errors.join(" ; "));
await browser.close();

// ---- a brand new learner: first lesson today, then a pause before the next
{
  const { browser: b2, page: p2, errors: e2 } = await launch();
  await p2.goto(BASE, { waitUntil: "networkidle" });
  await p2.click("text=Get started"); await p2.click("text=Brand new");
  await p2.click("text=Continue"); await p2.click("text=Continue"); await p2.click("text=Continue");
  await p2.click("text=Start learning"); await p2.waitForSelector(".plan-hero");
  await p2.waitForTimeout(900);
  await shot(p2, "v47-today-beginner");
  ok(await p2.locator(".step:has-text('New lesson: How Japanese is written')").count() === 1, "a new learner starts with the first lesson");
  const t = await p2.locator(".effort").innerText();
  ok(/done/.test(t) && /still planned/.test(t) && !/\d+ of \d+/.test(t), "effort meter reads clearly: " + t.replace(/\n/g, " | "));
  const subs = await p2.$$eval(".step .sub", (e) => e.map((x) => x.innerText));
  ok(subs.every((x) => !/\s…\s*$/.test(x)), "no sub line ends in a lone ellipsis");
  // finish the first lesson: it is done today and the next one is not offered until the pause is over
  await p2.evaluate(() => { const s = window.__ntStore; s.recordLesson("u1-writing", 0.9, { first: true }); s.logLesson("u1-writing", 0.9, 1000); });
  await p2.waitForTimeout(400);
  ok(await p2.locator(".step.done:has-text('New lesson: How Japanese is written')").count() === 1, "the lesson shows as done");
  ok(await p2.locator(".step:has-text('New lesson: Saying what something is')").count() === 0, "the next lesson is not on today's list");
  ok(await p2.locator(".step:has-text('Get ahead: Saying what something is')").count() === 1, "but can be started early from 'If you have time'");
  await p2.waitForTimeout(300);
  await shot(p2, "v47-today-beginner-after");
  ok(e2.length === 0, "no console errors (beginner) " + e2.join(" ; "));
  await b2.close();
}
