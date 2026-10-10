// Lesson layout, tables, Tae Kim toggle, matching both ways, exit animations, recap after answers.
import { launch, shot, BASE } from "./lib.mjs";
let failed = false;
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) failed = true; };
const { browser, page, errors } = await launch();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");

const openLesson = async (title) => {
  await page.click("nav >> text=Grammar");
  await page.waitForTimeout(400);
  await page.locator(".node", { hasText: title }).first().scrollIntoViewIfNeeded();
  await page.locator(".node", { hasText: title }).first().click();
  await page.waitForSelector(".lesson-body");
  await page.waitForTimeout(700);
};
const geom = () => page.evaluate(() => {
  const b = document.querySelector(".lesson-body").getBoundingClientRect();
  const f = document.querySelector(".lesson-foot")?.getBoundingClientRect();
  return { bodyBottom: Math.round(b.bottom), footTop: f ? Math.round(f.top) : null, vh: innerHeight, winScroll: scrollY };
});

// ---- layout: content ends where the buttons begin
await openLesson("Saying what something is");
await shot(page, "100-lesson-p0");
let g = await geom();
ok(g.footTop !== null && g.bodyBottom <= g.footTop + 1, `content stops above the buttons (${g.bodyBottom} <= ${g.footTop})`);
ok(g.winScroll === 0, "page itself does not scroll");
// です stays whole in the prose
const broken = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".prose p")].find((p) => p.textContent.includes("です everywhere"));
  if (!el) return "no paragraph";
  const r = document.createRange(); const out = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { const i = n.textContent.indexOf("です"); if (i >= 0) { r.setStart(n, i); r.setEnd(n, i + 1); const a = r.getBoundingClientRect(); r.setStart(n, i + 1); r.setEnd(n, i + 2); const b = r.getBoundingClientRect(); out.push(Math.abs(a.top - b.top) > 4); } }
  return out.some(Boolean) ? "split" : "whole";
});
ok(broken === "whole", "です is not split across lines: " + broken);

// ---- table on page 2, forward slide, then back slide
await page.click(".lesson-foot button:has-text('Continue')");
await page.waitForTimeout(150);
ok(await page.locator(".lesson-body[data-dir='fwd']").count() === 1, "forward page slides in from the right");
await page.waitForTimeout(600);
ok(await page.locator(".tbl").count() >= 1, "table rendered on page 2");
await shot(page, "101-lesson-table");
await page.click(".lesson-foot button:has-text('Back')");
await page.waitForTimeout(120);
ok(await page.locator(".lesson-body[data-dir='back']").count() === 1, "Back slides in from the left");
await page.waitForTimeout(500);

// ---- Tae Kim toggle
await page.click(".src-toggle button:has-text('Tae Kim')");
await page.waitForTimeout(600);
const href = await page.locator("a:has-text('guidetojapanese.org')").getAttribute("href");
ok(/guidetojapanese\.org\/learn\/grammar\/stateofbeing$/.test(href), "Tae Kim view links to the exact section: " + href);
ok(await page.locator(".prose p").count() >= 1 && !(await page.locator(".tbl").count()), "Tae Kim view shows the link panel, not our tables");
await shot(page, "102-taekim");
ok(await page.evaluate(() => window.__ntStore.settings.explain) === "taekim", "choice is saved in settings");
await page.click(".src-toggle button:has-text('Kotoba')");
await page.waitForTimeout(500);
ok(await page.locator(".prose p").first().innerText().then((t) => /put B after A/.test(t)), "back to Kotoba explanation");

// ---- closing animates the same view out
await page.click("button[aria-label='Close lesson']");
await page.waitForTimeout(60);
const leaving = await page.evaluate(() => { const o = document.querySelector(".overlay-wrap.out"); return !!o && !!o.querySelector(".lesson-body") && getComputedStyle(o).animationName; });
ok(leaving && /overlay-out/.test(String(leaving)), "closing keeps the lesson on screen while it animates out: " + leaving);
await page.waitForTimeout(400);
ok(await page.locator(".overlay-wrap").count() === 0, "overlay removed after the animation");

