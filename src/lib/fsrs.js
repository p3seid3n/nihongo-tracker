// FSRS-6 scheduler (Free Spaced Repetition Scheduler), matching Anki / AnkiDroid:
//  - the FSRS-6 default parameters Anki ships, the same formulas (checked against the reference implementation
//    ts-fsrs in tests/fsrs-reference.test.js), elapsed time counted in whole study days like Anki,
//  - Anki's fuzz, its load balancer (due dates within the fuzz range go to the lighter days) and easy days,
//  - learning and relearning steps, a maximum interval.
//
// A card record looks like:
//   { st, s, d, due, last, reps, lapses, step, u }
//   st: 0 new, 1 learning, 2 review, 3 relearning
//   s: stability in days (time for recall probability to fall to 90%)
//   d: difficulty 1..10
//   due: ms timestamp, last: ms timestamp of last review
import { MIN, DAY, addDays, dayStart, dayIndex, dayIndexToDate } from "./time.js";

export const NEW = 0, LEARNING = 1, REVIEW = 2, RELEARNING = 3;
export const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;

/** The FSRS-6 defaults (what Anki and ts-fsrs use before you optimise). */
export const DEFAULT_W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];
/** The defaults this app used before 4.9 (kept to recognise them in old settings). */
export const OLD_DEFAULT_W = [
  0.2172, 1.1771, 3.2602, 16.1507, 7.0114, 0.57, 2.0966, 0.0069, 1.5261, 0.112,
  1.0178, 1.849, 0.1133, 0.3127, 2.2934, 0.2191, 3.0004, 0.7536, 0.3332, 0.1437, 0.1542,
];

/** Allowed range of every weight (the same limits the FSRS trainers use). Anything outside is ignored. */
export const W_BOUNDS = [
  [0.001, 100], [0.001, 100], [0.001, 100], [0.001, 100],
  [1, 10], [0.001, 4], [0.001, 4], [0.001, 0.75],
  [0, 4.5], [0, 0.8], [0.001, 3.5], [0.001, 5],
  [0.001, 0.25], [0.001, 0.9], [0, 4], [0, 1],
  [1, 6], [0, 2], [0, 2], [0, 0.8], [0.1, 0.8],
];
// (w0..w3 may go up to 100 days: the limit Anki uses for initial stability)
export const validWeights = (w) =>
  Array.isArray(w) && w.length === W_BOUNDS.length && w.every((x, i) => Number.isFinite(x) && x >= W_BOUNDS[i][0] && x <= W_BOUNDS[i][1]);

// The weights the rest of the app (statistics, queue ordering) uses for "how likely do you still remember this".
let ACTIVE_W = DEFAULT_W;
export function setActiveWeights(w) { ACTIVE_W = validWeights(w) ? w : DEFAULT_W; }
export const activeWeights = () => ACTIVE_W;

export const DEFAULT_CFG = {
  w: DEFAULT_W,
  retention: 0.9,
  maxInterval: 36500,
  learningSteps: [1 * MIN, 10 * MIN],
  relearningSteps: [10 * MIN],
  fuzz: true,
  // load: { dueOn(dayIdx) -> number of reviews already due that day, easyDays: [Mon..Sun] 1 normal, 0.5 reduced, 0 minimum }
  load: null,
};

const S_MIN = 0.001;
const S_INIT_MIN = 0.1;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

const decay = (w) => -w[20];
const factor = (w) => Math.pow(0.9, 1 / decay(w)) - 1;

/** Probability of recall after `elapsedDays` for a card with stability `s`. */
export function retrievability(elapsedDays, s, w = ACTIVE_W) {
  if (!(s > 0)) return 0;
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (factor(w) * t) / s, decay(w));
}

/** Days until retrievability falls to `retention`. */
export function intervalFor(s, retention, w = DEFAULT_W, maxInterval = 36500) {
  const ivl = (s / factor(w)) * (Math.pow(retention, 1 / decay(w)) - 1);
  return clamp(Math.round(ivl), 1, maxInterval);
}

export const initStability = (g, w = DEFAULT_W) => Math.max(S_INIT_MIN, w[g - 1]);
/** D0(G) without clamping: mean reversion pulls towards D0(Easy), which may lie below 1. */
const rawInitDifficulty = (g, w) => w[4] - Math.exp(w[5] * (g - 1)) + 1;
export const initDifficulty = (g, w = DEFAULT_W) => clamp(rawInitDifficulty(g, w), 1, 10);

export function nextDifficulty(d, g, w = DEFAULT_W) {
  const delta = -w[6] * (g - 3);
  const damped = d + (delta * (10 - d)) / 9;
  const reverted = w[7] * rawInitDifficulty(4, w) + (1 - w[7]) * damped;
  return clamp(reverted, 1, 10);
}

export function nextRecallStability(d, s, r, g, w = DEFAULT_W) {
  const hardPenalty = g === HARD ? w[15] : 1;
  const easyBonus = g === EASY ? w[16] : 1;
  const out =
    s *
    (1 +
      Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) *
        hardPenalty * easyBonus);
  return clamp(out, S_MIN, 36500);
}

