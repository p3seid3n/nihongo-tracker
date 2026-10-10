// 4.6: pitch practice (quiz + shadowing), guess-first cards, personal memory model.
import { launch, shot, BASE } from "./lib.mjs";
import { simulate, perturbed } from "../helpers/simlog.js";
const FILE = process.env.APKG || "/mnt/user-data/uploads/All_decks-20261004095235.apkg";
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) process.exitCode = 1; };
const { browser, page, errors } = await launch({ context: { permissions: ["microphone"] } });
await page.addInitScript(() => {
  window.__played = [];
  HTMLMediaElement.prototype.play = function () { window.__played.push(this.src.startsWith("blob:") ? "blob" : this.src.slice(0, 20)); setTimeout(() => this.onended && this.onended(), 30); return Promise.resolve(); };
  class FakeRec { constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; } start() { this.state = "recording"; window.__rec = (window.__rec || 0) + 1; } stop() { this.state = "inactive"; setTimeout(() => { this.ondataavailable && this.ondataavailable({ data: new Blob(["x"], { type: "audio/webm" }) }); this.onstop && this.onstop(); }, 10); } static isTypeSupported() { return true; } }
  window.MediaRecorder = FakeRec;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
});
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");

// ---- pitch practice without pitch data or audio
await page.click("nav >> text=Grammar");
await page.click("text=Pitch practice");
await page.waitForSelector("text=/no pitch accent data/");
ok(true, "empty state before anything is imported");
await page.click(".reader-body .btn-primary");
await page.waitForTimeout(500);

// ---- import with audio
await page.click("nav >> text=Today").catch(() => {});
await page.click("text=Import from Anki");
await page.setInputFiles('input[type="file"]', FILE);
await page.waitForSelector("text=/Found \\d+ decks?/", { timeout: 120000 });
const inputs = page.locator('input[aria-label="cards known"]');
await inputs.nth(3).fill("700"); await inputs.nth(3).press("Enter");
await page.click("text=/Import \\d+ decks?/");
await page.waitForSelector("text=/Imported/", { timeout: 240000 });
await page.click("text=Back to library");

// ---- pitch practice quiz
await page.click("nav >> text=Grammar");
await page.click("text=Pitch practice");
await page.waitForSelector("text=Start", { timeout: 20000 });
await page.waitForTimeout(900);
await shot(page, "90-pitch-intro");
await page.click(".lesson-foot .btn-primary");
await page.waitForSelector(".opts");
await page.waitForTimeout(900);
await shot(page, "91-pitch-q1");
const before = await page.evaluate(() => window.__played.filter((x) => x === "blob").length);
ok(before >= 1, "the recording plays when a question appears: " + before);
let kinds = new Set(), right = 0, n = 0;
for (let k = 0; k < 10; k++) {
  const instr = await page.locator(".q-instr").innerText();
  kinds.add(instr);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.querySelector(".reader-body").scrollWidth > document.querySelector(".reader-body").clientWidth + 1);
  if (over) ok(false, "overflow on " + instr);
  ok(await page.locator(".lesson-foot .btn-primary").isDisabled(), "Continue is disabled before answering (q" + (k + 1) + ")");
  await page.locator(".opt").first().click();
  await page.waitForSelector(".feedback-inline");
  if (k === 0 || k === 1) await shot(page, `92-pitch-answered-${k}`);
  if (await page.locator(".opt.right").count() === 1) n++;
  if ((await page.locator(".feedback-inline").innerText()).startsWith("Right")) right++;
  await page.click(".lesson-foot .btn-primary");
  await page.waitForTimeout(150);
  if (await page.locator("text=right").count() && await page.locator(".stat").count()) break;
}
console.log("kinds:", [...kinds].join(" | "), "right:", right);
ok(kinds.size === 2, "both question kinds appeared");
ok(n === 10, "every question shows exactly one right answer after answering: " + n);
await page.waitForSelector(".stat");
await page.waitForTimeout(400);
await shot(page, "93-pitch-summary");
const st = await page.locator(".stat").innerText();
ok(new RegExp(`${right} / 10`).test(st), "summary score matches: " + st.replace(/\n/g, " "));
const lessonDone = await page.evaluate(() => !!window.__ntStore.lessons["pitch.session"]);
ok(lessonDone, "session recorded as activity");

