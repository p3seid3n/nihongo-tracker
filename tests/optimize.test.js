import { describe, it, expect } from "vitest";
import { simulate, perturbed } from "./helpers/simlog.js";
import { buildHistories, scoredCount, splitHistories, logLoss, calibration, compare, fit, optimize, MIN_REVIEWS } from "../src/lib/optimize.js";
import { DEFAULT_W, W_BOUNDS, validWeights, setActiveWeights, activeWeights, currentRetrievability, retrievability, review } from "../src/lib/fsrs.js";
import { Store, memoryBackend } from "../src/lib/store.js";
import { DAY } from "../src/lib/time.js";

describe("weights", () => {
  it("the default weights are inside the allowed ranges", () => {
    expect(W_BOUNDS.length).toBe(21);
    expect(validWeights(DEFAULT_W)).toBe(true);
  });
  it("rejects wrong length, NaN and out-of-range values", () => {
    expect(validWeights(null)).toBe(false);
    expect(validWeights(DEFAULT_W.slice(0, 20))).toBe(false);
    expect(validWeights(DEFAULT_W.map((x, i) => (i === 3 ? NaN : x)))).toBe(false);
    expect(validWeights(DEFAULT_W.map((x, i) => (i === 20 ? 5 : x)))).toBe(false);
  });
  it("setActiveWeights changes retrievability and ignores invalid input", () => {
    const card = { st: 2, s: 10, last: DAY };
    const base = currentRetrievability(card, 31 * DAY);
    const w = DEFAULT_W.slice(); w[20] = 0.5;
    setActiveWeights(w);
    expect(currentRetrievability(card, 31 * DAY)).not.toBeCloseTo(base, 3);
    setActiveWeights([1, 2, 3]);
    expect(activeWeights()).toBe(DEFAULT_W);
    expect(currentRetrievability(card, 31 * DAY)).toBeCloseTo(base, 10);
  });
});

describe("store uses personal weights", () => {
  it("falls back to the defaults when the stored ones are broken", async () => {
    const s = new Store(memoryBackend(), { autosave: false });
    await s.load();
    expect(s.weights()).toBe(DEFAULT_W);
    s.updateSettings({ fsrsW: [1, 2, 3] });
    expect(s.weights()).toBe(DEFAULT_W);
    const w = DEFAULT_W.slice(); w[8] = 2.5;
    s.updateSettings({ fsrsW: w });
    expect(s.weights()).toBe(w);
    expect(s.fsrsCfg().w).toBe(w);
    expect(s.cfgFor("d.1~p").w).toBe(w);
    expect(s.lessonCfg().w).toBe(w);
    expect(activeWeights()).toBe(w);
    s.updateSettings({ fsrsW: null });
    expect(activeWeights()).toBe(DEFAULT_W);
  });
  it("schedules differently with different weights", () => {
    const w = DEFAULT_W.slice(); w[8] = 3;
    const base = { st: 2, s: 12, d: 5, last: DAY, due: 13 * DAY, reps: 4, lapses: 0, step: 0 };
    const a = review(base, 3, 13 * DAY, { ...{ w: DEFAULT_W, retention: 0.9, maxInterval: 36500, learningSteps: [], relearningSteps: [], fuzz: false } });
    const b = review(base, 3, 13 * DAY, { ...{ w, retention: 0.9, maxInterval: 36500, learningSteps: [], relearningSteps: [], fuzz: false } });
    expect(b.s).toBeGreaterThan(a.s);
  });
});

describe("histories", () => {
  const T = 1e9;
  it("uses only cards whose first answer was on a new card, skips lessons, groups and sorts", () => {
    const rows = [
      [T + 3 * DAY, "d.1", 3, 1, 2, 4], [T, "d.1", 3, 1, 0, 1], // out of order
      [T, "d.2", 3, 1, 2, 4], [T + DAY, "d.2", 3, 1, 2, 4], // started as review (imported): skipped
      [T, "g.lesson", 3, 1, 9, 0], [T + DAY, "g.lesson", 3, 1, 9, 0],
      [T, "d.3", 3, 1, 0, 1], // single answer: nothing to score
    ];
    const h = buildHistories(rows);
    expect(h.length).toBe(1);
    expect(h[0].id).toBe("d.1");
    expect(h[0].h.map((x) => x[0])).toEqual([T, T + 3 * DAY]);
    expect(scoredCount(h)).toBe(1);
  });
  it("counts only gaps of a day or more as scored", () => {
    const rows = [[T, "d.1", 3, 1, 0, 1], [T + 600000, "d.1", 3, 1, 1, 1], [T + 2 * DAY, "d.1", 1, 1, 2, 1]];
    expect(scoredCount(buildHistories(rows))).toBe(1);
  });
  it("splits deterministically and never puts a card in both sets", () => {
    const hist = Array.from({ length: 200 }, (_, i) => ({ id: `d.${i}`, h: [] }));
    const a = splitHistories(hist), b = splitHistories(hist);
    expect(a.test.map((x) => x.id)).toEqual(b.test.map((x) => x.id));
    expect(a.train.length + a.test.length).toBe(200);
    expect(a.test.length).toBeGreaterThan(20);
    expect(a.test.length).toBeLessThan(70);
    expect(a.train.some((x) => a.test.includes(x))).toBe(false);
  });
});

