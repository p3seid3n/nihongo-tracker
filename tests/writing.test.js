import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { pickWritingSet, wroteToday } from "../src/lib/writing.js";

async function makeStore() {
  const s = new Store(memoryBackend());
  await s.load();
  s.addDeck({ id: "k", name: "Kanji", kind: "kanji" }, {
    "k.1": { f: "日", r: "", m: "day", x: {}, o: 0 },
    "k.2": { f: "月", r: "", m: "moon", x: {}, o: 1 },
    "k.3": { f: "火", r: "", m: "fire", x: {}, o: 2 },
    "k.4": { f: "水", r: "", m: "water", x: {}, o: 3 },
  });
  s.addDeck({ id: "v", name: "Vocab", kind: "vocab" }, { "v.1": { f: "学生", r: "がくせい", m: "student", x: {}, o: 0 } });
  return s;
}

describe("writing set", () => {
  it("starts with the weakest started cards, then fills with new ones, kanji decks only", async () => {
    const s = await makeStore();
    const base = { st: 2, d: 5, due: Date.now(), last: Date.now() - 1000, reps: 3, lapses: 0, step: 0 };
    s.prog.k = { "k.2": { ...base, s: 30 }, "k.3": { ...base, s: 4 } };
    const set = pickWritingSet(s, 3);
    expect(set.map((x) => x.ch)).toEqual(["火", "月", "日"]);
  });
  it("skips suspended cards and multi-character or non-writable fronts", async () => {
    const s = await makeStore();
    s.prog.k = { "k.1": { st: 2, s: 1, d: 5, due: 0, last: 0, reps: 1, lapses: 0, step: 0, sus: 1 } };
    s.addDeck({ id: "x", name: "Other", kind: "kanji" }, { "x.1": { f: "ab", m: "latin", x: {}, o: 0 }, "x.2": { f: "山川", m: "two", x: {}, o: 1 } });
    const set = pickWritingSet(s, 10);
    expect(set.map((x) => x.ch)).toEqual(["月", "火", "水"]);
  });
  it("detects a writing session logged today", async () => {
    const s = await makeStore();
    expect(wroteToday(s)).toBe(false);
    s.logLesson("writing", 1, 60000);
    expect(wroteToday(s)).toBe(true);
  });
});
