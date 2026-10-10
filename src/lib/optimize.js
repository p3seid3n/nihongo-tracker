// Fits the FSRS weights to your own review log, entirely on the device.
//
// The scheduler predicts how likely you are to recall a card after a given gap. This module replays every card's
// history with a candidate set of weights, scores each prediction against what you actually answered (log loss) and
// moves the weights downhill (Adam, with numeric gradients). A fifth of your cards is held back and never used for
// fitting; the new weights are only offered when they predict those cards better than the current ones, by more than
// the noise.
import { DEFAULT_W, W_BOUNDS, validWeights, retrievability, initStability, initDifficulty, nextDifficulty, nextRecallStability, nextForgetStability, nextShortTermStability } from "./fsrs.js";
import { DAY } from "./time.js";

export const MIN_REVIEWS = 400; // scored reviews (gap of a day or more) needed before a fit is worth trying
export const GOOD_REVIEWS = 1500; // from here on the result is reliable

const EPS = 1e-6;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Turn the log into one history per card: [[t, grade], ...] oldest first.
 * Only cards whose very first answer is in the log are used (imported "already known" cards have no history to start from).
 * Lesson and activity rows (ids starting with "g.") are not cards.
 */
export function buildHistories(rows) {
  const by = new Map();
  for (const r of rows) {
    const id = r[1];
    if (typeof id !== "string" || id.startsWith("g.")) continue;
    const g = r[2];
    if (!(g >= 1 && g <= 4)) continue;
    let a = by.get(id);
    if (!a) { a = []; by.set(id, a); }
    a.push(r);
  }
  const out = [];
  for (const [id, a] of by) {
    a.sort((x, y) => x[0] - y[0]);
    if (a[0][4] !== 0) continue; // the first answer must have been on a new card
    if (a.length < 2) continue;
    out.push({ id, h: a.map((r) => [r[0], r[2]]) });
  }
  return out;
}

/** How many reviews in these histories can be scored (a gap of a day or more since the previous one). */
export function scoredCount(hist) {
  let n = 0;
  for (const { h } of hist) for (let i = 1; i < h.length; i++) if ((h[i][0] - h[i - 1][0]) / DAY >= 1) n++;
  return n;
}

/** Deterministic split: about one card in five goes to the held-out set. */
export function splitHistories(hist) {
  const train = [], test = [];
  for (const x of hist) {
    let h = 2166136261;
    for (let i = 0; i < x.id.length; i++) { h ^= x.id.charCodeAt(i); h = Math.imul(h, 16777619); }
    ((h >>> 0) % 5 === 0 ? test : train).push(x);
  }
  return { train, test };
}

/** Replay a history with weights w. Calls onScore(r, passed) for every scored review. */
function replay(h, w, onScore) {
  let s = initStability(h[0][1], w);
  let d = initDifficulty(h[0][1], w);
  for (let i = 1; i < h.length; i++) {
    const g = h[i][1];
    const elapsed = Math.max(0, (h[i][0] - h[i - 1][0]) / DAY);
    if (elapsed < 1) {
      s = nextShortTermStability(s, g, w);
    } else {
      const r = clamp(retrievability(elapsed, s, w), EPS, 1 - EPS);
      onScore(r, g > 1);
      s = g === 1 ? nextForgetStability(d, s, r, w) : nextRecallStability(d, s, r, g, w);
    }
    d = nextDifficulty(d, g, w);
  }
}

/** Mean log loss over all scored reviews, and how many there were. */
export function logLoss(hist, w) {
  let sum = 0, n = 0;
  for (const { h } of hist) replay(h, w, (r, y) => { sum -= y ? Math.log(r) : Math.log(1 - r); n++; });
  return { loss: n ? sum / n : 0, n };
}

/** Mean predicted recall against the share you really recalled, plus the loss. */
export function calibration(hist, w) {
  let p = 0, a = 0, n = 0, sum = 0;
  for (const { h } of hist) replay(h, w, (r, y) => { p += r; a += y ? 1 : 0; n++; sum -= y ? Math.log(r) : Math.log(1 - r); });
  return { n, predicted: n ? p / n : 0, actual: n ? a / n : 0, loss: n ? sum / n : 0 };
}

/** Paired comparison on the same reviews: mean improvement of `b` over `a` in log loss and its standard error. */
export function compare(hist, a, b) {
  const la = [];
  for (const { h } of hist) replay(h, a, (r, y) => la.push(y ? -Math.log(r) : -Math.log(1 - r)));
  let i = 0, mean = 0, m2 = 0;
  for (const { h } of hist) replay(h, b, (r, y) => {
    const diff = la[i++] - (y ? -Math.log(r) : -Math.log(1 - r)); // positive: b is better
    const k = i; const dlt = diff - mean; mean += dlt / k; m2 += dlt * (diff - mean);
  });
  const n = la.length;
  const se = n > 1 ? Math.sqrt(m2 / (n - 1) / n) : Infinity;
  return { n, mean, se };
}