describe("scoring", () => {
  it("log loss is lowest for weights that match the data generator", () => {
    const wTrue = perturbed({ 8: 0.55, 9: 1.5, 11: 0.5, 20: 1.7 });
    const hist = buildHistories(simulate({ wTrue, cards: 250, days: 120, seed: 3 }));
    expect(logLoss(hist, wTrue).loss).toBeLessThan(logLoss(hist, DEFAULT_W).loss);
    const c = calibration(hist, wTrue);
    expect(Math.abs(c.predicted - c.actual)).toBeLessThan(0.04);
  });
  it("compare reports a positive mean when the second weights are better", () => {
    const wTrue = perturbed({ 8: 0.55, 9: 1.5, 11: 0.5, 20: 1.7 });
    const hist = buildHistories(simulate({ wTrue, cards: 250, days: 120, seed: 4 }));
    const c = compare(hist, DEFAULT_W, wTrue);
    expect(c.mean).toBeGreaterThan(0);
    expect(c.se).toBeGreaterThan(0);
    expect(compare(hist, DEFAULT_W, DEFAULT_W).mean).toBeCloseTo(0, 12);
  });
});

describe("fit", () => {
  const wTrue = perturbed({ 8: 0.55, 9: 1.5, 11: 0.5, 13: 1.3, 20: 1.7, 17: 1.3 });
  it("lowers the training loss, stays inside the bounds and moves towards the truth", async () => {
    const hist = buildHistories(simulate({ wTrue, cards: 260, days: 140, seed: 21, perDay: 8 }));
    const before = logLoss(hist, DEFAULT_W).loss;
    const res = await fit(hist, DEFAULT_W, { iterations: 60 });
    expect(validWeights(res.w)).toBe(true);
    expect(logLoss(hist, res.w).loss).toBeLessThan(before);
    // the decay weight and the growth weight move in the direction of the truth
    expect(res.w[20]).toBeGreaterThan(DEFAULT_W[20]);
    expect(res.w[8]).toBeLessThan(DEFAULT_W[8]);
  }, 60000);
  it("can be stopped, and reports progress", async () => {
    const hist = buildHistories(simulate({ wTrue, cards: 120, days: 80, seed: 22 }));
    let calls = 0, last = 0;
    const res = await fit(hist, DEFAULT_W, { iterations: 50, shouldStop: () => calls >= 3, onProgress: (p) => { calls++; last = p; } });
    expect(res.iterations).toBe(3);
    expect(last).toBeGreaterThan(0);
    expect(validWeights(res.w)).toBe(true);
  }, 60000);
});

describe("optimize", () => {
  it("refuses with too few reviews", async () => {
    const rows = simulate({ wTrue: DEFAULT_W, cards: 20, days: 30, seed: 5 });
    const res = await optimize(rows, DEFAULT_W, {});
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("few");
    expect(res.need).toBe(MIN_REVIEWS);
  });
  it("recommends better weights for a learner who forgets differently, and keeps the held-out cards out of the fit", async () => {
    const wTrue = perturbed({ 8: 0.55, 9: 1.5, 11: 0.5, 13: 1.3, 20: 1.7, 17: 1.3 });
    const rows = simulate({ wTrue, cards: 500, days: 160, seed: 11, perDay: 8 });
    const res = await optimize(rows, DEFAULT_W, { iterations: 100 });
    expect(res.ok).toBe(true);
    expect(res.nTest).toBeGreaterThan(300);
    expect(res.gain).toBeGreaterThan(0);
    expect(res.after.loss).toBeLessThan(res.before.loss);
    expect(res.better).toBe(true);
    expect(validWeights(res.w)).toBe(true);
  }, 120000);
  it("never calls weights better when they are not (data generated by the standard weights)", async () => {
    const rows = simulate({ wTrue: DEFAULT_W, cards: 400, days: 150, seed: 7 });
    const res = await optimize(rows, DEFAULT_W, { iterations: 100 });
    expect(res.ok).toBe(true);
    expect(res.better).toBe(false);
  }, 120000);
});