// ---- shadowing
await page.click("text=Shadow words");
await page.waitForSelector(".pitch");
await page.waitForTimeout(700);
await shot(page, "94-shadow");
ok(await page.locator(".say-btn.big-say").count() === 2, "listen and record buttons");
await page.locator('button[aria-label="Record yourself and compare"]').click();
await page.waitForSelector(".sheet");
const banner = await page.locator(".sheet").innerText();
ok(/compare the two by ear/.test(banner), "record-only sheet explains how to compare");
ok(await page.locator(".sheet .pitch").count() === 1, "the sheet shows the pitch of the word");
await page.locator('.sheet button[aria-label="Start speaking"]').click();
await page.waitForSelector("text=Recording…");
await page.locator('.sheet button[aria-label="Stop"]').click();
await page.waitForSelector("text=Compare");
ok(await page.evaluate(() => window.__rec) === 1, "recording started once");
await shot(page, "95-shadow-sheet");
await page.keyboard.press("Escape");
await page.mouse.click(195, 60).catch(() => {});
await page.waitForTimeout(300);
if (await page.locator(".sheet").count()) await page.locator(".scrim").click({ position: { x: 20, y: 20 } }).catch(() => {});
await page.waitForTimeout(400);
let steps = 0;
while (steps++ < 8 && !(await page.locator(".lesson-foot .btn-primary:has-text('Done')").count())) { await page.click(".lesson-foot .btn-primary"); await page.waitForTimeout(120); }
await page.click(".lesson-foot .btn-primary:has-text('Done')");
await page.waitForTimeout(600);
ok(await page.locator(".sheet").count() === 0 && await page.locator("h1:has-text('Shadowing')").count() === 0, "closed shadowing");

// ---- guess first
await page.click("nav >> text=Settings");
await page.waitForSelector("text=Guess before you see it");
await page.locator(".list-item:has-text('Guess before you see it')").scrollIntoViewIfNeeded();
ok(await page.evaluate(() => window.__ntStore.settings.pretest) === false, "guess-first is off by default");
await page.locator('button[role=switch][aria-label="Guess before you see it"]').click();
ok(await page.evaluate(() => window.__ntStore.settings.pretest) === true, "switch turns it on");
await page.click("nav >> text=Cards");
await page.click("button.card:has-text('Kaishi')");
await page.click(".sheet button:has-text('Study')");
await page.waitForSelector(".flash");
await page.waitForTimeout(500);
// find a new card: study until the input shows (reviews of known cards come first)
let guessSeen = false;
for (let k = 0; k < 60 && !guessSeen; k++) {
  if (await page.locator('input[aria-label="Your guess"]').count()) { guessSeen = true; break; }
  if (await page.locator("h1:has-text('Done'), .summary").count()) break;
  await page.locator(".show-btn").click().catch(() => {});
  await page.waitForSelector(".grades");
  await page.locator(".grade.g3").click();
  await page.waitForTimeout(80);
}
ok(guessSeen, "a new card asks for a guess first");
if (guessSeen) {
  await page.waitForTimeout(500);
  await shot(page, "96-guess");
  const tapReveal = await page.locator(".flash").click().then(() => true).catch(() => false);
  await page.waitForTimeout(150);
  ok(await page.locator(".grades").count() === 0, "tapping the card does not reveal it while guessing");
  await page.fill('input[aria-label="Your guess"]', "a cat");
  ok(/Check my guess/.test(await page.locator(".show-btn").innerText()), "button changes with a guess typed");
  await page.locator('input[aria-label="Your guess"]').press("Enter");
  await page.waitForSelector(".grades");
  ok(/a cat/.test(await page.locator(".guess-note").innerText()), "the guess is shown with the answer");
  await shot(page, "97-guess-revealed");
  await page.locator(".grade.g3").click();
  await page.waitForTimeout(300);
  // the next card starts with an empty guess
  if (await page.locator('input[aria-label="Your guess"]').count()) ok((await page.inputValue('input[aria-label="Your guess"]')) === "", "next guess starts empty");
}
await page.click('button[aria-label="Close session"]');
await page.waitForTimeout(600);

