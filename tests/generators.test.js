import { describe, it, expect } from "vitest";
import { generate, GENERATOR_NAMES, mulberry32 } from "../src/content/generators.js";
import { plainOf } from "../src/lib/jp.js";

describe("generators", () => {
  for (const name of GENERATOR_NAMES) {
    for (const style of ["polite", "plain"]) {
      it(`${name}:${style} produces well-formed sentences`, () => {
        const ctx = { rng: mulberry32(7), weight: () => 1 };
        const seen = new Set();
        for (let i = 0; i < 80; i++) {
          const g = generate(`${name}:${style}`, ctx);
          expect(g.tokens.every((t) => typeof t === "string" && t.length > 0)).toBe(true);
          expect(g.tokens.join("")).not.toMatch(/undefined|null|NaN/);
          expect(g.en).toMatch(/^[A-Z].*\.$/);
          expect(g.en).not.toMatch(/undefined|null|NaN|  /);
          expect(g.others.length).toBe(3);
          seen.add(plainOf(g.tokens.join("")) + g.en);
        }
        expect(seen.size).toBeGreaterThan(20);
      });
    }
  }
  it("prints samples", () => {
    const ctx = { rng: mulberry32(3), weight: () => 1 };
    for (const name of GENERATOR_NAMES) for (let i = 0; i < 3; i++) {
      const g = generate(`${name}:${i === 2 ? "plain" : "polite"}`, ctx);
      console.log(name.padEnd(9), g.tokens.map(plainOf).join(" "), "|", g.en);
    }
  });
});
