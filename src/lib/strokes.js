// Stroke order data (KanjiVG, CC BY-SA 3.0) and the stroke checker for the writing pad.
// All coordinates live on KanjiVG's 109 x 109 grid.

export const GRID = 109;

// ---------------------------------------------------------------------------
// SVG path -> points
const TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g;

function cubic(p0, p1, p2, p3, steps, out) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}
function quad(p0, p1, p2, steps, out) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
}

/** Flattens an SVG path (M L H V C S Q T Z, absolute and relative) into a polyline. */
export function pathPoints(d, steps = 14) {
  const toks = [];
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(d))) toks.push(m[1] ? m[1] : parseFloat(m[2]));
  const out = [];
  let i = 0, cmd = "", cx = 0, cy = 0, sx = 0, sy = 0, lastC = null, lastQ = null;
  const num = () => toks[i++];
  while (i < toks.length) {
    if (typeof toks[i] === "string") cmd = toks[i++];
    else if (cmd === "M") cmd = "L"; else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (C === "M") { cx = ox + num(); cy = oy + num(); sx = cx; sy = cy; out.push([cx, cy]); lastC = lastQ = null; }
    else if (C === "L") { cx = ox + num(); cy = oy + num(); out.push([cx, cy]); lastC = lastQ = null; }
    else if (C === "H") { cx = ox + num(); out.push([cx, cy]); lastC = lastQ = null; }
    else if (C === "V") { cy = oy + num(); out.push([cx, cy]); lastC = lastQ = null; }
    else if (C === "C") {
      const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()];
      cubic([cx, cy], p1, p2, p3, steps, out); cx = p3[0]; cy = p3[1]; lastC = p2; lastQ = null;
    } else if (C === "S") {
      const p1 = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy];
      const p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()];
      cubic([cx, cy], p1, p2, p3, steps, out); cx = p3[0]; cy = p3[1]; lastC = p2; lastQ = null;
    } else if (C === "Q") {
      const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()];
      quad([cx, cy], p1, p2, steps, out); cx = p2[0]; cy = p2[1]; lastQ = p1; lastC = null;
    } else if (C === "T") {
      const p1 = lastQ ? [2 * cx - lastQ[0], 2 * cy - lastQ[1]] : [cx, cy];
      const p2 = [ox + num(), oy + num()];
      quad([cx, cy], p1, p2, steps, out); cx = p2[0]; cy = p2[1]; lastQ = p1; lastC = null;
    } else if (C === "A") { i += 5; cx = ox + num(); cy = oy + num(); out.push([cx, cy]); lastC = lastQ = null; } // arcs don't occur in KanjiVG; straight line fallback
    else if (C === "Z") { cx = sx; cy = sy; out.push([cx, cy]); }
    else break;
  }
  return out;
}

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; }