// ---- memory model
const wTrue = perturbed({ 8: 0.55, 9: 1.5, 11: 0.5, 13: 1.3, 20: 1.7, 17: 1.3 });
const rows = simulate({ wTrue, cards: 500, days: 160, seed: 11, perDay: 8 });
await page.click("nav >> text=Settings");
await page.waitForSelector("text=Memory model");
await page.locator("text=Memory model").scrollIntoViewIfNeeded();
ok(/Fit to my reviews/.test(await page.locator("body").innerText()) === false, "no fit offered with few reviews");
ok(/more reviews? until a fit is possible/.test(await page.locator("section:has-text('Memory model')").innerText()), "explains how many reviews are missing");
await page.evaluate((rows) => {
  const s = window.__ntStore;
  const bym = {};
  for (const r of rows) { const d = new Date(r[0]); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; (bym[k] = bym[k] || []).push(r); }
  for (const [k, v] of Object.entries(bym)) { s.log[k] = (s.log[k] || []).concat(v); s.touch(`log:${k}`); }
  s.emit();
}, rows);
await page.waitForSelector("button:has-text('Fit to my reviews')");
await page.locator("button:has-text('Fit to my reviews')").scrollIntoViewIfNeeded();
await shot(page, "98-model-ready");
await page.click("button:has-text('Fit to my reviews')");
await page.waitForSelector("[role=progressbar][aria-label=Fitting]");
await shot(page, "99-model-fitting");
await page.locator("button:has-text('Use my weights')").or(page.getByText(/No clear improvement/)).first().waitFor({ timeout: 90000 });
await page.locator("section:has-text('Memory model')").scrollIntoViewIfNeeded();
await shot(page, "100-model-result");
const resText = await page.locator("section:has-text('Memory model')").innerText();
console.log(resText.replace(/\n/g, " | ").slice(0, 600));
ok(/actually remembered/.test(resText), "result explains predicted against actual recall");
ok(await page.locator("button:has-text('Use my weights')").count() === 1, "better weights are offered");
ok(await page.evaluate(() => window.__ntStore.settings.fsrsW) === null, "nothing changes until you accept");
await page.click("button:has-text('Use my weights')");
const w = await page.evaluate(() => window.__ntStore.settings.fsrsW);
ok(Array.isArray(w) && w.length === 21 && w.every(Number.isFinite), "weights stored");
ok(/Using your own weights/.test(await page.locator("section:has-text('Memory model')").innerText()), "section says so");
// reviews now use them: a card reviewed gets a different stability than with the defaults
const diff = await page.evaluate(async () => {
  const s = window.__ntStore;
  const mine = s.weights();
  return mine !== undefined && mine.length === 21 && Math.abs(mine[20] - 0.1542) > 0.001;
});
ok(diff, "store.weights() returns the fitted weights");
await shot(page, "101-model-using");
await page.click("button:has-text('Use defaults')");
await page.waitForSelector(".sheet, .dialog, [role=dialog]");
await page.click("button:has-text('Use defaults') >> nth=-1");
await page.waitForTimeout(500);
ok(await page.evaluate(() => window.__ntStore.settings.fsrsW) === null, "back to the defaults");

console.log("errors:", errors);
if (errors.length) process.exitCode = 1;
await browser.close();
