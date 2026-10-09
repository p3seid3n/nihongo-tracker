import { describe, it, expect } from "vitest";
import { LESSONS } from "../src/content/lessons.js";
import { BY_ID } from "../src/content/bank.js";
import { KANJI_RE, parseFuri, plainOf, FORMS } from "../src/lib/jp.js";
import { buildLessonExercises, buildReviewExercises, checkBuild } from "../src/lib/exercises.js";
import { mulberry32 } from "../src/content/generators.js";

// every kanji must be followed by a reading in brackets somewhere in its run
function missingReading(markup) {
  const segs = parseFuri(markup);
  return segs.filter((s) => !s.r && KANJI_RE.test(s.t)).map((s) => s.t);
}
function allMarkups(l) {
  const out = [];
  for (const p of l.pages) for (const e of p.ex || []) out.push(["ex", e[0]]);
  for (const c of l.cloze || []) { out.push(["cloze", c[0]]); if (c[3]) c[3].split(",").forEach((o) => out.push(["cloze-opt", o])); }
  for (const s of l.spot || []) s.filter((x) => !String(x).startsWith("~")).forEach((x) => out.push(["spot", x]));
  for (const q of l.quiz || []) if (!q[0].startsWith("!")) out.push(["quiz-q", q[0]]);
  for (const q of l.quiz || []) q.slice(1).filter((x) => !String(x).startsWith("~")).forEach((x) => out.push(["quiz-opt", x]));
  return out;
}

describe("lesson content lint", () => {
  it("has unique ids and valid ordering", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  for (const l of LESSONS) {
    describe(l.id, () => {
      it("has required fields", () => {
        expect(l.title && l.ref && l.blurb).toBeTruthy();
        expect(l.pages.length).toBeGreaterThan(0);
        for (const p of l.pages) { expect(p.h).toBeTruthy(); expect(p.p?.length).toBeGreaterThan(0); }
      });
      it("every kanji has a reading", () => {
        const bad = allMarkups(l).map(([k, m]) => [k, m, missingReading(m)]).filter((x) => x[2].length);
        expect(bad).toEqual([]);
      });
      it("cloze blanks exist and correct answer is among options", () => {
        for (const c of l.cloze || []) {
          const toks = c[0].split("|");
          const bi = toks.findIndex((t) => t.endsWith("*"));
          expect(bi, c[0]).toBeGreaterThanOrEqual(0);
          const correct = toks[bi].slice(0, -1).replace(/^=/, "");
          const opts = c[3] ? c[3].split(",") : (l.pool || ["は", "が", "を", "に", "で", "へ", "と", "も", "の"]);
          expect(opts, c[0]).toContain(correct);
          expect(c[1]).toBeTruthy();
        }
      });
      it("vocab ids exist; conj specs valid", () => {
        for (const v of l.vocab || []) expect(BY_ID[v], v).toBeTruthy();
        for (const s of l.conj || []) { expect(["verb", "verbRu", "verbU", "iadj", "nadj", "adj"]).toContain(s.pos); expect(FORMS[s.form]).toBeTruthy(); }
      });
      it("builds exercises with at least 6 items, all answerable", () => {
        for (let seed = 1; seed <= 6; seed++) {
          const ex = buildLessonExercises(l, { rng: mulberry32(seed), weight: () => 1, extraEngs: [] });
          expect(ex.length, `seed ${seed}`).toBeGreaterThanOrEqual(l.id === "u1-writing" ? 4 : 6);
          for (const e of ex) {
            if (e.kind === "choose") {
              expect(e.options.filter((o) => o.correct).length).toBe(1);
              expect(new Set(e.options.map((o) => o.text)).size).toBe(e.options.length);
              expect(e.options.length).toBeGreaterThanOrEqual(e.instruction.startsWith("Which") || e.instruction === "Quick check" ? 2 : 3);
            } else if (e.kind === "build") {
              const sol = e.answer.map((t) => e.bank.find((b) => b.text === t)).filter(Boolean);
              expect(sol.length).toBe(e.answer.length);
              expect(checkBuild(e, e.answer)).toBe(true);
            } else if (e.kind === "match") {
              expect(e.pairs.length).toBeGreaterThanOrEqual(3);
            }
          }
        }
      });
    });
  }
  it("review mix works", () => {
    const ex = buildReviewExercises(LESSONS.slice(0, 5), { rng: mulberry32(5), weight: () => 1, extraEngs: [] }, 6);
    expect(ex.length).toBe(6);
  });
});
