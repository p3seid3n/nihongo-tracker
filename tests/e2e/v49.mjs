// 4.9: kana pictures, furigana per kanji, effort meter, explanations, .apkg export, resuming, draggable tiles, glass.
import { launch, shot, BASE, settingsPage } from "./lib.mjs";
import fs from "node:fs";
import initSqlJs from "sql.js";
import { parseApkg } from "../../src/lib/importer/apkg.js";
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) process.exitCode = 1; };

const { browser, ctx, page, errors } = await launch({ context: { acceptDownloads: true } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");

// a vocabulary deck like Kaishi and a kana deck with a mnemonic picture
await page.evaluate(async () => {
  const s = window.__ntStore;
  s.addDeck({ id: "kai", name: "Kaishi 1.5k", kind: "vocab" }, {
    "kai.1": { f: "手伝う", r: "てつだう", m: "to help", o: 0, x: { sentF: "私[わたし]が 手伝[てつだ]いましょう。", sentE: "I will help you." } },
    "kai.2": { f: "手", r: "て", m: "hand", o: 1, x: {} },
    "kai.3": { f: "伝える", r: "つたえる", m: "to convey", o: 2, x: {} },
  });
  s.addDeck({ id: "tof", name: "Tofugu Hiragana", kind: "kana" }, { "tof.1": { f: "ほ", r: "ho", m: "ho", o: 0, x: { story: "A mutated Santa Claus says ho ho ho.", img: "ho.png" } } });
  for (const d of s.deckList()) if (d.id !== "kai" && d.id !== "tof") s.updateDeck(d.id, { enabled: false });
  s.updateSettings({ newPerDay: { kana: 5, kanji: 0, vocab: 5, generic: 5 }, autoThrottle: false, pretest: false });
  // a 2x2 PNG for the picture, stored like an imported deck's media
  const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  await new Promise((res, rej) => {
    const req = indexedDB.open("nt-audio");
    req.onupgradeneeded = () => req.result.createObjectStore("clips");
    req.onsuccess = () => { const tx = req.result.transaction("clips", "readwrite"); tx.objectStore("clips").put(new Blob([png], { type: "image/png" }), "ho.png"); tx.oncomplete = res; tx.onerror = rej; };
    req.onerror = rej;
  });
});
await page.waitForTimeout(400);

// ---- effort meter: done + planned stays the same while studying
const effortOf = () => page.evaluate(() => { const m = document.querySelector(".effort .legend"); return m ? m.innerText : ""; });
const sumOf = (t) => (t.match(/\d+/g) || []).map(Number).reduce((a, b) => a + b, 0);
const before = await effortOf();
await page.click("text=/Study \\d+ cards/");
await page.waitForSelector(".flash");
// ---- furigana over each kanji, faded in on reveal; the picture on a kana card
let sawFuri = false, sawPic = false, answered = 0;
for (let k = 0; k < 12 && (await page.locator(".flash").count()); k++) {
  const word = await page.locator(".flash .word-big, .flash .kana-big").first().innerText().catch(() => "");
  await page.click("button.show-btn");
  await page.waitForTimeout(450);
  if (/手伝う/.test(word.replace(/\s/g, "")) || (await page.locator(".flash .word-ruby.on ruby").count()) >= 2) {
    const rubies = await page.$$eval(".flash .word-ruby ruby", (els) => els.map((e) => e.innerText.replace(/\s+/g, "|")));
    if (rubies.length >= 2 && !sawFuri) { sawFuri = true; console.log("furigana:", rubies.join(" ")); await shot(page, "v49-furigana"); }
  }
  if (await page.locator(".flash img.card-pic.in").count()) { sawPic = true; await shot(page, "v49-kana-picture"); }
  await page.click(answered % 3 === 0 ? "button.grade.g1" : "button.grade.g4");
  answered++;
  if (answered === 3) break;
}
// the kana card may be the one picture not yet seen: keep going until it shows or the session ends
for (let k = 0; k < 6 && !sawPic && (await page.locator(".flash").count()); k++) {
  await page.click("button.show-btn"); await page.waitForTimeout(450);
  if (await page.locator(".flash img.card-pic.in").count()) { sawPic = true; await shot(page, "v49-kana-picture"); }
  await page.click("button.grade.g3");
}
const barMid = (await page.locator(".study-bar i").count()) ? await page.$eval(".study-bar i", (el) => parseFloat(el.style.width)) : 100;
if (await page.locator(".study-top button[aria-label='Close session']").count()) await page.click(".study-top button[aria-label='Close session']"); else await page.click("text=Done");
await page.waitForSelector(".plan-hero");
await page.waitForTimeout(400);
ok(sawFuri, "vocab cards show furigana over each kanji (手|て 伝|つだ)");
ok(sawPic, "kana cards show the deck's mnemonic picture");
const after = await effortOf();
console.log("effort", JSON.stringify(before), "->", JSON.stringify(after));
ok(sumOf(before) === sumOf(after) && sumOf(after) > 0, `effort: done + planned stays the same (${sumOf(before)} = ${sumOf(after)})`);
// ---- the session bar remembers the day
await page.click("text=/Study \\d+ cards?/").catch(() => {});
await page.waitForSelector(".flash, .summary", { timeout: 5000 });
if (await page.locator(".flash").count()) {
  const barAgain = await page.$eval(".study-bar i", (el) => parseFloat(el.style.width));
  ok(barAgain > 0 && Math.abs(barAgain - barMid) < 40, `progress bar continues where it was (${barMid.toFixed(0)}% -> ${barAgain.toFixed(0)}%)`);
  await page.click(".study-top button[aria-label='Close session']");
} else { await page.click("text=Done"); ok(true, "nothing left to study"); }
await page.waitForSelector(".plan-hero");

// ---- lessons: explanation panel, draggable tiles, resuming
await page.click("nav >> text=Grammar"); await page.waitForTimeout(400);
await page.click(".node >> nth=2"); await page.waitForTimeout(500);
await page.click("text=Skip to practice"); await page.waitForTimeout(500);
let answeredLesson = 0, sawExplain = false, dragged = false;
for (let guard = 0; guard < 30; guard++) {
  if (await page.locator(".tile-board").count() && !dragged) {
    // drag one tile into the sentence, then drag it back out
    const t = page.locator(".bank-zone .tilebtn:not([disabled])").first();
    const b = await t.boundingBox(); const z = await page.locator(".answer-zone").boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + 10, b.y - 20, { steps: 3 }); await page.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(500); // let the tiles finish sliding into place
    const inZone = await page.locator(".answer-zone .tilebtn").count();
    ok(inZone === 1, "a tile can be dragged into the sentence");
    const a = await page.locator(".answer-zone .tilebtn").first().boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(a.x + 10, a.y + 40, { steps: 3 }); await page.mouse.move(a.x + 10, a.y + 260, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(500);
    ok((await page.locator(".answer-zone .tilebtn").count()) === 0, "and dragged back out");
    // tap still works
    await page.locator(".bank-zone .tilebtn:not([disabled])").first().click();
    ok((await page.locator(".answer-zone .tilebtn").count()) === 1, "tapping a tile still adds it");
    dragged = true;
    await page.click("text=Check");
  } else if (await page.locator(".tile-board").count()) {
    await page.locator(".bank-zone .tilebtn:not([disabled])").first().click(); await page.click("text=Check");
  } else if (await page.locator(".opts .opt").count()) {
    await page.locator(".opts .opt").last().click(); await page.click("text=Check");
  } else if (await page.locator(".match").count()) {
    const n = await page.locator(".match > div:first-child button").count();
    for (let k = 0; k < n; k++) { await page.locator(".match > div:first-child button:not(.gone)").first().click(); const rr = page.locator(".match > div:last-child button:not(.gone)"); const m = await rr.count(); for (let j = 0; j < m; j++) { await rr.nth(j).click(); await page.waitForTimeout(30); if ((await page.locator(".match > div:first-child button:not(.gone)").count()) < n - k) break; } }
  } else break;
  await page.waitForSelector(".result-sheet", { timeout: 5000 });
  if (!sawExplain && (await page.locator(".result-sheet.no .rs-grab").count())) {
    const hBefore = await page.$eval(".rs-body", (el) => el.getBoundingClientRect().height);
    const g = await page.locator(".rs-drag").boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + 24); await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, g.y - 260, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(600);
    const hAfter = await page.$eval(".rs-body", (el) => el.getBoundingClientRect().height);
    const text = await page.locator(".explain").innerText();
    console.log("explanation:", text.slice(0, 220).replace(/\n+/g, " | "));
    ok(hBefore < 2 && hAfter > 120, `the explanation stays hidden until the panel is dragged up (${hBefore} -> ${Math.round(hAfter)}px)`);
    ok(/WHAT WENT WRONG/i.test(text) && /(CORRECT SENTENCE|ANSWER|MEANING)/i.test(text), "it says what went wrong and shows the fix");
    await shot(page, "v49-explanation");
    sawExplain = true;
  }
  await page.click(".rs-continue");
  answeredLesson++;
  if (answeredLesson >= 3 && dragged && sawExplain) break;
}
ok(dragged, "met a build-the-sentence exercise");
ok(sawExplain, "a wrong answer could be explained");
const pctBefore = await page.$eval(".lesson-top .study-bar i", (el) => parseFloat(el.style.width));
await page.click("button[aria-label='Leave practice']");
await page.waitForTimeout(500);
await page.click(".node >> nth=2"); await page.waitForTimeout(700);
const resumed = await page.locator(".lesson-top .study-bar").count();
const pctAfter = resumed ? await page.$eval(".lesson-top .study-bar i", (el) => parseFloat(el.style.width)) : -1;
ok(resumed && Math.abs(pctAfter - pctBefore) < 1 && pctAfter > 0, `the lesson continues where it was left (${pctBefore}% -> ${pctAfter}%)`);
ok(await page.locator("text=Picked up where you left off").count() > 0, "and says so");
await page.click("button[aria-label='Leave practice']");
await page.waitForTimeout(400);

// ---- scheduling settings
await settingsPage(page, "pace");
await page.waitForSelector("text=Learning steps");
const sat = page.locator(".easy-day", { hasText: "Sat" });
await sat.click();
ok(/Reduced/.test(await sat.innerText()), "easy days cycle normal → reduced");
ok(JSON.stringify(await page.evaluate(() => window.__ntStore.settings.easyDays)) === "[1,1,1,1,1,0.5,1]", "easy day saved (Monday first)");
await page.fill("#ls", "1m 10m 1h");
await page.locator("#rs").click();
ok(await page.evaluate(() => window.__ntStore.settings.learnSteps) === "1m 10m 1h", "learning steps saved");
await shot(page, "v49-scheduling");
await page.click('button[aria-label="Back"]');

// ---- export to Anki
await settingsPage(page, "data");
await page.click("text=Export to Anki (.apkg)");
await page.waitForSelector("text=Export to Anki");
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), page.click("text=/Export \\d+ cards?/")]);
const path = "/tmp/claude-0/v49-export.apkg";
await dl.saveAs(path);
await page.waitForSelector("text=/notes exported/");
await shot(page, "v49-exported");
const SQL = await initSqlJs();
const parsed = await parseApkg(await fs.openAsBlob(path), async () => SQL);
const kai = parsed.decks.find((d) => d.name === "Kaishi 1.5k");
ok(!!kai && kai.count === 3, `the .apkg opens and holds the vocabulary deck (${kai && kai.count} notes)`);
ok(Object.keys(kai.prog).length >= 1, `and its progress (${Object.keys(kai.prog).length} cards started)`);
ok(parsed.revlog.length >= 3, `and the review history (${parsed.revlog.length} reviews)`);

// ---- glass dock
const glass = await page.$eval(".nav-inner", (el) => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
ok(/blur/.test(glass), "the dock is frosted glass: " + glass);

console.log("errors:", errors);
ok(errors.filter((e) => !/Failed to load resource/.test(e)).length === 0, "no console errors");
await browser.close();
