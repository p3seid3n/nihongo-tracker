import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { buildCounts, buildSession, todayCounts } from "../src/lib/queue.js";
import { DAY, MIN, addDays } from "../src/lib/time.js";
import { mergeSlice, mergeLog, mergeLWWMap } from "../src/lib/merge.js";

const NOW = new Date(2026, 9, 9, 15, 0, 0).getTime();

async function fresh() {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  s.updateSettings({ onboarded: true });
  return s;
}
function deckOf20(s, id = "d1", kind = "vocab", n = 20) {
  const content = {};
  for (let i = 0; i < n; i++) content[`${id}.${i}`] = { f: `w${i}`, r: "r", m: "m", o: i };
  s.addDeck({ id, name: id, kind }, content);
}

describe("store + queue", () => {
  it("respects the daily new-card limit and counts new reviews done today", async () => {
    const s = await fresh();
    deckOf20(s);
    s.updateSettings({ newPerDay: { kana: 5, kanji: 5, vocab: 5, generic: 5 } });
    let c = buildCounts(s, NOW);
    expect(c.new).toBe(5);
    const sess = buildSession(s, NOW);
    expect(sess.main.length).toBe(5);
    s.reviewCard(sess.main[0], 3, 3000, NOW);
    c = buildCounts(s, NOW + 1000);
    expect(c.new).toBe(4);
    expect(todayCounts(s, NOW + 1000).total).toBe(1);
  });

  it("extra new cards raise the limit", async () => {
    const s = await fresh();
    deckOf20(s);
    s.updateSettings({ newPerDay: { kana: 5, kanji: 5, vocab: 5, generic: 5 } });
    expect(buildCounts(s, NOW, { extraNew: 5 }).new).toBe(10);
  });

  it("learning card reappears after Again within learn-ahead; review card appears on its due day", async () => {
    const s = await fresh();
    deckOf20(s, "d1", "vocab", 3);
    const e = s.reviewCard("d1.0", 1, 1000, NOW);
    const sess = buildSession(s, NOW + MIN);
    expect(sess.learning).toContain("d1.0");
    const g = s.reviewCard("d1.1", 4, 1000, NOW);
    expect(buildCounts(s, NOW).review).toBe(0);
    const later = buildCounts(s, g.next.due + 1000);
    expect(later.review).toBe(1);
  });

  it("review cap limits reviews and reports overflow; extraReviews lifts it", async () => {
    const s = await fresh();
    deckOf20(s, "d1", "vocab", 10);
    s.updateSettings({ maxReviews: 4 });
    s.markKnown("d1", 10, { now: NOW - 30 * DAY, spreadDays: 1 });
    const c = buildCounts(s, NOW);
    expect(c.review).toBe(4);
    expect(c.overflow).toBe(6);
    expect(buildCounts(s, NOW, { extraReviews: true }).review).toBe(10);
  });

  it("markKnown spreads due dates and keeps new cards after them", async () => {
    const s = await fresh();
    deckOf20(s, "d1", "kanji", 20);
    s.markKnown("d1", 12, { now: NOW });
    const dueNow = buildCounts(s, NOW);
    expect(dueNow.review).toBe(2); // k = 0 for indices 0 and 10
    const week = buildCounts(s, addDays(NOW, 9) + 3600000);
    expect(week.review).toBe(12);
    const sess = buildSession(s, NOW);
    expect(sess.main.filter((id) => !s.rec(id)).length).toBe(8); // 20 cards - 12 known, capped by default 8 new/day for kanji
    expect(sess.main.filter((id) => s.rec(id)).length).toBe(2);
  });

  it("suspended cards are skipped", async () => {
    const s = await fresh();
    deckOf20(s, "d1", "vocab", 3);
    s.toggleSuspend("d1.0");
    expect(buildSession(s, NOW).main).not.toContain("d1.0");
  });

  it("undo restores the previous state and voids the log row", async () => {
    const s = await fresh();
    deckOf20(s, "d1", "vocab", 3);
    const e = s.reviewCard("d1.0", 4, 1000, NOW);
    s.undoReview(e, NOW + 1);
    expect(s.rec("d1.0").st).toBe(0);
    expect(todayCounts(s, NOW + 2).total).toBe(0);
    expect(buildCounts(s, NOW + 2).new).toBe(3);
  });

  it("deleting a deck removes it from decks list and queue", async () => {
    const s = await fresh();
    deckOf20(s, "d1", "vocab", 3);
    s.deleteDeck("d1");
    expect(s.deckList().length).toBe(0);
    expect(buildCounts(s, NOW).new).toBe(0);
  });

  it("persists and reloads through the backend", async () => {
    const b = memoryBackend();
    const s = new Store(b, { autosave: false });
    await s.load();
    deckOf20(s, "d1", "vocab", 3);
    s.reviewCard("d1.0", 3, 500, NOW);
    await s.flush();
    const s2 = new Store(b, { autosave: false });
    await s2.load();
    expect(s2.deckList().length).toBe(1);
    expect(s2.rec("d1.0").st).toBe(1);
    expect(s2.cardIds("d1").length).toBe(3);
    expect(s2.logRows().length).toBe(1);
  });

  it("tracks setting hides decks of disabled tracks", async () => {
    const s = await fresh();
    deckOf20(s, "k", "kanji", 5);
    s.updateSettings({ tracks: { kana: true, kanji: false, vocab: true, grammar: true } });
    expect(buildCounts(s, NOW).new).toBe(0);
  });
});

describe("merge", () => {
  it("LWW map picks newest per card and is commutative", () => {
    const a = { x: { u: 5, v: "a" }, y: { u: 1, v: "a" } };
    const b = { x: { u: 3, v: "b" }, y: { u: 9, v: "b" }, z: { u: 2, v: "b" } };
    const ab = mergeLWWMap(a, b), ba = mergeLWWMap(b, a);
    expect(ab).toEqual(ba);
    expect(ab.x.v).toBe("a"); expect(ab.y.v).toBe("b"); expect(ab.z.v).toBe("b");
  });
  it("log union dedupes and voided rows win", () => {
    const l = [[1, "c", 3, 10, 0, 1]], r = [[1, "c", 0, 0, 0, 0], [2, "c", 3, 10, 1, 2]];
    const m = mergeLog(l, r);
    expect(m.length).toBe(2);
    expect(m[0][2]).toBe(0);
    expect(mergeLog(r, l)).toEqual(m);
  });
  it("settings: newest wins", () => {
    expect(mergeSlice("settings", { u: 1, a: 1 }, { u: 2, a: 2 }).a).toBe(2);
  });
});
