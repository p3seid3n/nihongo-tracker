// FSRS-6 scheduler (Free Spaced Repetition Scheduler) with default parameters.
// This is the same family of algorithm your Anki uses when FSRS is switched on.
//
// A card record looks like:
//   { st, s, d, due, last, reps, lapses, step, u }
//   st: 0 new, 1 learning, 2 review, 3 relearning
//   s: stability in days (time for recall probability to fall to 90%)
//   d: difficulty 1..10
//   due: ms timestamp, last: ms timestamp of last review
import { MIN, DAY, addDays, dayStart } from "./time.js";

export const NEW = 0, LEARNING = 1, REVIEW = 2, RELEARNING = 3;
export const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;

export const DEFAULT_W = [
  0.2172, 1.1771, 3.2602, 16.1507, 7.0114, 0.57, 2.0966, 0.0069, 1.5261, 0.112,
  1.0178, 1.849, 0.1133, 0.3127, 2.2934, 0.2191, 3.0004, 0.7536, 0.3332, 0.1437, 0.1542,
];

export const DEFAULT_CFG = {
  w: DEFAULT_W,
  retention: 0.9,
  maxInterval: 36500,
  learningSteps: [1 * MIN, 10 * MIN],
  relearningSteps: [10 * MIN],
  fuzz: true,
};

const S_MIN = 0.001;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

const decay = (w) => -w[20];
const factor = (w) => Math.pow(0.9, 1 / decay(w)) - 1;

/** Probability of recall after `elapsedDays` for a card with stability `s`. */
export function retrievability(elapsedDays, s, w = DEFAULT_W) {
  if (!(s > 0)) return 0;
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (factor(w) * t) / s, decay(w));
}

/** Days until retrievability falls to `retention`. */
export function intervalFor(s, retention, w = DEFAULT_W, maxInterval = 36500) {
  const ivl = (s / factor(w)) * (Math.pow(retention, 1 / decay(w)) - 1);
  return clamp(Math.round(ivl), 1, maxInterval);
}

export const initStability = (g, w = DEFAULT_W) => Math.max(S_MIN, w[g - 1]);
export const initDifficulty = (g, w = DEFAULT_W) =>
  clamp(w[4] - Math.exp(w[5] * (g - 1)) + 1, 1, 10);

export function nextDifficulty(d, g, w = DEFAULT_W) {
  const delta = -w[6] * (g - 3);
  const damped = d + (delta * (10 - d)) / 9;
  const reverted = w[7] * initDifficulty(4, w) + (1 - w[7]) * damped;
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
  if (g >= GOOD) inc = Math.max(inc, 1);
  return clamp(s * inc, S_MIN, 36500);
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
function fuzzed(ivl, seedKey, maxInterval) {
  if (ivl < 3) return ivl;
  const ranges = [
    [2.5, 7, 0.15],
    [7, 20, 0.1],
    [20, Infinity, 0.05],
  ];
  let delta = 1;
  for (const [a, b, f] of ranges) delta += f * Math.max(Math.min(ivl, b) - a, 0);
  let lo = Math.max(2, Math.round(ivl - delta));
  let hi = Math.min(Math.round(ivl + delta), maxInterval);
  if (ivl > maxInterval) return maxInterval;
  if (lo > hi) lo = hi;
  const r = seeded(hashStr(seedKey));
  return clamp(Math.floor(r * (hi - lo + 1) + lo), 1, maxInterval);
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
 * Apply a rating. Returns the new card record (never mutates the input).
 * `card` may be null/undefined for a card that has never been reviewed.
 */
export function review(card, grade, now, cfg = DEFAULT_CFG, seedKey = "") {
  const { w, retention, maxInterval } = cfg;
  const c = card || { st: NEW, s: 0, d: 0, due: now, last: 0, reps: 0, lapses: 0, step: 0 };
  const out = { ...c, last: now, reps: (c.reps || 0) + 1, u: now };
  const learnSteps = cfg.learningSteps || [];
  const relearnSteps = cfg.relearningSteps || [];

  const graduate = (s, d, extraSeed) => {
    out.st = REVIEW;
    out.s = s;
    out.d = d;
    out.step = 0;
    let ivl = intervalFor(s, retention, w, maxInterval);
    if (cfg.fuzz) ivl = fuzzed(ivl, `${seedKey}:${out.reps}:${extraSeed || ""}`, maxInterval);
    out.due = addDays(now, ivl);
    out.ivl = ivl;
    return out;
  };

  if (c.st === NEW || !card) {
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

  const elapsedDays = Math.max(0, (now - (c.last || now)) / DAY);

  if (c.st === LEARNING || c.st === RELEARNING) {
    const steps = c.st === LEARNING ? learnSteps : relearnSteps;
    const s = elapsedDays < 1 ? nextShortTermStability(c.s, grade, w) : nextRecallStability(c.d, c.s, retrievability(elapsedDays, c.s, w), grade, w);
    const d = nextDifficulty(c.d, grade, w);
    out.s = s;
    out.d = d;
    if (grade === EASY) return graduate(s, d, "l");
    if (grade === AGAIN) {
      out.st = c.st;
      out.step = 0;
      out.due = now + stepDelay(steps, 0, AGAIN);
    } else if (grade === HARD) {
      out.st = c.st;
      out.due = now + stepDelay(steps, c.step || 0, HARD);
    } else {
      const next = (c.step || 0) + 1;
      if (next >= steps.length) return graduate(s, d, "l");
      out.st = c.st;
      out.step = next;
      out.due = now + stepDelay(steps, next, GOOD);
    }
    out.ivl = 0;
    return out;
  }

  // Review state
  const r = retrievability(elapsedDays, c.s, w);
  const d = nextDifficulty(c.d, grade, w);
  out.d = d;

  if (grade === AGAIN) {
    out.lapses = (c.lapses || 0) + 1;
    out.s = nextForgetStability(c.d, c.s, r, w);
    if (relearnSteps.length === 0) return graduate(out.s, d, "f");
    out.st = RELEARNING;
    out.step = 0;
    out.due = now + stepDelay(relearnSteps, 0, AGAIN);
    out.ivl = 0;
    return out;
  }

  if (elapsedDays < 1) {
    // Reviewed again the same day (e.g. "study more"): small short-term update.
    out.s = nextShortTermStability(c.s, grade, w);
    return graduate(out.s, d, "s");
  }

  // Compute all three passing intervals so we can keep hard <= good <= easy.
  const sH = nextRecallStability(c.d, c.s, r, HARD, w);
  const sG = nextRecallStability(c.d, c.s, r, GOOD, w);
  const sE = nextRecallStability(c.d, c.s, r, EASY, w);
  let iH = intervalFor(sH, retention, w, maxInterval);
  let iG = intervalFor(sG, retention, w, maxInterval);
  let iE = intervalFor(sE, retention, w, maxInterval);
  iH = Math.min(iH, iG);
  iG = Math.max(iG, iH + 1);
  iE = Math.max(iE, iG + 1);
  const pick = { [HARD]: [sH, iH], [GOOD]: [sG, iG], [EASY]: [sE, iE] }[grade];
  out.st = REVIEW;
  out.s = pick[0];
  out.step = 0;
  let ivl = Math.min(pick[1], maxInterval);
  if (cfg.fuzz) ivl = fuzzed(ivl, `${seedKey}:${out.reps}`, maxInterval);
  // Keep hard < good < easy even after fuzz by only fuzzing within safe bounds.
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
export function currentRetrievability(card, now, w = DEFAULT_W) {
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
