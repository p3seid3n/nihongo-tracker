// Recall cards, effort meter, leech rescue sheet and sentence rotation, with the real Kaishi deck.
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
await inputs.nth(3).fill("300"); await inputs.nth(3).press("Enter");
await page.click("text=/Import \\d+ decks?/");
await page.waitForSelector("text=/Imported/", { timeout: 60000 });
await page.click("text=Back to library");

// make the "known" words look like a few weeks of study: stable, and a good number due today
await page.evaluate(() => {
  const s = window.__ntStore; const now = Date.now();
  for (const d of s.deckList()) {
    if (d.kind !== "vocab") continue;
    let n = 0;
    for (const [id, r] of Object.entries(s.prog[d.id] || {})) {
      if (r.st !== 2) continue;
      r.s = 12; r.d = 5; r.due = n++ < 25 ? now - 3600e3 : now + 5 * 864e5; r.last = now - 12 * 864e5; r.reps = 3; r.u = now;
    }
    s.touch(`prog:${d.id}`);
  }
  s.emit();
});
await page.click("nav >> text=Today");
await page.waitForSelector(".plan-hero");
await page.waitForSelector(".effort");
await shot(page, "80-home-effort");
const effortTxt = await page.locator(".effort").innerText();
ok(/points/.test(effortTxt), "home shows the effort meter: " + effortTxt.replace(/\n/g, " | "));
const stepTxt = await page.locator(".step").first().innerText();
ok(/recall cards/.test(stepTxt), "plan counts recall cards: " + stepTxt.replace(/\n/g, " | "));

await page.click(".step >> nth=0");
await page.waitForSelector(".flash");
await page.waitForTimeout(3500); // sentence index builds in the background

let sawRecall = 0, sawAnother = 0, sawPitch = 0, sawVerdict = new Set(), steps = 0;
let leechDone = false;
for (let i = 0; i < 45 && sawRecall < 4; i++) {
  if (await page.locator(".study .summary").count()) break;
  steps++;
  const over = await page.evaluate(() => { const f = document.querySelector(".fullscreen"); return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || f.scrollHeight > f.clientHeight + 1 || f.scrollWidth > f.clientWidth + 1; });
  if (over) ok(false, "page overflow at step " + steps);
  if (await page.locator(".recall-input").count()) {
    sawRecall++;
    const meaning = await page.locator(".recall-meaning").innerText();
    const answer = await page.evaluate((m) => {
      const s = window.__ntStore;
      for (const d of s.deckList()) for (const [id, c] of Object.entries(s.content[d.id] || {})) if (c.m === m) return { r: c.r, f: c.f };
      return null;
    }, meaning);
    ok(!!answer, "found the card behind the prompt: " + meaning.slice(0, 40));
    if (sawRecall === 1) {
      await shot(page, "81-recall-front");
      // typing romaji turns into kana as you type
      await page.locator(".recall-input").fill("");
      await page.locator(".recall-input").pressSequentially("shi", { delay: 30 });
      ok((await page.locator(".recall-input").inputValue()) === "し", "romaji 'shi' becomes し in the field");
      await page.locator(".recall-input").fill("");
      await page.locator(".recall-input").pressSequentially("zzzq", { delay: 20 });
      await page.locator(".recall-form button[type=submit]").click();
    } else if (sawRecall === 2) {
      await page.locator(".recall-input").fill(answer.r.split(/[、,]/)[0]);
      await page.locator(".recall-input").press("Enter");
    } else if (sawRecall === 3) {
      await page.locator(".recall-form .btn-soft").click(); // I don't know
    } else {
      await page.locator(".recall-input").fill(answer.r.split(/[、,]/)[0]);
      await page.locator(".recall-form button[type=submit]").click();
    }
    await page.waitForSelector(".recall-verdict");
    const v = (await page.locator(".recall-verdict").innerText()).split("\n")[0];
    sawVerdict.add(v.split(" ·")[0].trim());
    await page.waitForTimeout(300);
    if (sawRecall === 1) await shot(page, "82-recall-wrong");
    if (sawRecall === 2) await shot(page, "83-recall-right");
    const sug = await page.locator(".grade.suggest").count();
    ok(sug === 1, `exactly one suggested grade after answering (verdict ${v})`);
    ok((await page.locator(".recall-word").innerText()).length > 0, "the answer word is shown");
    await page.locator(".grade.suggest").click();
    await page.waitForTimeout(250);
    continue;
  }
  // normal card
  await page.locator(".show-btn").click();
  await page.waitForTimeout(250);
  if (await page.locator(".pitch").count()) sawPitch++;
  if (await page.locator("text=Another sentence").count()) { sawAnother++; if (sawAnother === 1) await shot(page, "84-another-sentence"); }
  if (sawPitch === 1 && !(await page.evaluate(() => window.__pitchShot))) { await page.evaluate(() => { window.__pitchShot = 1; }); await shot(page, "85-pitch"); }
  if (!leechDone) {
    // the card on screen has been missed seven times already: another miss opens the rescue sheet
    await page.evaluate(() => { const s = window.__ntStore; const id = [...document.querySelectorAll("[data-card]")][0]?.dataset.card; void id; });
    leechDone = true;
    const cur = await page.evaluate(() => {
      const s = window.__ntStore;
      const t = document.querySelector(".word-big")?.textContent;
      for (const d of s.deckList()) for (const [id, c] of Object.entries(s.content[d.id] || {})) if (c.f === t && s.prog[d.id]?.[id]?.st === 2) { s.prog[d.id][id].lapses = 7; return id; }
      return null;
    });
    ok(!!cur, "prepared a leech candidate: " + cur);
    await page.locator(".grade.g1").click();
    await page.waitForSelector(".sheet");
    await page.waitForTimeout(400);
    await shot(page, "86-leech-sheet");
    const title = await page.locator(".sheet h2").innerText();
    ok(/keeps slipping/.test(title), "leech sheet opens on the 8th miss: " + title);
    await page.locator("#mn").fill("A soft cat-like sound that pulls you in");
    await page.locator(".sheet .btn-primary").click();
    await page.waitForTimeout(400);
    ok(await page.locator(".sheet").count() === 0, "sheet closes after saving");
    const saved = await page.evaluate((id) => window.__ntStore.rec(id).note, cur);
    ok(saved === "A soft cat-like sound that pulls you in", "mnemonic stored on the card");
    continue;
  }
  await page.locator(".grade.g3").click();
  await page.waitForTimeout(200);
}
ok(sawRecall >= 3, `saw recall cards in the session (${sawRecall})`);
ok(sawVerdict.has("Not quite") && sawVerdict.has("Correct"), "wrong and correct verdicts shown: " + [...sawVerdict].join(", "));
ok(sawVerdict.has("The answer"), "'I don't know' shows the answer");
ok(sawPitch > 0, `pitch accent displayed on ${sawPitch} cards (needs a re-import of Kaishi with pitch data)`);
ok(sawAnother > 0, `another sentence for the same word shown ${sawAnother} times`);

// the note shows on the card the next time it appears; effort has been spent
await page.click(".study-top .icon-btn >> nth=0");
await page.waitForSelector(".plan-hero");
await page.waitForTimeout(300);
await shot(page, "87-home-after");
const after = await page.locator(".effort").innerText();
ok(/points/.test(after), "effort after studying: " + after.replace(/\n/g, " | "));
ok(errors.length === 0, "no console errors " + errors.join(" / "));
await browser.close();
