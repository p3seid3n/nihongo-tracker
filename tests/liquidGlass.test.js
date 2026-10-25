import { describe, it, expect } from "vitest";
import { refractionProfile, supportsRefraction } from "../src/lib/liquidGlass.js";

describe("liquid glass optics", () => {
  it("bends light most at the outer rim and not at all on the flat top", () => {
    const p = refractionProfile(64);
    expect(Math.max(...p)).toBeCloseTo(1, 5);
    expect(p[0]).toBeGreaterThan(0.9);
    expect(p[63]).toBeLessThan(0.05);
    let rises = 0;
    for (let i = 1; i < p.length; i++) if (p[i] > p[i - 1] + 1e-6) rises++;
    expect(rises).toBeLessThan(3); // falls off towards the middle
    for (const v of p) expect(Number.isFinite(v) && v >= 0 && v <= 1).toBe(true);
  });
  it("only claims refraction where it can render it", () => {
    expect(supportsRefraction()).toBe(false); // no browser here
  });
});
