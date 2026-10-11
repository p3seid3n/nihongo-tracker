// 4.8: still dock, opening animation, ink motion, richer haptics.
import { launch, shot, BASE } from "./lib.mjs";
const ok = (c, m) => { console.log(c ? "ok:" : "FAIL:", m); if (!c) process.exitCode = 1; };

// ---- opening animation: ink in paper, drawn in a worker; gone once the app is up; calm on a quick reopen
const splashState = (page) => page.evaluate(() => { const s = document.getElementById("splash"); return s ? { cls: s.className, mode: s.getAttribute("data-mode") } : null; });
{
  const { browser, ctx, page, errors } = await launch();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  ok(await page.locator("#splash canvas").count() === 1, "splash is in the page at first paint");
  ok(await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === "#ece3d0", "status bar matches the paper while the ink shows");
  await page.waitForFunction(() => document.getElementById("splash")?.getAttribute("data-mode"), null, { timeout: 5000 });
  const st = await splashState(page);
  ok(st.mode === "worker", `ink is drawn off the main thread (${st.mode})`);
  ok(!st.cls.includes("calm"), "cold start gets the full animation");
  await page.waitForTimeout(900);
  await shot(page, "v48-splash-ink");
  await page.waitForSelector(".welcome", { timeout: 10000 });
  await page.waitForFunction(() => !document.getElementById("splash"), null, { timeout: 6000 });
  ok(true, "splash removed after the app is up");
  ok(await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content) === "#151413", "status bar back to the app's colour");
  await shot(page, "v48-onboarding-ink");
  ok(await page.locator(".ink-brand").count() === 1, "onboarding draws the brand character in ink");
  // reopen within a minute: calm
  await page.reload({ waitUntil: "domcontentloaded" });
  ok(await page.evaluate(() => !document.getElementById("splash") || document.getElementById("splash").classList.contains("calm")), "reopening soon after is calm");
  await ctx.close();
  await browser.close();
  ok(errors.length === 0, "no errors during start: " + errors.join(" | "));
}
// check the picture itself from a screenshot
{
  const { browser, ctx, page } = await launch({ context: { deviceScaleFactor: 1 } });
  await page.route("**/assets/index-*.js", (r) => r.abort()); // keep the app from starting, so the ink stays
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.getElementById("splash")?.getAttribute("data-mode"), null, { timeout: 5000 });
  await page.waitForTimeout(1600);
  const buf = await page.screenshot();
  const colours = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const w = img.width, h = img.height, size = Math.min(w * 0.84, h * 0.5, 400), cx = w / 2, cy = h * 0.44;
    const at = (u, v) => Array.from(x.getImageData(Math.round(cx + (u - 0.5) * size), Math.round(cy + (v - 0.5) * size), 1, 1).data).slice(0, 3);
    return { stroke: at(0.36, 0.385), sun: at(0.74, 0.27), paper: at(0.08, 0.92) };
  }, buf.toString("base64"));
  console.log("colours", JSON.stringify(colours));
  const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
  ok(lum(colours.stroke) < 70, "the brush stroke is black ink");
  ok(colours.sun[0] > 150 && colours.sun[1] < 110, "the sun is vermilion");
  ok(lum(colours.paper) > 190, "the rest is paper");
  await ctx.close(); await browser.close();
}
// without OffscreenCanvas the page draws it itself; without WebGL the app still opens promptly
{
  const { browser, ctx, page, errors } = await launch();
  await page.addInitScript(() => { delete HTMLCanvasElement.prototype.transferControlToOffscreen; });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const s = document.getElementById("splash"); return !s || s.getAttribute("data-mode"); }, null, { timeout: 5000 });
  const fb = await splashState(page);
  ok(!fb || fb.mode === "page", `falls back to drawing on the page (${fb ? fb.mode : "app was quicker"})`);
  await page.waitForFunction(() => !document.getElementById("splash"), null, { timeout: 8000 });
  ok(errors.length === 0, "no errors in the fallback");
  await ctx.close(); await browser.close();
}
{
  const { browser, ctx, page } = await launch();
  await page.addInitScript(() => {
    delete HTMLCanvasElement.prototype.transferControlToOffscreen;
    const g = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, o) { return /webgl/.test(t) ? null : g.call(this, t, o); };
  });
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.getElementById("splash"), null, { timeout: 5000 });
  ok(Date.now() - t0 < 4000, `no WebGL: the app opens without waiting for ink (${Date.now() - t0} ms)`);
  await ctx.close(); await browser.close();
}
// reduced motion setting is respected from the very first paint
{
  const { browser, ctx, page } = await launch({ context: { reducedMotion: "reduce" } });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  ok(await page.evaluate(() => document.getElementById("splash").classList.contains("calm")), "reduced motion skips the long animation");
  await ctx.close(); await browser.close();
}
// light theme: the flood ends in the light background, and the quick version uses it too
{
  const { browser, ctx, page } = await launch();
  await page.addInitScript(() => { try { localStorage.setItem("nt-theme", "light"); } catch {} });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const bg = await page.evaluate(() => getComputedStyle(document.getElementById("splash")).getPropertyValue("--sp-bg").trim());
  ok(bg === "#fbf7f3", "splash knows the light theme (" + bg + ")");
  await ctx.close(); await browser.close();
}

// ---- the app: dock, haptics, ink
const { browser, page, errors } = await launch();
await page.addInitScript(() => { window.__vib = []; Object.defineProperty(navigator, "vibrate", { value: (p) => { window.__vib.push(p); return true; }, configurable: true }); });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");
await page.waitForTimeout(1800);
await shot(page, "v48-today");
ok(await page.locator(".plan-hero.ink-card").count() === 1, "Today's hero has the paper and ink wash");
ok(await page.locator(".plan-hero .ink-wipe").count() === 1, "the heading is brushed in");