export function nextForgetStability(d, s, r, w = DEFAULT_W) {
  const raw =
    w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
  const cap = s / Math.exp(w[17] * w[18]);
  return clamp(Math.min(raw, cap), S_MIN, 36500);
}

export function nextShortTermStability(s, g, w = DEFAULT_W) {
  let inc = Math.exp(w[17] * (g - 3 + w[18])) * Math.pow(s, -w[19]);
  if (g >= HARD) inc = Math.max(inc, 1);
  return clamp(s * inc, S_MIN, 36500);
}

/** The memory state after an answer: same-day answers use the short-term formula (as in Anki). */
export function nextMemory(d, s, elapsedDays, g, w = DEFAULT_W) {
  if (elapsedDays === 0) return { s: nextShortTermStability(s, g, w), d: nextDifficulty(d, g, w) };
  const r = retrievability(elapsedDays, s, w);
  const ns = g === AGAIN ? nextForgetStability(d, s, r, w) : nextRecallStability(d, s, r, g, w);
  return { s: ns, d: nextDifficulty(d, g, w) };
}

// ---------------------------------------------------------------------------
// Deterministic fuzz so that cards learned together do not all come back together.
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seeded(seed) {
  let a = seed >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** Anki's fuzz range for an interval: a few percent either side, never before the time already elapsed. */
export function fuzzRange(ivl, elapsedDays, maxInterval) {
  const ranges = [
    [2.5, 7, 0.15],
    [7, 20, 0.1],
    [20, Infinity, 0.05],
  ];
  let delta = 1;
  for (const [a, b, f] of ranges) delta += f * Math.max(Math.min(ivl, b) - a, 0);
  const iv = Math.min(ivl, maxInterval);
  let lo = Math.max(2, Math.round(iv - delta));
  const hi = Math.min(Math.round(iv + delta), maxInterval);
  if (iv > elapsedDays) lo = Math.max(lo, elapsedDays + 1);
  return { lo: Math.min(lo, hi), hi };
}

/**
 * Pick the interval. Below 2.5 days there is no fuzz. With a load balancer (Anki 24.11+), days in the fuzz range
 * that already have fewer reviews are preferred (weight 1 / reviews², slightly favouring the earlier days),
 * and easy days take a lower share. Otherwise a deterministic random day in the range.
 */
export function pickInterval(ivl, { elapsedDays = 0, maxInterval = 36500, seedKey = "", now = Date.now(), load = null, fuzz = true } = {}) {
  ivl = Math.min(Math.max(1, Math.round(ivl)), maxInterval);
  if (!fuzz || ivl < 2.5) return ivl;
  const { lo, hi } = fuzzRange(ivl, elapsedDays, maxInterval);
  const r = seeded(hashStr(seedKey));
  if (!load || typeof load.dueOn !== "function" || hi - lo < 1) return clamp(Math.floor(r * (hi - lo + 1) + lo), 1, maxInterval);
  const today = dayIndex(now);
  const weights = [];
  let sum = 0;
  for (let d = lo; d <= hi; d++) {
    const day = today + d;
    const n = Math.max(0, load.dueOn(day) || 0);
    const wd = dayIndexToDate(day).getDay(); // 0 = Sunday
    const easy = load.easyDays ? load.easyDays[(wd + 6) % 7] : 1; // settings are Monday first, like Anki
    const share = easy == null ? 1 : easy <= 0 ? 0.0001 : easy;
    const w = (1 / Math.pow(n + 1, 2)) * (1 / d) * share;
    weights.push(w); sum += w;
  }
  let x = r * sum;
  for (let k = 0; k < weights.length; k++) { x -= weights[k]; if (x <= 0) return lo + k; }
  return hi;
}

function stepDelay(steps, idx, grade) {
  // Delay for the step the card is on. Hard repeats the step (average with the next).
  const cur = steps[Math.min(idx, steps.length - 1)];
  if (grade === HARD) {
    const next = steps[idx + 1];
    return next != null ? Math.round((cur + next) / 2) : Math.round(cur * 1.5);
  }
  return cur;
}

/**
 * Whole days since the last review, counted the way Anki does: from the last review to the start of the next
 * study day (4 am), rounded down. A review earlier the same study day counts as 0.
 */
export const elapsedStudyDays = (last, now) => (last ? Math.max(0, Math.floor((addDays(now, 1) - last) / DAY)) : 0);

/**
 * Apply a rating. Returns the new card record (never mutates the input).
 * `card` may be null/undefined for a card that has never been reviewed.
 */
export function review(card, grade, now, cfg = DEFAULT_CFG, seedKey = "") {
  const { w, retention } = cfg;
  const maxInterval = Math.max(1, Math.round(cfg.maxInterval || 36500));
  const c = card || { st: NEW, s: 0, d: 0, due: now, last: 0, reps: 0, lapses: 0, step: 0 };
  const out = { ...c, last: now, reps: (c.reps || 0) + 1, u: now };
  const learnSteps = cfg.learningSteps || [];
  const relearnSteps = cfg.relearningSteps || [];
  const isNew = c.st === NEW || !card;
  const elapsedDays = isNew ? 0 : elapsedStudyDays(c.last, now);
  const pick = (ivl, extra) => pickInterval(ivl, { elapsedDays, maxInterval, seedKey: `${seedKey}:${out.reps}:${extra || ""}`, now, load: cfg.load, fuzz: cfg.fuzz });

  const graduate = (s, d, extraSeed) => {
    out.st = REVIEW;
    out.s = s;
    out.d = d;
    out.step = 0;
    const ivl = pick(intervalFor(s, retention, w, maxInterval), extraSeed);
    out.due = addDays(now, ivl);
    out.ivl = ivl;
    return out;
  };

  if (isNew) {
    const s = initStability(grade, w);
    const d = initDifficulty(grade, w);
    out.s = s;
    out.d = d;
    if (grade === EASY || learnSteps.length === 0 || (grade === GOOD && learnSteps.length === 1)) {
      return graduate(s, d, "n");
    }
    out.st = LEARNING;
    if (grade === AGAIN) out.step = 0;
    else if (grade === HARD) out.step = 0;
    else out.step = 1;
    out.due = now + stepDelay(learnSteps, out.step, grade === HARD ? HARD : GOOD);
    out.ivl = 0;
    return out;
  }

  const mem = nextMemory(c.d, c.s, elapsedDays, grade, w);

  if (c.st === LEARNING || c.st === RELEARNING) {
    const steps = c.st === LEARNING ? learnSteps : relearnSteps;
    out.s = mem.s;
    out.d = mem.d;
    if (grade === EASY) return graduate(mem.s, mem.d, "l");
    if (grade === AGAIN) {
      out.st = c.st;
      out.step = 0;
      if (!steps.length) return graduate(mem.s, mem.d, "l");
      out.due = now + stepDelay(steps, 0, AGAIN);
    } else if (grade === HARD) {
      out.st = c.st;
      if (!steps.length) return graduate(mem.s, mem.d, "l");
      out.due = now + stepDelay(steps, c.step || 0, HARD);
    } else {
      const next = (c.step || 0) + 1;
      if (next >= steps.length) return graduate(mem.s, mem.d, "l");
      out.st = c.st;
      out.step = next;
      out.due = now + stepDelay(steps, next, GOOD);
    }
    out.ivl = 0;
    return out;
  }

  // Review state
  out.d = mem.d;
  if (grade === AGAIN) {
    out.lapses = (c.lapses || 0) + 1;
    out.s = mem.s;
    if (relearnSteps.length === 0) return graduate(out.s, mem.d, "f");
    out.st = RELEARNING;
    out.step = 0;
    out.due = now + stepDelay(relearnSteps, 0, AGAIN);
    out.ivl = 0;
    return out;
  }

  // Compute all three passing intervals so we can keep hard < good < easy (as Anki does).
  const sH = nextMemory(c.d, c.s, elapsedDays, HARD, w).s;
  const sG = nextMemory(c.d, c.s, elapsedDays, GOOD, w).s;
  const sE = nextMemory(c.d, c.s, elapsedDays, EASY, w).s;
  let iH = pick(intervalFor(sH, retention, w, maxInterval), "h");
  let iG = pick(intervalFor(sG, retention, w, maxInterval), "g");
  iH = Math.min(iH, iG);
  iG = Math.max(iG, iH + 1);
  const iE = Math.max(pick(intervalFor(sE, retention, w, maxInterval), "e"), iG + 1);
  const chosen = { [HARD]: [sH, iH], [GOOD]: [sG, iG], [EASY]: [sE, iE] }[grade];
  out.st = REVIEW;
  out.s = chosen[0];
  out.step = 0;
  const ivl = Math.min(chosen[1], maxInterval);
  out.due = addDays(now, ivl);
  out.ivl = ivl;
  return out;
}

/** Predicted next due time for each button, for labelling. Returns {1:ms,2:ms,3:ms,4:ms} (delay from now). */
export function previewDelays(card, now, cfg = DEFAULT_CFG, seedKey = "") {
  const res = {};
  for (const g of [AGAIN, HARD, GOOD, EASY]) {
    const next = review(card, g, now, { ...cfg, fuzz: false }, seedKey);
    res[g] = Math.max(0, next.due - now);
  }
  return res;
}

/** Current recall probability for a stored card (0 for new cards). */
export function currentRetrievability(card, now, w = ACTIVE_W) {
  if (!card || card.st === NEW || !card.s) return 0;
  return retrievability(Math.max(0, (now - card.last) / DAY), card.s, w);
}

/** Is this card due to be shown now? */
export function isDue(card, now, learnAheadMs = 20 * MIN) {
  if (!card || card.st === NEW) return false;
  if (card.st === LEARNING || card.st === RELEARNING) return card.due <= now + learnAheadMs;
  // review cards become due at the start of their due day
  return dayStart(card.due) <= dayStart(now);
}
