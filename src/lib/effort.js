// The daily effort budget. Every answer costs points, and harder kinds of practice cost more,
// so the day's work stays bounded however many cards are due.
import { NEW } from "./fsrs.js";
import { isProd } from "./ids.js";

/** Log rows with this "state before" value are lesson sessions, not card reviews. */
export const ACTIVITY = 9;

export const COST = { review: 1, new: 2, recallReview: 3, recallNew: 4 };

/** Points one log row cost. Undone rows (grade 0) and lesson sessions cost nothing. */
export function rowCost(row) {
  if (!row || row[2] === 0 || row[4] === ACTIVITY) return 0;
  if (isProd(row[1])) return row[4] === NEW ? COST.recallNew : COST.recallReview;
  return row[4] === NEW ? COST.new : COST.review;
}

export function costOfId(id, isNew) {
  if (isProd(id)) return isNew ? COST.recallNew : COST.recallReview;
  return isNew ? COST.new : COST.review;
}

const num = (v, d, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);

/** Effort settings with defaults (older settings and synced copies may lack the keys). */
export function effortCfg(settings = {}) {
  return {
    recall: settings.recall !== false,
    recallAfter: num(settings.recallAfter, 4, 1, 60),
    recallNewPerDay: num(settings.recallNewPerDay, 5, 0, 30),
    budget: num(settings.effortBudget, 200, 40, 1000),
    throttle: settings.autoThrottle !== false,
  };
}