// dock stays put while scrolling in both directions, and the document itself never scrolls
const probe = () => page.evaluate(() => {
  const r = document.querySelector(".nav-inner").getBoundingClientRect();
  const sc = document.querySelector(".app-scroll");
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), winY: window.scrollY, docOverflow: document.documentElement.scrollHeight - innerHeight, inner: innerHeight, sc: sc.scrollTop, scMax: sc.scrollHeight - sc.clientHeight };
});
const start = await probe();
await page.mouse.move(195, 400);
await page.mouse.wheel(0, 700); await page.waitForTimeout(250);
const down = await probe();
await page.mouse.wheel(0, -300); await page.waitForTimeout(250);
const up = await probe();
await page.mouse.wheel(0, -2000); await page.waitForTimeout(250);
const top = await probe();
ok(down.sc > 0 || start.scMax === 0, `the page content scrolls inside its own container (${down.sc})`);
ok([down, up, top].every((r) => r.top === start.top && r.bottom === start.bottom), `dock never moves (${start.top}-${start.bottom}; ${down.top}, ${up.top}, ${top.top})`);
ok([start, down, up, top].every((r) => r.winY === 0 && r.docOverflow <= 0 && r.inner === start.inner), "the document does not scroll and the viewport size is constant");
// same on the other tabs
for (const tab of ["Grammar", "Practice", "Stats", "Settings"]) {
  await page.click(`nav >> text=${tab}`); await page.waitForTimeout(450);
  await page.mouse.wheel(0, 1200); await page.waitForTimeout(200);
  await page.mouse.wheel(0, -500); await page.waitForTimeout(200);
  const r = await probe();
  ok(r.top === start.top && r.winY === 0 && r.docOverflow <= 0, `${tab}: dock fixed, document still`);
}
await page.click("nav >> text=Today"); await page.waitForTimeout(300);

// haptics: controls tick, switches rise and fall, grades each have their own feel
await page.evaluate(() => { window.__vib = []; });
await page.click("nav >> text=Practice"); await page.waitForTimeout(300);
ok((await page.evaluate(() => window.__vib)).length >= 1, "tapping a tab vibrates");
await page.click("nav >> text=Settings"); await page.waitForTimeout(300);
await page.click('[data-page="plan"]'); await page.waitForTimeout(300);
const sw = page.locator('button[role=switch][aria-label="Early lessons are quicker"]');
await page.evaluate(() => { window.__vib = []; });
const before = await sw.getAttribute("aria-checked");
await sw.click(); await page.waitForTimeout(150);
const after = await sw.getAttribute("aria-checked");
const vib1 = await page.evaluate(() => window.__vib.slice());
await sw.click(); await page.waitForTimeout(150);
const vib2 = (await page.evaluate(() => window.__vib.slice())).slice(vib1.length);
console.log("switch", before, "->", after, JSON.stringify(vib1), JSON.stringify(vib2));
const lastOf = (v) => v[v.length - 1];
const on = after === "true" ? lastOf(vib1) : lastOf(vib2), off = after === "true" ? lastOf(vib2) : lastOf(vib1);
ok(Array.isArray(on) && Array.isArray(off) && JSON.stringify(on) !== JSON.stringify(off), "switching on and off feel different");
ok(on[on.length - 1] > on[0] && off[off.length - 1] < off[0], "on rises, off falls");

// grades during a card session
await page.click('button[aria-label="Back"]').catch(() => {});
await page.click("nav >> text=Today"); await page.waitForTimeout(300);
await page.click("text=/Study \\d+ cards/");
await page.waitForSelector(".flash");
const seen = {};
for (const g of [1, 2, 3, 4]) {
  await page.evaluate(() => { window.__vib = []; });
  await page.click("button.show-btn");
  await page.waitForSelector(`button.grade.g${g}`);
  await page.click(`button.grade.g${g}`);
  await page.waitForTimeout(250);
  seen[g] = (await page.evaluate(() => window.__vib)).filter((p) => Array.isArray(p) && p.length > 1).map((p) => JSON.stringify(p));
}
console.log("grade patterns", seen);
const gradePatterns = [1, 2, 3, 4].map((g) => seen[g][seen[g].length - 1]);
ok(gradePatterns.every(Boolean) && new Set(gradePatterns).size === 4, "Again, Hard, Good and Easy each have their own pattern");
await page.click(".study-top button[aria-label='Close session']");
await page.waitForSelector(".plan-hero");

// finishing a session: the 完了 word is wiped in and a seal is stamped
await page.evaluate(() => { const s = window.__ntStore; });
await page.click("text=/Study \\d+ cards/").catch(() => {});
await page.waitForSelector(".flash", { timeout: 5000 }).catch(() => {});
let guard = 0;
while (await page.locator(".flash").count() && guard++ < 400) {
  await page.click("button.show-btn").catch(() => {});
  await page.click("button.grade.g3").catch(() => {});
}
await page.waitForSelector(".study-body.summary", { timeout: 8000 });
await page.waitForTimeout(1600);
await shot(page, "v48-summary");
ok(await page.locator(".summary .ink-wipe").count() === 1 && await page.locator(".summary .hanko").count() === 1, "finished screen has the brushed word and the seal");
ok((await page.evaluate(() => window.__vib)).some((p) => Array.isArray(p) && p.length >= 9), "finishing plays the long build-up pattern");

console.log("errors:", errors);
ok(errors.length === 0, "no console errors");
await browser.close();
