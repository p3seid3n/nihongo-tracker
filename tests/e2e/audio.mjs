import { launch, shot, BASE } from "./lib.mjs";
const FILE = process.env.APKG || "/mnt/user-data/uploads/All_decks-20261004095235.apkg";
const log = (...a) => console.log(...a);
let failed = false;
const ok = (c, m) => { if (!c) { failed = true; console.error("FAIL:", m); } else log("ok:", m); };
const { browser, page, errors } = await launch({ context: { permissions: ["microphone"] } });
await page.addInitScript(() => {
  window.__spoken = []; window.__played = []; window.__recStarted = 0;
  class Utter { constructor(t) { this.text = t; } }
  window.SpeechSynthesisUtterance = Utter;
  const voices = [{ name: "Mock Japanese (local)", lang: "ja-JP", voiceURI: "mock-ja", localService: true }, { name: "Mock Japanese 2", lang: "ja-JP", voiceURI: "mock-ja2", localService: false }];
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => voices, cancel() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend({}), 40); }, addEventListener() {}, removeEventListener() {} } });
  HTMLMediaElement.prototype.play = function () { window.__played.push(this.src.startsWith("blob:") ? "blob" : this.src.slice(0, 20)); setTimeout(() => this.onended && this.onended(), 30); return Promise.resolve(); };
  class Rec {
    start() { window.__recStarted++; setTimeout(() => { const t = window.__heard; if (t === undefined) { this.onend && this.onend(); return; } if (t === "ERR") { this.onerror && this.onerror({ error: "network" }); this.onend && this.onend(); return; } const r = [{ transcript: t, confidence: 0.9 }]; r.isFinal = true; this.onresult && this.onresult({ results: [r] }); this.onend && this.onend(); }, 120); }
    stop() {} abort() {}
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
});
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");

// ---- import with audio
await page.click("text=Import from Anki");
await page.setInputFiles('input[type="file"]', FILE);
await page.waitForSelector("text=/Found \\d+ decks?/", { timeout: 120000 });
await page.waitForSelector("text=Include audio");
const audioText = await page.locator(".card:has-text('Include audio')").innerText();
log("audio card:", audioText.replace(/\n/g, " | "));
ok(/[23],\d{3} recordings/.test(audioText), "Kaishi audio found in the package");
await shot(page, "a1-import-choose");
const t0 = Date.now();
await page.click("text=/Import \\d+ decks?/");
await page.waitForSelector("text=Saving audio", { timeout: 20000 }).catch(() => {});
await shot(page, "a2-import-audio");
await page.waitForSelector("text=/Imported/", { timeout: 240000 });
log("import + audio took", ((Date.now() - t0) / 1000).toFixed(1), "s");
const doneText = await page.locator(".fullscreen .lesson-body").innerText();
ok(/audio recordings saved/.test(doneText), "import reports saved recordings: " + (doneText.match(/[\d,]+ audio recordings saved[^.]*/) || [""])[0]);
await page.click("text=Back to library");

// ---- settings shows the audio
await page.click("nav >> text=Settings");
await page.waitForSelector("text=Listening and speaking");
await page.locator("text=Downloaded audio").scrollIntoViewIfNeeded();
const aTxt = await page.locator(".list-item:has-text('Downloaded audio')").innerText();
ok(/[\d,]+ clips/.test(aTxt), "Settings lists downloaded audio: " + aTxt.replace(/\n/g, " "));
await shot(page, "a3-settings-audio");

// ---- study Kaishi: native audio is used, not synthesized speech
await page.click("nav >> text=Cards");
await page.click("button.card:has-text('Kaishi')");
await page.click(".sheet button:has-text('Study')");
await page.waitForSelector(".flash");
await page.waitForTimeout(800);
let played = await page.evaluate(() => window.__played.filter((x) => x === "blob").length);
let spoken = await page.evaluate(() => window.__spoken.filter((x) => x.trim()));
ok(played >= 1, `word clip played on card appear (${played} blob plays)`);
ok(spoken.length === 0, "no synthesized speech while a native clip exists");
await page.click("button.show-btn");
await page.waitForTimeout(700);
played = await page.evaluate(() => window.__played.filter((x) => x === "blob").length);
ok(played >= 2, `sentence clip played on reveal (${played} blob plays)`);
await shot(page, "a4-study-back");

