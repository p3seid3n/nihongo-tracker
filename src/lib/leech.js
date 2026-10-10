// A "leech" is a card you keep forgetting. Re-reading it the same way does not help, so the
// app asks for a new way to remember it instead.
import { REVIEW } from "./fsrs.js";

export const LEECH_AT = 8;

/** True right after a lapse that reaches the threshold, and again every 4 lapses after that. */
export function isLeechHit(prev, next, grade) {
  if (grade !== 1 || !prev || prev.st !== REVIEW) return false;
  const n = next?.lapses || 0;
  return n >= LEECH_AT && (n - LEECH_AT) % 4 === 0;
}
