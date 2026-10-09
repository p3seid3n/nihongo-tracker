import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { computeStats } from "../src/lib/stats.js";
import { makeWeight, knownKanjiSet, sentencePool } from "../src/lib/personal.js";
import { todayCounts } from "../src/lib/queue.js";
import { DAY } from "../src/lib/time.js";

const NOW = new Date(2026, 9, 9, 15, 0, 0).getTime();
async function fresh() { const s = new Store(memoryBackend(), { autosave: false }); await s.load(); return s; }

describe("stats", () => {
  it("counts streaks, retention, forecast and grammar", async () => {
    const s = await fresh();
    const content = {};
    for (let i = 0; i < 40; i++) content[`d1.${i}`] = { f: i % 2 ? "日" : "月" + i, r: "", m: "m" + i, o: i, x: { sent: "私は学生です", sentF: "私[わたし]は学生[がくせい]です", sentE: "I am a student." } };
    s.addDeck({ id: "d1", name: "Deck", kind: "kanji" }, content);
    for (let day = 0; day < 5; day++) {
      const t = NOW - (4 - day) * DAY;
      for (let i = 0; i < 10; i++) s.reviewCard(`d1.${day * 5 + (i % 5)}`, i === 0 ? 1 : 3, 4000, t + i * 60000);
    }
    s.logLesson("u1-desu", 1, 120000, NOW);
    s.recordLesson("u1-desu", 0.9, { first: true, now: NOW });
    const st = computeStats(s, NOW + 1000);
    expect(st.streak.current).toBe(5);
    expect(st.totals.cards).toBe(40);
    expect(st.lessonsDone).toBe(1);
    expect(st.activity.at(-1).n).toBeGreaterThan(0);
    expect(st.forecast.length).toBe(30);
    expect(st.totalMs).toBeGreaterThan(0);
    expect(todayCounts(s, NOW + 1000).lessons).toBe(1);
    expect(todayCounts(s, NOW + 1000).total).toBe(10);
  });
  it("knownKanji uses graduated kanji cards", async () => {
    const s = await fresh();
    s.addDeck({ id: "k", name: "K", kind: "kanji" }, { "k.0": { f: "日", m: "day", o: 0 }, "k.1": { f: "月", m: "moon", o: 1 } });
    s.reviewCard("k.0", 4, 1000, NOW);
    const set = knownKanjiSet(s);
    expect(set.has("日")).toBe(true);
    expect(set.has("月")).toBe(false);
  });
  it("makeWeight favours shaky words and sentencePool picks seen sentences", async () => {
    const s = await fresh();
    s.addDeck({ id: "v", name: "V", kind: "vocab" }, { "v.0": { f: "食べる", r: "たべる", m: "eat", o: 0, x: { sent: "魚を食べる", sentE: "I eat fish." } }, "v.1": { f: "飲む", r: "のむ", m: "drink", o: 1 } });
    s.reviewCard("v.0", 1, 1000, NOW);
    const w = makeWeight(s, NOW + 1000);
    expect(w("taberu")).toBe(3);
    expect(w("nomu")).toBe(0.5);
    expect(w("inu")).toBe(1);
    expect(sentencePool(s, NOW).length).toBe(1);
  });
});
