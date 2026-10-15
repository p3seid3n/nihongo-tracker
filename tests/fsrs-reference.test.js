// Our FSRS-6 against the reference implementation (ts-fsrs, the library behind many FSRS apps; same formulas as Anki's fsrs-rs).
import { describe, it, expect } from "vitest";
import { FSRSAlgorithm, generatorParameters, default_w } from "ts-fsrs";
import { DEFAULT_W, nextMemory, initStability, initDifficulty, retrievability, intervalFor, fuzzRange, pickInterval } from "../src/lib/fsrs.js";

const ref = new FSRSAlgorithm(generatorParameters({ enable_fuzz: false, enable_short_term: true }));

function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }

describe("matches ts-fsrs", () => {
  it("uses the same default parameters", () => {
    expect(DEFAULT_W).toEqual([...default_w]);
  });
  it("starts cards the same way", () => {
    for (const g of [1, 2, 3, 4]) {
      const r = ref.next_state(null, 0, g);
      expect(initStability(g)).toBeCloseTo(r.stability, 6);
      expect(initDifficulty(g)).toBeCloseTo(r.difficulty, 6);
    }
  });
  it("follows the same memory states over thousands of random histories", () => {
    const rand = rng(42);
    let checked = 0;
    for (let card = 0; card < 400; card++) {
      const g0 = 1 + Math.floor(rand() * 4);
      let mine = { s: initStability(g0), d: initDifficulty(g0) };
      let theirs = ref.next_state(null, 0, g0);
      for (let k = 0; k < 12; k++) {
        const t = rand() < 0.15 ? 0 : Math.floor(rand() * rand() * 200);
        const g = rand() < 0.2 ? 1 : 2 + Math.floor(rand() * 3);
        mine = nextMemory(mine.d, mine.s, t, g);
        theirs = ref.next_state(theirs, t, g);
        // ts-fsrs rounds every step to 8 decimals; allow a millionth relative difference
        expect(Math.abs(mine.s - theirs.stability) / theirs.stability).toBeLessThan(1e-6);
        expect(mine.d).toBeCloseTo(theirs.difficulty, 5);
        checked++;
      }
    }
    expect(checked).toBe(4800);
  });
  it("forgets at the same rate and picks the same intervals", () => {
    for (const s of [0.5, 2.3, 8.3, 40, 300, 2000]) {
      for (const t of [0, 1, 5, 30, 400]) expect(retrievability(t, s)).toBeCloseTo(ref.forgetting_curve(t, s), 6);
      expect(intervalFor(s, 0.9)).toBe(ref.next_interval(s, 0));
    }
    const ref85 = new FSRSAlgorithm(generatorParameters({ enable_fuzz: false, request_retention: 0.85 }));
    for (const s of [3, 20, 200]) expect(intervalFor(s, 0.85)).toBe(ref85.next_interval(s, 0));
  });
});

describe("fuzz and load balancing", () => {
  it("uses Anki's fuzz ranges", () => {
    expect(fuzzRange(2, 0, 36500)).toEqual({ lo: 2, hi: 3 });
    expect(fuzzRange(10, 0, 36500)).toEqual({ lo: 8, hi: 12 });
    expect(fuzzRange(100, 0, 36500)).toEqual({ lo: 93, hi: 107 });
    expect(fuzzRange(100, 99, 36500).lo).toBe(100); // never before the time already waited
    expect(fuzzRange(400, 0, 365).hi).toBe(365);
  });
  it("stays inside the range and is repeatable", () => {
    for (let i = 0; i < 200; i++) {
      const v = pickInterval(30, { seedKey: "c" + i });
      expect(v).toBeGreaterThanOrEqual(fuzzRange(30, 0, 36500).lo);
      expect(v).toBeLessThanOrEqual(fuzzRange(30, 0, 36500).hi);
      expect(pickInterval(30, { seedKey: "c" + i })).toBe(v);
    }
    expect(pickInterval(2, { seedKey: "x" })).toBe(2);
  });
  it("sends cards to the lighter days", () => {
    const now = new Date(2026, 9, 15, 12).getTime();
    let hits = 0;
    for (let i = 0; i < 300; i++) {
      const target = 31;
      const v = pickInterval(30, {
        seedKey: "q" + i, now,
        load: { dueOn: (day) => { const off = day - dayOf(now); return off === target ? 0 : 60; } },
      });
      if (v === target) hits++;
    }
    expect(hits).toBeGreaterThan(250);
  });
  it("respects easy days", () => {
    const now = new Date(2026, 9, 15, 12).getTime(); // a Thursday
    let sundays = 0;
    for (let i = 0; i < 300; i++) {
      const v = pickInterval(30, { seedKey: "e" + i, now, load: { dueOn: () => 10, easyDays: [1, 1, 1, 1, 1, 1, 0] } });
      if (new Date(now + v * 86400e3).getDay() === 0) sundays++;
    }
    expect(sundays).toBeLessThan(3);
  });
});

function dayOf(ts) {
  const d = new Date(ts - 4 * 3600e3);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400e3);
}