// ---- sheet leaves with an animation
await page.click("button[aria-label='Options for Foundations']");
await page.waitForSelector(".sheet");
await page.waitForTimeout(500);
await page.keyboard.press("Escape");
await page.waitForTimeout(60);
ok(await page.locator(".sheet-ghost").count() === 1 && await page.locator(".sheet").count() === 0, "sheet slides away instead of vanishing");
await page.waitForTimeout(400);
ok(await page.locator(".sheet-ghost, .scrim-ghost").count() === 0, "sheet copy removed afterwards");

// ---- practice: matching both ways + recap
await page.evaluate(() => window.__ntStore.markLessonsDone(["u1-desu", "u1-wa"]));
await openLesson("Saying what something is");
await page.click(".lesson-foot button:has-text('Skip to practice'), button:has-text('Skip to practice')");
await page.waitForSelector(".ex-frame");
await page.waitForTimeout(500);
let guard = 0, sawMatch = false, sawRecap = false;
while (guard++ < 40) {
  if (await page.locator("h1:has-text('complete'), h1:has-text('Almost')").count()) break;
  if (await page.locator(".match").count()) {
    sawMatch = true;
    // start from the RIGHT column this time
    const lefts = await page.locator(".match > div:first-child button:not(.gone)").count();
    for (let k = 0; k < lefts; k++) {
      const right = page.locator(".match > div:last-child button:not(.gone)");
      const left = page.locator(".match > div:first-child button:not(.gone)");
      const lc = await left.count();
      await right.first().click();
      for (let l = 0; l < lc; l++) {
        await left.nth(l).click();
        await page.waitForTimeout(60);
        if ((await page.locator(".match > div:first-child button:not(.gone)").count()) < lc) break;
      }
    }
    await page.waitForTimeout(300);
    if (await page.locator(".feedback").count()) { ok(true, "matching works starting from the English side"); await shot(page, "103-match-done"); await page.click(".feedback button"); }
    continue;
  }
  if (await page.locator(".opt").count()) {
    await page.locator(".opt").first().click();
    await page.click(".sticky-actions button");
    await page.waitForSelector(".feedback");
    if (!sawRecap && await page.locator(".recap").count()) { sawRecap = true; await page.waitForTimeout(500); await shot(page, "104-recap"); }
    await page.click(".feedback button");
    continue;
  }
  if (await page.locator(".tilebtn").count()) {
    const tiles = page.locator(".tile-zone:not(.answer-zone) .tilebtn");
    const c = await tiles.count();
    for (let k = 0; k < c; k++) { const t = tiles.nth(k); if (await t.isEnabled()) await t.click(); }
    await page.click(".sticky-actions button");
    await page.waitForSelector(".feedback");
    if (await page.locator(".recap").count()) sawRecap = true;
    await page.click(".feedback button");
    continue;
  }
  await page.waitForTimeout(100);
}
ok(sawMatch, "a matching exercise appeared");
ok(sawRecap, "answers show the full-sentence recap");
g = await page.evaluate(() => ({ s: scrollY }));
ok(g.s === 0, "page never scrolled during practice");

// ---- look at a few table pages
for (const [title, pg] of [["Polite speech", 0], ["Honorific and humble", 0], ["Numbers and counting", 0], ["Asking questions", 1]]) {
  if (await page.locator(".overlay-wrap").count()) { await page.evaluate(() => history.back()); await page.waitForTimeout(450); }
  await openLesson(title);
  for (let i = 0; i < pg; i++) { await page.click(".lesson-foot button:has-text('Continue')"); await page.waitForTimeout(500); }
  await page.waitForTimeout(500);
  await shot(page, "110-" + title.replace(/\W+/g, "-"));
}
console.log("errors:", errors);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
