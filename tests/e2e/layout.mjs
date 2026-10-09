// Full-screen views must fit the screen: no whole-page scrolling, top bar and buttons stay put, only content scrolls.
import { launch, shot, BASE } from "./lib.mjs";
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) process.exitCode = 1; };
const LONG = "Younger brothers are always more prone to mischief. Mine, you can almost see the little horns on him and the dollar signs on his eyes when he comes up with a new scheme to get out of doing his chores, which he does several times a day, every single day of the week, including holidays, birthdays and the days when the whole family is sick.";

for (const [w, h] of [[390, 844], [360, 560], [320, 480]]) {
  const { browser, page, errors } = await launch({ context: { viewport: { width: w, height: h } } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.click("text=Get started"); await page.click("text=Intermediate");
  await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
  await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");
  await page.evaluate((LONG) => {
    const s = window.__ntStore;
    s.updateSettings({ newPerDay: { kana: 0, kanji: 8, vocab: 8, generic: 8 } });
    s.addDeck({ id: "lay", name: "Layout test deck with a rather long name to check the tag", kind: "kanji" }, {
      "lay.c1": { f: "方", r: "", m: "direction", o: 0, x: { story: LONG, strokes: "4", num: "529" } },
      "lay.c2": { f: "泊", r: "", m: "stay overnight", o: 1, x: { story: "short" } },
    });
  }, LONG);
  await page.click("nav >> text=Cards");
  await page.click("text=Layout test deck");
  await page.click(".sheet >> text=Study");
  await page.waitForTimeout(600);
  await page.waitForSelector(".flash");
  await page.waitForTimeout(700);
  const probe = async (label) => {
    // try to scroll the page as a whole
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const top = q(".study-top").getBoundingClientRect();
      const grades = q(".grades, .show-btn").getBoundingClientRect();
      const fs = q(".fullscreen");
      const fl = q(".flash-scroll");
      return {
        winScroll: window.scrollY, fsScroll: fs.scrollTop, fsOverflow: fs.scrollHeight - fs.clientHeight,
        topY: Math.round(top.top), topVisible: top.top >= 0 && top.bottom > 0,
        btnBottom: Math.round(grades.bottom), vh: window.innerHeight, btnVisible: grades.bottom <= window.innerHeight + 1 && grades.top >= 0,
        flashOverflow: fl.scrollHeight - fl.clientHeight, flashScrollable: fl.scrollHeight > fl.clientHeight,
        docOverflow: document.documentElement.scrollHeight - window.innerHeight,
      };
    });
    ok(r.winScroll === 0 && r.fsScroll === 0, `${w}x${h} ${label}: page does not scroll (${JSON.stringify({ win: r.winScroll, fs: r.fsScroll })})`);
    ok(r.fsOverflow <= 1, `${w}x${h} ${label}: nothing hangs below the screen (${r.fsOverflow}px)`);
    ok(r.topVisible, `${w}x${h} ${label}: top bar stays visible (y=${r.topY})`);
    ok(r.btnVisible, `${w}x${h} ${label}: buttons stay visible (bottom ${r.btnBottom} of ${r.vh})`);
    return r;
  };
  await probe("question");
  await page.click(".show-btn");
  await page.waitForTimeout(500);
  const r = await probe("answer");
  console.log(`   card content scrolls inside the card: ${r.flashScrollable} (${r.flashOverflow}px)`);
  await shot(page, `80-layout-${w}x${h}`);
  // scroll the card content itself
  if (r.flashScrollable) {
    await page.evaluate(() => { document.querySelector(".flash-scroll").scrollTop = 9999; });
    await page.waitForTimeout(100);
    const tag = await page.evaluate(() => { const t = document.querySelector(".flash .tag").getBoundingClientRect(); return t.top > 0; });
    ok(tag, `${w}x${h}: deck name and buttons stay at the top of the card while its content scrolls`);
    await shot(page, `81-layout-scrolled-${w}x${h}`);
  }
  // the pad / other overlays
  await page.keyboard.press("Escape");
  console.log("   errors:", errors.length ? errors : "none");
  await browser.close();
}
