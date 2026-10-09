import { describe, it, expect } from "vitest";
import * as F from "../src/lib/fsrs.js";
import { MIN, DAY, dayIndex, dayStart, addDays } from "../src/lib/time.js";

const NOW = new Date(2026, 9, 9, 15, 0, 0).getTime();
const cfg = { ...F.DEFAULT_CFG, fuzz: false };

describe("fsrs math", () => {
  it("R(S,S) = 0.9 and interval for 90% equals stability", () => {
    expect(F.retrievability(10, 10)).toBeCloseTo(0.9, 6);
    expect(F.intervalFor(10, 0.9)).toBe(10);
    expect(F.intervalFor(100, 0.9)).toBe(100);
  });
  it("higher retention gives shorter interval", () => {
    expect(F.intervalFor(30, 0.95)).toBeLessThan(F.intervalFor(30, 0.9));
    expect(F.intervalFor(30, 0.8)).toBeGreaterThan(F.intervalFor(30, 0.9));
  });
  it("initial difficulty falls with better grades", () => {
    const d = [1, 2, 3, 4].map((g) => F.initDifficulty(g));
    expect(d[0]).toBeGreaterThan(d[1]);
    expect(d[1]).toBeGreaterThan(d[2]);
    expect(d[2]).toBeGreaterThan(d[3]);
    expect(d[2]).toBeCloseTo(4.88, 1);
  });
  it("recall stability grows, forgetting shrinks it", () => {
    const r = 0.9;
    expect(F.nextRecallStability(5, 10, r, 3)).toBeGreaterThan(10);
    expect(F.nextForgetStability(5, 10, r)).toBeLessThan(10);
    expect(F.nextRecallStability(5, 10, r, 4)).toBeGreaterThan(F.nextRecallStability(5, 10, r, 3));
    expect(F.nextRecallStability(5, 10, r, 2)).toBeLessThan(F.nextRecallStability(5, 10, r, 3));
  });
  it("lower recall probability gives bigger stability gain (spacing effect)", () => {
    expect(F.nextRecallStability(5, 10, 0.7, 3)).toBeGreaterThan(F.nextRecallStability(5, 10, 0.95, 3));
  });
  it("difficulty stays in 1..10", () => {
    let d = 5;
    for (let i = 0; i < 100; i++) d = F.nextDifficulty(d, 1);
    expect(d).toBeLessThanOrEqual(10);
    for (let i = 0; i < 200; i++) d = F.nextDifficulty(d, 4);
    expect(d).toBeGreaterThanOrEqual(1);
  });
});

describe("state machine", () => {
  it("new + Again goes to learning 1m", () => {
    const c = F.review(null, 1, NOW, cfg);
    expect(c.st).toBe(F.LEARNING);
    expect(c.due - NOW).toBe(1 * MIN);
  });
  it("new + Good goes to step 2 (10m), then Good graduates", () => {
    let c = F.review(null, 3, NOW, cfg);
    expect(c.st).toBe(F.LEARNING);
    expect(c.due - NOW).toBe(10 * MIN);
    c = F.review(c, 3, NOW + 10 * MIN, cfg);
    expect(c.st).toBe(F.REVIEW);
    expect(c.due).toBeGreaterThanOrEqual(addDays(NOW, 1));
    expect(c.s).toBeGreaterThan(1);
  });
  it("new + Easy graduates immediately with a multi-day interval", () => {
    const c = F.review(null, 4, NOW, cfg);
    expect(c.st).toBe(F.REVIEW);
    expect(dayIndex(c.due) - dayIndex(NOW)).toBeGreaterThan(10);
  });
  it("review + Again lapses into relearning", () => {
    let c = F.review(null, 4, NOW, cfg);
    const later = c.due + 2 * DAY;
    const l = F.review(c, 1, later, cfg);
    expect(l.st).toBe(F.RELEARNING);
    expect(l.lapses).toBe(1);
    expect(l.s).toBeLessThan(c.s);
    expect(l.due - later).toBe(10 * MIN);
    const back = F.review(l, 3, later + 10 * MIN, cfg);
    expect(back.st).toBe(F.REVIEW);
  });
  it("review intervals are ordered hard < good < easy", () => {
    let c = F.review(null, 4, NOW, cfg);
    const t = c.due;
    const h = F.review(c, 2, t, cfg), g = F.review(c, 3, t, cfg), e = F.review(c, 4, t, cfg);
    expect(h.ivl).toBeLessThan(g.ivl);
    expect(g.ivl).toBeLessThan(e.ivl);
  });
  it("a healthy card keeps growing over repeated Good reviews", () => {
    let c = F.review(null, 3, NOW, cfg);
    let t = NOW + 10 * MIN;
    c = F.review(c, 3, t, cfg);
    let prev = c.ivl;
    for (let i = 0; i < 8; i++) {
      t = c.due;
      c = F.review(c, 3, t, cfg);
      expect(c.ivl).toBeGreaterThanOrEqual(prev);
      prev = c.ivl;
    }
    expect(prev).toBeGreaterThan(60);
  });
  it("fuzz is deterministic and bounded", () => {
    const f = { ...F.DEFAULT_CFG, fuzz: true };
    const a = F.review(F.review(null, 4, NOW, f, "x"), 3, NOW + 20 * DAY, f, "x");
    const b = F.review(F.review(null, 4, NOW, f, "x"), 3, NOW + 20 * DAY, f, "x");
    expect(a.due).toBe(b.due);
  });
  it("previewDelays returns four increasing-ish delays and does not throw for new/review", () => {
    const p = F.previewDelays(null, NOW);
    expect(p[1]).toBe(MIN);
    expect(p[4]).toBeGreaterThan(p[3]);
    const c = F.review(null, 4, NOW, cfg);
    const q = F.previewDelays(c, c.due);
    expect(q[2]).toBeLessThanOrEqual(q[3]);
    expect(q[3]).toBeLessThan(q[4]);
  });
  it("max interval is respected", () => {
    const c = { st: 2, s: 30000, d: 3, due: NOW, last: NOW - 30000 * DAY, reps: 5, lapses: 0, step: 0 };
    const n = F.review(c, 4, NOW, { ...cfg, maxInterval: 365 });
    expect(n.ivl).toBeLessThanOrEqual(365);
  });
});

describe("day helpers", () => {
  it("04:00 rollover", () => {
    const late = new Date(2026, 9, 10, 2, 0).getTime();
    const day = new Date(2026, 9, 9, 15, 0).getTime();
    expect(dayIndex(late)).toBe(dayIndex(day));
    const morning = new Date(2026, 9, 10, 5, 0).getTime();
    expect(dayIndex(morning)).toBe(dayIndex(day) + 1);
    expect(dayStart(late)).toBeLessThanOrEqual(late);
  });
  it("addDays crosses DST consistently", () => {
    const t = new Date(2026, 9, 24, 12).getTime();
    expect(dayIndex(addDays(t, 3))).toBe(dayIndex(t) + 3);
  });
  it("isDue: review due on its due day, learning within learn-ahead", () => {
    const c = F.review(F.review(null, 4, NOW, cfg), 3, NOW + 10 * DAY, cfg);
    expect(F.isDue(c, c.due)).toBe(true);
    expect(F.isDue(c, c.due - 2 * DAY)).toBe(false);
    const l = F.review(null, 1, NOW, cfg);
    expect(F.isDue(l, NOW)).toBe(true);
    expect(F.isDue(l, NOW - 30 * MIN)).toBe(false);
  });
});
