// 5.0: Material You by default with a liquid glass switch, the dojo (XP, ranks, quests, achievements, combos),
// the samurai, blade slashes, sound and stronger haptics.
import { launch, shot, BASE, settingsPage } from "./lib.mjs";
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) process.exitCode = 1; };

const { browser, page, errors } = await launch({ ceremonies: true });
// count vibration calls and what they asked for
await page.addInitScript(() => {
  window.__vib = [];
  navigator.vibrate = (p) => { window.__vib.push(Array.isArray(p) ? p : [p]); return true; };
});
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Brand new");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");
await page.waitForTimeout(600);

// ---- Material You is the default
ok((await page.evaluate(() => document.documentElement.dataset.surface)) === "material", "Material You is the default design");
const navBg = await page.evaluate(() => getComputedStyle(document.querySelector(".nav-inner")).backdropFilter);
ok(navBg === "none", `the dock is solid in Material You (backdrop-filter: ${navBg})`);

// ---- the dojo on Today
ok(await page.locator(".dojo-bar").count() === 1, "the dojo bar is on Today");
ok(await page.locator(".dojo-greet .sam").count() === 1, "the samurai greets you");
ok(await page.locator(".quests .quest").count() === 3, "three daily quests");
await shot(page, "v50-today-material");

// ---- study: slash, XP, combo; haptics stretched for the motor
await page.evaluate(() => { window.__vib = []; });
await page.click("text=/Study \\d+ cards/");
await page.waitForSelector(".flash");
let slashes = 0, xps = 0, maxCombo = 0;
for (let k = 0; k < 8 && (await page.locator(".flash").count()); k++) {
  await page.click("button.show-btn");
  await page.waitForTimeout(250);
  await page.click("button.grade.g3");
  await page.waitForTimeout(120);
  slashes = Math.max(slashes, await page.locator(".fx-slash").count());
  xps = Math.max(xps, await page.locator(".fx-xp").count());
  const c = await page.locator(".combo-chip b").innerText().catch(() => "0");
  maxCombo = Math.max(maxCombo, Number(c) || 0);
  if (k === 2) await shot(page, "v50-slash");
}
ok(slashes > 0, "a blade slash crosses the card on Good");
ok(xps > 0, "XP floats up");
ok(maxCombo >= 3, `the combo counter shows (${maxCombo})`);
const vib = await page.evaluate(() => window.__vib);
const shortest = Math.min(...vib.flatMap((p) => p.filter((_, i) => i % 2 === 0)));
ok(vib.length > 5 && shortest >= 16, `every vibration pulse is long enough to be felt (${vib.length} calls, shortest ${shortest} ms)`);
// finish the session
for (let k = 0; k < 40 && (await page.locator(".flash").count()); k++) {
  await page.click("button.show-btn"); await page.waitForTimeout(120); await page.click("button.grade.g4"); await page.waitForTimeout(80);
}
await page.waitForSelector(".summary", { timeout: 5000 });
await page.waitForTimeout(1200);
const gained = await page.locator(".sx-big b").innerText().catch(() => "");
ok(/^\+\d+$/.test(gained) && Number(gained.slice(1)) > 0, `the end screen counts the XP earned (${gained})`);
ok(await page.locator(".summary .sam").count() === 1, "the samurai cheers at the end");
await shot(page, "v50-summary");
await page.click(".summary button:has-text(\"Done\")");
await page.waitForTimeout(1500);
// a celebration may be waiting (first rank up, first achievements)
const banners = await page.locator(".ceremony, .fx-banner").count();
ok(banners >= 0, `celebrations shown: ${banners}`);
if (await page.locator(".ceremony").count()) { await shot(page, "v50-ceremony"); await page.click(".ceremony button"); await page.waitForTimeout(500); }
while (await page.locator(".ceremony").count()) { await page.click(".ceremony button"); await page.waitForTimeout(600); }

const todayXp = await page.locator(".dojo-bar .db-xp b").innerText();
ok(Number(todayXp) > 0, `Today shows the day's XP (${todayXp})`);

// ---- achievements in Stats
await page.click("nav >> text=Stats");
await page.waitForSelector(".dojo-panel");
const got = await page.locator(".badge.got").count();
ok(got >= 1, `achievements unlocked (${got})`);
await shot(page, "v50-stats");

// ---- the design switch
await settingsPage(page, "look");
await page.waitForSelector(".design-pick");
await shot(page, "v50-settings-look");
await page.click(".dp.glass");
await page.waitForTimeout(500);
ok((await page.evaluate(() => document.documentElement.dataset.surface)) === "glass", "switching to liquid glass");
const lg = await page.evaluate(() => ({ lg: document.documentElement.dataset.lg, bf: document.querySelector(".nav-inner").style.backdropFilter, filters: document.querySelectorAll("svg filter[id^=lg-] feDisplacementMap").length, map: document.querySelector("svg filter[id^=lg-] feImage")?.getAttribute("href")?.slice(0, 22) }));
ok(lg.lg === "on" && /url\("?#lg-\d+"?\)/.test(lg.bf), `the dock refracts through an SVG filter (${lg.bf})`);
ok(lg.filters >= 3 && lg.map === "data:image/png;base64,", "displacement maps per colour channel are in place");
await page.click("nav >> text=Today");
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelector(".app-scroll").scrollTo(0, 260));
await page.waitForTimeout(500);
await shot(page, "v50-today-glass");

// light theme glass
await page.evaluate(() => window.__ntStore.updateSettings({ theme: "light" }));
await page.waitForTimeout(600);
await shot(page, "v50-today-glass-light");
await page.evaluate(() => window.__ntStore.updateSettings({ theme: "dark" }));

// back to Material You: everything refracting is removed
await page.evaluate(() => window.__ntStore.updateSettings({ surface: "material" }));
await page.waitForTimeout(400);
const after = await page.evaluate(() => ({ s: document.documentElement.dataset.surface, n: document.querySelectorAll(".lg").length, bf: getComputedStyle(document.querySelector(".nav-inner")).backdropFilter }));
ok(after.s === "material" && after.n === 0 && after.bf === "none", `back to Material You leaves no glass behind (${JSON.stringify(after)})`);

// ---- sound renders real audio (offline, so no speakers needed)
const peaks = await page.evaluate(async () => {
  const out = {};
  for (const n of ["reveal", "select", "again", "hard", "good", "easy", "correct", "wrong", "combo", "slash", "finish", "levelUp", "quest", "badge", "goal", "stamp", "place"]) out[n] = await window.__ntSound(n, 3);
  return out;
});
const silent = Object.entries(peaks).filter(([, v]) => !(v > 0.005) || !Number.isFinite(v));
ok(silent.length === 0, `every sound renders, none silent or broken (${silent.map(([k, v]) => k + "=" + v).join(", ") || "peaks " + Object.values(peaks).map((v) => v.toFixed(2)).join(" ")})`);


ok(errors.length === 0, `no errors (${errors.join(" | ")})`);
await browser.close();
