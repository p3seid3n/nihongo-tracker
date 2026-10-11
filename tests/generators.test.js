import { describe, it, expect } from "vitest";
import { generate, GENERATOR_NAMES, mulberry32 } from "../src/content/generators.js";
import { plainOf } from "../src/lib/jp.js";
import { BY_ID } from "../src/content/bank.js";
import { LESSON_BY_ID } from "../src/content/lessons.js";
import { buildLessonExercises } from "../src/lib/exercises.js";

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

  describe("sentence sense (4.7 audit)", () => {
    const ctx = () => ({ rng: mulberry32(11), weight: () => 1 });
    it("never adds a time word that contradicts the forms a lesson teaches", () => {
      const c = ctx();
      for (let i = 0; i < 400; i++) {
        const present = generate("obj-verb:plain:aff", c);
        expect(present.form).toBe("aff");
        expect(present.tokens.join("")).not.toMatch(/昨日/);
        const past = generate("obj-verb:plain:past,pastneg", c);
        expect(["past", "pastneg"]).toContain(past.form);
        expect(past.tokens.join("")).not.toMatch(/今日|明日|毎日/);
        expect(past.en).not.toMatch(/\b(today|tomorrow|every day)\b/);
      }
    });
    it("buys only things you can buy and makes only dishes", () => {
      const c = ctx();
      let bought = 0, made = 0;
      for (let i = 0; i < 600; i++) {
        const g = generate("obj-verb:polite", c);
        const [, o, v] = g.words;
        if (v === "kau") { bought++; expect(BY_ID[o].tags).toContain("buy"); }
        if (v === "tsukuru") { made++; expect(BY_ID[o].tags).toContain("dish"); }
      }
      expect(bought).toBeGreaterThan(10);
      expect(made).toBeGreaterThan(10);
    });
    it("keeps wake up, sleep and to be out of the passive drills", () => {
      const lesson = LESSON_BY_ID["u3-passive"];
      const c = ctx();
      let passive = 0;
      for (let i = 0; i < 80; i++) {
        for (const ex of buildLessonExercises(lesson, c, { max: 14 })) {
          if (!/passive/i.test(ex.instruction || "")) continue;
          passive++;
          expect(ex.words || []).not.toContain("iru");
          expect(ex.words || []).not.toContain("okiru");
          expect(ex.words || []).not.toContain("neru");
        }
      }
      expect(passive).toBeGreaterThan(20);
    });
  });
});
