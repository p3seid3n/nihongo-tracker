import { describe, it, expect } from "vitest";
import { PATTERNS, inkFlowPattern, ticksFor, patternLength } from "../src/lib/haptics.js";

describe("haptic patterns", () => {
  it("are valid Vibration API patterns", () => {
    for (const [name, p] of Object.entries(PATTERNS)) {
      expect(Array.isArray(p), name).toBe(true);
      expect(p.length, name).toBeGreaterThan(0);
      expect(p.every((n) => Number.isInteger(n) && n > 0), name).toBe(true);
      expect(p.length % 2, `${name} should end on a pulse`).toBe(1);
      expect(patternLength(p), `${name} stays short`).toBeLessThan(1400);
    }
  });
  it("gives each grade its own feel", () => {
    const keys = ["again", "hard", "good", "easy"];
    const seen = new Set(keys.map((k) => JSON.stringify(PATTERNS[k])));
    expect(seen.size).toBe(4);
    // again is the heaviest, easy builds up
    expect(Math.max(...PATTERNS.again.filter((_, i) => i % 2 === 0))).toBeGreaterThan(Math.max(...PATTERNS.good.filter((_, i) => i % 2 === 0)));
    const easyPulses = PATTERNS.easy.filter((_, i) => i % 2 === 0);
    expect(easyPulses).toEqual([...easyPulses].sort((a, b) => a - b));
  });
  it("switching on rises and switching off falls", () => {
    const on = PATTERNS.toggleOn.filter((_, i) => i % 2 === 0);
    const off = PATTERNS.toggleOff.filter((_, i) => i % 2 === 0);
    expect(on[on.length - 1]).toBeGreaterThan(on[0]);
    expect(off[off.length - 1]).toBeLessThan(off[0]);
  });
  it("ink flow is rapid first and slow at the end, then a thump", () => {
    const p = inkFlowPattern();
    const gaps = p.filter((_, i) => i % 2 === 1);
    expect(gaps.length).toBeGreaterThan(8);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
    expect(gaps[gaps.length - 1]).toBeGreaterThan(gaps[0] * 4);
    expect(p[p.length - 1]).toBeGreaterThanOrEqual(30); // the thump
    expect(patternLength(p)).toBeLessThan(1100);
  });
});

describe("iPhone ticks", () => {
  it("turns pulses into ordered, spaced ticks", () => {
    for (const [name, p] of Object.entries(PATTERNS)) {
      const t = ticksFor(p);
      expect(t.length, name).toBeGreaterThan(0);
      expect(t.length, name).toBeLessThanOrEqual(14);
      expect([...t].sort((a, b) => a - b), name).toEqual(t);
      expect(t[0], name).toBe(0);
    }
  });
  it("makes thuds heavier than taps", () => {
    expect(ticksFor([8]).length).toBe(1);
    expect(ticksFor([40]).length).toBe(2);
    expect(ticksFor(PATTERNS.again).length).toBeGreaterThan(ticksFor(PATTERNS.good).length);
  });
  it("drops ticks that would blur together", () => {
    const t = ticksFor([6, 10, 6, 10, 6, 10, 6]);
    for (let i = 1; i < t.length; i++) expect(t[i] - t[i - 1]).toBeGreaterThanOrEqual(30);
  });
});
