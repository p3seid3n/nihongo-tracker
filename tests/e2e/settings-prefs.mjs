// Audio timing + kanji font settings: they apply, persist, and the fonts really load.
import { launch, shot, BASE } from "./lib.mjs";
let failed = false;
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) failed = true; };
const { browser, page, errors } = await launch();
await page.addInitScript(() => {
  window.__spoken = [];
  class Utter { constructor(t) { this.text = t; } }
  window.SpeechSynthesisUtterance = Utter;
  const voices = [{ name: "Mock Japanese", lang: "ja-JP", voiceURI: "m", localService: true }];
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => voices, cancel() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend({}), 30); }, addEventListener() {}, removeEventListener() {} } });
});
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");
await page.evaluate(() => {
  const s = window.__ntStore;
  s.updateSettings({ newPerDay: { kana: 0, kanji: 8, vocab: 8, generic: 8 } });
  s.addDeck({ id: "pf", name: "Pref deck", kind: "vocab" }, {
    "pf.c1": { f: "泊まる", r: "とまる", m: "to stay overnight", o: 0, x: { sent: "ホテルに泊まる。", tr: "I stay at a hotel." } },
    "pf.c2": { f: "方", r: "かた", m: "direction", o: 1, x: { sent: "あの方は先生です。", tr: "That person is a teacher." } },
  });
});

await page.click("nav >> text=Settings");
await page.waitForSelector("text=Kanji font");
await page.locator("text=Read the word aloud").scrollIntoViewIfNeeded();
await shot(page, "90-settings-audio");
const seg = (label) => page.locator(`.seg[aria-label='${label}'], [aria-label='${label}']`).first();
ok(await page.locator("text=Read the word aloud").count() === 1, "word audio setting present");
ok(await page.locator("text=Read the example sentence aloud").count() === 1, "sentence audio setting present");

// default font is Classic and nothing extra is fetched until chosen (previews load lazily)
ok(await page.evaluate(() => (document.documentElement.dataset.kfont || "mincho") === "mincho"), "default font is Classic");
await page.locator("text=Kanji font").first().scrollIntoViewIfNeeded();
await shot(page, "91-settings-fonts");
for (const [label, id, fam] of [["Clear", "gothic", "Kotoba Gothic"], ["Textbook", "textbook", "Kotoba Textbook"]]) {
  await page.click(`.font-pick:has-text('${label}')`);
  await page.waitForTimeout(300);
  ok(await page.evaluate((id) => document.documentElement.dataset.kfont === id, id), `${label} sets data-kfont=${id}`);
  const loaded = await page.evaluate(async (fam) => { await document.fonts.load(`40px "${fam}"`, "泊"); return document.fonts.check(`40px "${fam}"`, "泊"); }, fam);
  ok(loaded, `${fam} loads and covers 泊`);
}
await page.click(".font-pick:has-text('Textbook')");
await shot(page, "92-font-textbook");

// word audio "With the answer": silent on card open, speaks on reveal
await page.locator("text=Read the word aloud").scrollIntoViewIfNeeded();
await page.click(".list-item:has-text('Read the word aloud') button:has-text('With the answer')");
await page.click(".list-item:has-text('Read the example sentence aloud') button:has-text('Off')");
await page.click("nav >> text=Cards");
await page.click("button.card:has-text('Pref deck')");
await page.click(".sheet button:has-text('Study')");
await page.waitForSelector(".flash"); await page.waitForTimeout(700);
const early = await page.evaluate(() => window.__spoken.slice());
ok(early.filter((x) => x.trim()).length === 0, "nothing is read when the card opens: " + JSON.stringify(early));
const fontNow = await page.evaluate(() => getComputedStyle(document.querySelector(".word-big, .kana-big, .flash .big") || document.body).fontFamily);
console.log("card font:", fontNow);
await page.click("button.show-btn"); await page.waitForTimeout(600);
const sp = await page.evaluate(() => window.__spoken.filter((x) => x.trim()));
ok(sp.length === 1, "only the word is read on reveal (sentence is off): " + JSON.stringify(sp));
await shot(page, "93-study-textbook");

// persists across reload
await page.reload({ waitUntil: "networkidle" });
ok(await page.evaluate(() => document.documentElement.dataset.kfont) === "textbook", "font choice persists after reload");
console.log("errors:", errors);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