/** n points spaced evenly along the polyline. */
export function resample(pts, n = 24) {
  if (!pts.length) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const total = pathLength(pts);
  if (total === 0) return Array.from({ length: n }, () => pts[0]);
  const out = [pts[0]];
  const step = total / (n - 1);
  let acc = 0, i = 1, prev = pts[0];
  for (let k = 1; k < n - 1; k++) {
    const target = k * step;
    while (i < pts.length && acc + dist(prev, pts[i]) < target) { acc += dist(prev, pts[i]); prev = pts[i]; i++; }
    if (i >= pts.length) { out.push(pts[pts.length - 1]); continue; }
    const seg = dist(prev, pts[i]) || 1;
    const t = (target - acc) / seg;
    out.push([prev[0] + (pts[i][0] - prev[0]) * t, prev[1] + (pts[i][1] - prev[1]) * t]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const centroid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

/**
 * Does the drawn stroke match this model stroke? Direction matters (the point order is compared),
 * so a stroke drawn backwards fails. A stroke that is the right shape but drawn a little off to the
 * side or smaller is accepted with a tighter shape test, so writing from memory isn't punished
 * for sloppy placement.
 */
export function matchStroke(user, model, { leniency = 1 } = {}) {
  if (!user.length || !model.length) return { ok: false, avg: Infinity };
  const lenM = pathLength(model);
  const short = lenM < 16; // dots and ticks
  const lenU = pathLength(user);
  const U = resample(user.length === 1 ? [user[0], [user[0][0] + 0.01, user[0][1]]] : user, 24);
  const M = resample(model, 24);
  const thr = (short ? 11 : 13) * leniency;
  const endThr = (short ? 18 : 22) * leniency;
  const avg = U.reduce((a, p, i) => a + dist(p, M[i]), 0) / U.length;
  const start = dist(U[0], M[0]), end = dist(U[U.length - 1], M[M.length - 1]);
  const ratio = lenM ? lenU / lenM : 1;
  const ratioOk = short ? lenU <= lenM * 4 + 12 : ratio >= 0.55 && ratio <= 1.7;
  if (avg <= thr && start <= endThr && end <= endThr && ratioOk) return { ok: true, avg, shifted: false };
  // same shape, shifted or scaled: compare around the centres
  const cu = centroid(U), cm = centroid(M);
  const off = dist(cu, cm);
  if (short) {
    // dots and ticks: nearby, similar direction, not a long scribble
    const dm = [M[23][0] - M[0][0], M[23][1] - M[0][1]], du = [U[23][0] - U[0][0], U[23][1] - U[0][1]];
    const nm = Math.hypot(dm[0], dm[1]), nu = Math.hypot(du[0], du[1]);
    const cos = nm > 3 && nu > 3 ? (dm[0] * du[0] + dm[1] * du[1]) / (nm * nu) : 1;
    if (off <= 20 * leniency && lenU <= lenM * 4 + 12 && cos >= 0.5) return { ok: true, avg, shifted: true };
    return { ok: false, avg };
  }
  if (off <= 24 * leniency) {
    const scale = lenU > 0 && lenM > 0 ? Math.min(1.6, Math.max(0.6, lenM / lenU)) : 1;
    const adj = U.map((p) => [cm[0] + (p[0] - cu[0]) * scale, cm[1] + (p[1] - cu[1]) * scale]);
    const avg2 = adj.reduce((a, p, i) => a + dist(p, M[i]), 0) / adj.length;
    if (avg2 <= thr * 0.7 && ratio >= 0.4 && ratio <= 2.2) return { ok: true, avg: avg2, shifted: true };
  }
  return { ok: false, avg };
}

/**
 * Check a drawn stroke against the expected one. Returns
 * { ok: true } | { ok: false, order: j } (it belongs to a later stroke) | { ok: false }.
 * A stroke that only fits the expected one after being shifted loses to a later stroke it fits
 * exactly where it was drawn (so drawing the bottom bar of 三 first is caught).
 */
export function checkStroke(user, models, expected, opts) {
  const m = matchStroke(user, models[expected], opts);
  if (m.ok && !m.shifted) return { ok: true };
  let shiftedLater = -1;
  for (let j = expected + 1; j < models.length; j++) {
    const r = matchStroke(user, models[j], { ...opts, leniency: (opts?.leniency || 1) * 0.8 });
    if (r.ok && !r.shifted) return { ok: false, order: j };
    if (r.ok && shiftedLater < 0) shiftedLater = j;
  }
  if (m.ok) return { ok: true };
  return shiftedLater >= 0 ? { ok: false, order: shiftedLater } : { ok: false };
}

// ---------------------------------------------------------------------------
// Data loading
const base = () => ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/") + "strokes/";
const SHARD = 96;
let indexP = null;
const shards = new Map();
const cache = new Map();

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to load " + url);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to load " + url);
  return r.text();
}

/** Stroke centre lines (SVG path strings, in writing order) for one character, or null if unavailable. */
export async function loadStrokes(ch) {
  if (cache.has(ch)) return cache.get(ch);
  try {
    indexP = indexP || getText(base() + "index.txt").then((t) => [...t.trim()]);
    const idx = await indexP;
    const pos = idx.indexOf(ch);
    if (pos < 0) { cache.set(ch, null); return null; }
    const n = Math.floor(pos / SHARD);
    if (!shards.has(n)) shards.set(n, getJSON(base() + n + ".json"));
    const data = await shards.get(n);
    const paths = data[ch] || null;
    cache.set(ch, paths);
    return paths;
  } catch (e) {
    indexP = null; shards.clear();
    throw e;
  }
}

/** Does the character have stroke data? (kanji and kana only) */
export const isWritable = (ch) => /[぀-ヿ一-鿿㐀-䶿々]/.test(ch || "");
