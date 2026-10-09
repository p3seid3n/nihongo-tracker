import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { sentenceExercises } from "../src/lib/exercises.js";
import { mulberry32 } from "../src/content/generators.js";
import { REVIEW } from "../src/lib/fsrs.js";

const DAY = 86400000;

describe("sentenceExercises", () => {
  const pool = Array.from({ length: 10 }, (_, i) => ({ id: "c" + i, jp: `文${i}[ぶん]`, en: `Sentence ${i}`, word: "w" + i, r: i / 10 }));
  it("builds answerable choose exercises with one correct option", () => {
    const list = sentenceExercises(pool, mulberry32(1), 6);
    expect(list.length).toBe(6);
    for (const ex of list) {
      expect(ex.kind).toBe("choose");
      expect(ex.options.filter((o) => o.correct).length).toBe(1);
      expect(new Set(ex.options.map((o) => o.text)).size).toBe(ex.options.length);
    }
  });
  it("returns nothing when there are too few sentences", () => {
    expect(sentenceExercises(pool.slice(0, 3), mulberry32(1))).toEqual([]);
  });
});

describe("markKnown extra mode", () => {
  it("marks N additional cards without counting already-started ones", async () => {
    const s = new Store(memoryBackend(), { autosave: false });
    await s.load();
    const content = {};
    for (let i = 0; i < 30; i++) content[`d1.${i}`] = { f: "字" + i, r: "", m: "m" + i, x: {}, o: i };
    s.addDeck({ id: "d1", name: "D", kind: "kanji" }, content);
    s.markKnown("d1", 5);
    s.markKnown("d1", 7, { extra: true });
    const started = Object.values(s.prog.d1).filter((r) => r.st === REVIEW).length;
    expect(started).toBe(12);
  });
  it("skips suspended new cards", async () => {
    const s = new Store(memoryBackend(), { autosave: false });
    await s.load();
    const content = {};
    for (let i = 0; i < 10; i++) content[`d1.${i}`] = { f: "字" + i, r: "", m: "m", x: {}, o: i };
    s.addDeck({ id: "d1", name: "D", kind: "kanji" }, content);
    s.toggleSuspend("d1.0");
    s.markKnown("d1", 3, { extra: true });
    expect(s.prog.d1["d1.0"].sus).toBe(1);
    expect(s.prog.d1["d1.0"].st).not.toBe(REVIEW);
    expect(Object.values(s.prog.d1).filter((r) => r.st === REVIEW).length).toBe(3);
    void DAY;
  });
});