const SCALE = DEFAULT_W.map((x) => Math.max(0.1, Math.abs(x)));
export const PRIOR = 15; // strength of the pull towards the default weights, in units of loss per squared relative distance

function objective(hist, w, w0, count, prior = PRIOR) {
  let sum = 0;
  for (const { h } of hist) replay(h, w, (r, y) => { sum -= y ? Math.log(r) : Math.log(1 - r); });
  let pen = 0;
  for (let j = 0; j < w.length; j++) { const z = (w[j] - w0[j]) / SCALE[j]; pen += z * z; }
  return (sum + prior * pen) / Math.max(1, count);
}

/**
 * Fit the weights. Resolves to { w, iterations, loss }.
 * opts: iterations, lr, maxMs, onProgress(fraction), shouldStop(), yieldFn() (awaited now and then so a UI thread stays responsive).
 */
export async function fit(hist, w0 = DEFAULT_W, opts = {}) {
  const { iterations = 160, lr = 0.04, maxMs = 25000, prior = PRIOR, onProgress, shouldStop, yieldFn } = opts;
  const count = scoredCount(hist);
  const w = w0.slice();
  const m = new Array(w.length).fill(0), v = new Array(w.length).fill(0);
  const b1 = 0.9, b2 = 0.999;
  const t0 = Date.now();
  let best = w.slice(), bestLoss = objective(hist, w, w0, count, prior);
  let done = 0, total = iterations;
  for (let it = 1; it <= total; it++) {
    if (shouldStop && shouldStop()) break;
    if (Date.now() - t0 > maxMs) break;
    const g = new Array(w.length);
    for (let j = 0; j < w.length; j++) {
      const h = 1e-3 * SCALE[j];
      const keep = w[j];
      w[j] = Math.min(W_BOUNDS[j][1], keep + h); const up = w[j];
      const fu = objective(hist, w, w0, count, prior);
      w[j] = Math.max(W_BOUNDS[j][0], keep - h); const dn = w[j];
      const fd = objective(hist, w, w0, count, prior);
      w[j] = keep;
      g[j] = up === dn ? 0 : (fu - fd) / (up - dn);
    }
    const rate = lr * (0.5 * (1 + Math.cos((Math.PI * (it - 1)) / total)) * 0.9 + 0.1);
    for (let j = 0; j < w.length; j++) {
      const gj = g[j] * SCALE[j]; // gradient with respect to the relative weight
      m[j] = b1 * m[j] + (1 - b1) * gj;
      v[j] = b2 * v[j] + (1 - b2) * gj * gj;
      const mh = m[j] / (1 - Math.pow(b1, it)), vh = v[j] / (1 - Math.pow(b2, it));
      w[j] = clamp(w[j] - rate * SCALE[j] * mh / (Math.sqrt(vh) + 1e-8), W_BOUNDS[j][0], W_BOUNDS[j][1]);
    }
    const cur = objective(hist, w, w0, count, prior);
    if (cur < bestLoss) { bestLoss = cur; best = w.slice(); }
    done = it;
    // a big log: plan fewer iterations so the learning-rate schedule still finishes inside the time limit
    if (it === 2) { const per = (Date.now() - t0) / 2; total = Math.max(30, Math.min(iterations, Math.floor(maxMs / Math.max(1, per)))); }
    if (onProgress) onProgress(Math.min(1, it / total));
    if (yieldFn) await yieldFn();
  }
  return { w: best, iterations: done, loss: bestLoss };
}

/**
 * The whole job: split, fit on 80 %, check on the held-out 20 %.
 * Resolves to { ok, reason?, n, nTest, before, after, better, w, gain, se, scored }.
 *  - reason "few": not enough reviews yet.
 *  - better: the new weights predicted the held-out cards better than the current ones by more than the noise.
 */
export async function optimize(rows, current = DEFAULT_W, opts = {}) {
  const hist = buildHistories(rows);
  const scored = scoredCount(hist);
  if (scored < MIN_REVIEWS) return { ok: false, reason: "few", scored, need: MIN_REVIEWS };
  const { train, test } = splitHistories(hist);
  const nTest = scoredCount(test);
  if (nTest < 40 || scoredCount(train) < 200) return { ok: false, reason: "few", scored, need: MIN_REVIEWS };
  const res = await fit(train, DEFAULT_W, opts);
  const w = res.w;
  const before = calibration(test, current), after = calibration(test, w);
  const cmp = compare(test, current, w);
  const better = validWeights(w) && cmp.mean > 0 && cmp.mean > cmp.se && after.loss < before.loss;
  return { ok: true, w, scored, nTest, before, after, gain: cmp.mean, se: cmp.se, better, iterations: res.iterations };
}