// ---- pronunciation sheet: right, wrong, silence, error
const word = await page.locator(".flash .word-big").innerText();
const reading = await page.locator(".answer .reading").innerText();
const sentence = (await page.locator(".answer .box .jp-line, .answer .box").first().innerText()).replace(/\s+/g, "");
log("card:", word, reading);
await page.click("button[aria-label='Check my pronunciation']");
await page.waitForSelector(".sheet .mic-btn");
await page.waitForTimeout(700);
await page.evaluate((w) => { window.__heard = w; }, word);
await page.click(".sheet .mic-btn");
await page.waitForSelector(".say-result", { timeout: 5000 });
let res = await page.locator(".say-result").innerText();
ok(/Spot on/.test(res), "saying the word right gives Spot on: " + res.replace(/\n/g, " "));
await shot(page, "a5-say-right");
await page.evaluate(() => { window.__heard = "ちがうことば"; });
await page.click("button:has-text('Try again')");
await page.waitForSelector(".say-result");
res = await page.locator(".say-result").innerText();
ok(/Not quite/.test(res), "a different word is not accepted: " + res.replace(/\n/g, " "));
ok(await page.locator(".say-text .miss").count() > 0, "missed characters are marked");
await shot(page, "a6-say-wrong");
await page.evaluate(() => { window.__heard = undefined; });
await page.click("button:has-text('Try again')");
await page.waitForSelector("text=/didn't hear anything/", { timeout: 5000 });
ok(true, "silence gives a friendly message");
await page.evaluate(() => { window.__heard = "ERR"; });
await page.click(".sheet .mic-btn");
await page.waitForSelector("text=/internet connection/", { timeout: 5000 });
ok(true, "network error is explained");
// sentence tab, small mistake still counts as close or better
const hasSentence = await page.locator(".sheet .seg").count();
if (hasSentence) {
  await page.click(".sheet .seg button:has-text('Sentence')");
  const target = await page.locator(".say-text").innerText();
  await page.evaluate((t) => { window.__heard = t; }, target);
  await page.click(".sheet .mic-btn");
  await page.waitForSelector(".say-result");
  ok(/Spot on/.test(await page.locator(".say-result").innerText()), "full sentence recognised");
  await page.evaluate((t) => { window.__heard = t.slice(0, Math.ceil(t.length * 0.7)); }, target);
  await page.click("button:has-text('Try again')");
  await page.waitForSelector(".say-result");
  const part = await page.locator(".say-result").innerText();
  ok(!/Spot on/.test(part), "half a sentence is not Spot on: " + part.replace(/\n/g, " "));
  await shot(page, "a7-say-sentence");
}
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
ok(await page.locator(".sheet").count() === 0, "sheet closes");
ok(await page.locator(".flash").count() === 1, "study session survived (Escape only closed the sheet)");

// ---- remove audio: fallback to the built-in voice
await page.click(".study-top button[aria-label='Close session']");
await page.waitForTimeout(500);
await page.click("nav >> text=Settings");
await page.locator("text=Downloaded audio").scrollIntoViewIfNeeded();
await page.click(".list-item:has-text('Downloaded audio') button:has-text('Remove')");
await page.click(".sheet button:has-text('Remove')");
await page.waitForSelector("text=Native audio");
ok(true, "audio removed");
await page.evaluate(() => { window.__spoken.length = 0; window.__played.length = 0; });
await page.click("nav >> text=Cards");
await page.click("button.card:has-text('Kaishi')");
await page.click(".sheet button:has-text('Study')");
await page.waitForSelector(".flash");
await page.waitForTimeout(800);
spoken = await page.evaluate(() => window.__spoken.filter((x) => x.trim()));
ok(spoken.length >= 1, "built-in voice reads the word without clips: " + JSON.stringify(spoken));
await page.click("button.show-btn");
await page.waitForTimeout(600);
spoken = await page.evaluate(() => window.__spoken.filter((x) => x.trim()));
ok(spoken.length >= 2, "and the example sentence: " + JSON.stringify(spoken.slice(1)));
log("errors:", errors);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
