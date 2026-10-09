import { launch, shot, BASE } from "./lib.mjs";
const log = (...a) => console.log(...a);
let failed = false;
const ok = (c, m) => { if (!c) { failed = true; console.error("FAIL:", m); } else log("ok:", m); };
const { browser, page, errors } = await launch();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("text=Get started"); await page.click("text=Intermediate");
await page.click("text=Continue"); await page.click("text=Continue"); await page.click("text=Continue");
await page.click("text=Start learning"); await page.waitForSelector(".plan-hero");

// stroke model points measured by the browser itself (independent of the app's path parser)
const modelOf = (ch) => page.evaluate(async (ch) => {
  const idx = [...(await (await fetch("/strokes/index.txt")).text()).trim()];
  const n = Math.floor(idx.indexOf(ch) / 96);
  const data = await (await fetch(`/strokes/${n}.json`)).json();
  const NS = "http://www.w3.org/2000/svg";
  return data[ch].map((d) => {
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", d);
    const L = p.getTotalLength(); const out = [];
    const N = Math.max(6, Math.round(L / 2.5));
    for (let i = 0; i <= N; i++) { const q = p.getPointAtLength((L * i) / N); out.push([q.x, q.y]); }
    return out;
  });
}, ch);

async function drawStroke(pts, { reverse = false, jitter = 0.8 } = {}) {
  const box = await page.locator("svg.pad").boundingBox();
  const P = (reverse ? [...pts].reverse() : pts).map(([x, y]) => [box.x + ((x + (Math.random() - 0.5) * jitter) / 109) * box.width, box.y + ((y + (Math.random() - 0.5) * jitter) / 109) * box.height]);
  await page.mouse.move(P[0][0], P[0][1]);
  await page.mouse.down();
  for (const [x, y] of P.slice(1)) await page.mouse.move(x, y);
  await page.mouse.up();
  await page.waitForTimeout(60);
}
const status = () => page.locator(".pad-status").innerText();
const charOf = async () => (await page.locator("svg.pad").getAttribute("aria-label")).replace("Drawing area for ", "");

// ---- Today shows the writing step
await page.waitForSelector("text=/Write 5 characters/");
ok(true, "Today has a writing step");
await shot(page, "w1-home");
await page.click("button.step:has-text('Write 5 characters')");
await page.waitForSelector("svg.pad");
await page.waitForTimeout(600);
await shot(page, "w2-pad-empty");
let ch = await charOf();
log("first character:", ch);
let M = await modelOf(ch);
ok(M.length >= 1, `stroke data loaded for ${ch} (${M.length} strokes)`);

// ---- wrong direction is rejected (first stroke longer than a dot)
const longIdx = M.findIndex((m) => { let L = 0; for (let i = 1; i < m.length; i++) L += Math.hypot(m[i][0] - m[i - 1][0], m[i][1] - m[i - 1][1]); return L > 30; });
if (longIdx === 0) {
  await drawStroke(M[0], { reverse: true });
  const s = await status();
  ok(/Not quite|Follow|stroke/i.test(s), `backwards stroke rejected: "${s}"`);
  await shot(page, "w3-rejected");
}
// ---- draw everything in order
for (let i = 0; i < M.length; i++) {
  await drawStroke(M[i]);
}
ok(/Perfect|Well done/.test(await status()), `all ${M.length} strokes accepted: "${await status()}"`);
await shot(page, "w4-finished");
await page.click(".pad-actions button.btn-primary");

// ---- wrong order message
await page.waitForTimeout(300);
ch = await charOf(); M = await modelOf(ch);
log("second character:", ch, M.length, "strokes");
if (M.length >= 3) {
  // find a stroke far from stroke 0 and not the same shape
  await drawStroke(M[M.length - 1]);
  const s = await status();
  ok(/comes first|Not quite|Follow/.test(s), `out-of-order stroke flagged: "${s}"`);
}
// hint button, then finish with hint
await page.click("button:has-text('Hint')");
await page.waitForTimeout(300);
await shot(page, "w5-hint");
for (let i = 0; i < M.length; i++) await drawStroke(M[i]);
ok(/Perfect|Well done|Done/.test(await status()), `finished after mistakes: "${await status()}"`);
// show order demo
await page.click("button:has-text('Again')");
await page.click("button:has-text('Show order')");
await page.waitForTimeout(500); await shot(page, "w6-demo");
await page.waitForFunction(() => /Stroke 1 of/.test(document.querySelector(".pad-status")?.innerText || ""), null, { timeout: 15000 });
ok(true, "demo finishes and the pad is ready again");
for (let i = 0; i < M.length; i++) await drawStroke(M[i]);
await page.click(".pad-actions button.btn-primary");

// ---- finish the rest of the session
for (let n = 2; n < 5; n++) {
  await page.waitForTimeout(250);
  const c = await charOf(); const m = await modelOf(c);
  for (let i = 0; i < m.length; i++) await drawStroke(m[i]);
  await page.click(".pad-actions button.btn-primary");
}
await page.waitForSelector("text=Writing practice done");
await shot(page, "w7-summary");
ok(true, "session summary shown");
await page.click("button:has-text('Done')");
await page.waitForSelector(".plan-hero");
await page.waitForTimeout(600);
ok(await page.locator("button.step.done:has-text('Write 5 characters')").count() === 1, "writing step marked done on Today");
const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.(".page") && a.playState === "running" && a.animationName !== "wobble").map((a) => (a.animationName || a.transitionProperty) + " on " + a.effect.target.className?.baseVal ?? a.effect.target.className));
ok(anims.length === 0, `no page animations replay after returning (${anims.join("; ")})`);

// ---- from a study card
await page.click("text=/Study \\d+ cards/");
await page.waitForSelector(".flash");
await page.click("button[aria-label='Practise writing']");
await page.waitForSelector(".sheet svg.pad");
await page.waitForTimeout(800);
const c2 = await charOf(); const m2 = await modelOf(c2);
for (let i = 0; i < m2.length; i++) await drawStroke(m2[i]);
ok(/Perfect|Well done|Done/.test(await status()), `writing from a study card works: "${await status()}"`);
await shot(page, "w8-sheet");
await page.click(".sheet .btn-primary");
await page.waitForTimeout(500);
ok(await page.locator(".sheet").count() === 0, "writing sheet closes");
log("errors:", errors);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
