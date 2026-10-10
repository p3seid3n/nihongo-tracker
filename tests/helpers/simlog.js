// Synthetic review logs for testing the optimizer: cards scheduled by the app's own FSRS (default weights),
// answers drawn from a "true" memory with different weights.
import { review, retrievability, initStability, initDifficulty, nextDifficulty, nextRecallStability, nextForgetStability, nextShortTermStability, DEFAULT_CFG, DEFAULT_W, NEW } from "../../src/lib/fsrs.js";
import { DAY, MIN } from "../../src/lib/time.js";

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Returns log rows [ts, id, grade, ms, stateBefore, ivl]. */
export function simulate({ wTrue, cards = 300, days = 120, seed = 1, perDay = 6 }) {
  const rand = rng(seed);
  const rows = [];
  const cfg = { ...DEFAULT_CFG, fuzz: false };
  const t0 = Date.UTC(2026, 0, 5, 9);
  const state = []; // app card record
  const mem = [];   // true memory { s, d, last }
  for (let i = 0; i < cards; i++) { state.push(null); mem.push(null); }
  let nextNew = 0;
  for (let day = 0; day < days; day++) {
    const now0 = t0 + day * DAY;
    // due reviews first, then new cards
    const todo = [];
    for (let i = 0; i < nextNew; i++) if (state[i] && state[i].due <= now0 + DAY - 9 * 60 * MIN) todo.push(i);
    for (let k = 0; k < perDay && nextNew < cards; k++) todo.push(nextNew++);
    let clock = now0;
    for (const i of todo) {
      // answer until the card is out of its learning steps for today
      for (let guard = 0; guard < 8; guard++) {
        clock += 20000;
        const rec = state[i];
        const stBefore = rec ? rec.st : NEW;
        const m = mem[i];
        let grade;
        if (!m) grade = rand() < 0.15 ? 1 : rand() < 0.2 ? 2 : rand() < 0.85 ? 3 : 4;
        else {
          const el = Math.max(0, (clock - m.last) / DAY);
          const r = retrievability(el, m.s, wTrue);
          grade = rand() < r ? (rand() < 0.08 ? 2 : rand() < 0.1 ? 4 : 3) : 1;
        }
        // true memory update
        if (!m) mem[i] = { s: initStability(grade, wTrue), d: initDifficulty(grade, wTrue), last: clock };
        else {
          const el = Math.max(0, (clock - m.last) / DAY);
          if (el < 1) m.s = nextShortTermStability(m.s, grade, wTrue);
          else {
            const r = retrievability(el, m.s, wTrue);
            m.s = grade === 1 ? nextForgetStability(m.d, m.s, r, wTrue) : nextRecallStability(m.d, m.s, r, grade, wTrue);
          }
          m.d = nextDifficulty(m.d, grade, wTrue);
          m.last = clock;
        }
        const next = review(rec, grade, clock, cfg, "c" + i);
        rows.push([clock, `d.${i}`, grade, 4000, stBefore, next.ivl || 0]);
        state[i] = next;
        if (next.due > clock + 3 * 60 * MIN) break; // scheduled for later days
        clock = Math.max(clock, next.due - 1);
      }
    }
  }
  return rows;
}

export const perturbed = (mult = {}) => DEFAULT_W.map((x, i) => (mult[i] != null ? x * mult[i] : x));
