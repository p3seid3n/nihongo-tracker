import { describe, it, expect } from "vitest";
import { Store, memoryBackend, parseSteps } from "../src/lib/store.js";
import { buildCounts, buildSession, todayCounts } from "../src/lib/queue.js";
import { prodId } from "../src/lib/ids.js";
import { REVIEW, LEARNING } from "../src/lib/fsrs.js";
import { DAY, MIN, dayIndex } from "../src/lib/time.js";

const NOW = new Date(2026, 9, 15, 15, 0, 0).getTime();
async function fresh(settings = {}) {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  s.updateSettings({ onboarded: true, tracks: { kana: false, kanji: false, vocab: true, grammar: false }, ...settings });
  for (const id of Object.keys(s.decks)) s.updateDeck(id, { enabled: false });
  return s;
}
function deck(s, n) {
  const content = {};
  for (let i = 0; i < n; i++) content[`v.w${i}`] = { f: `語${i}`, r: "ご", m: `word ${i}`, o: i };
  s.addDeck({ id: "v", name: "Words", kind: "vocab" }, content);
  return Object.keys(content);
}

describe("effort meter", () => {
  it("charges each card once a day, however many learning steps it takes", async () => {
    const s = await fresh({ newPerDay: { vocab: 10, kana: 0, kanji: 0, generic: 0 }, autoThrottle: false });
    deck(s, 10);
    const before = buildCounts(s, NOW);
    const total = before.effort.spent + before.effort.planned;
    expect(total).toBe(20); // ten new cards at 2 points
    // study through a session with Again, Good, Good on the first card and Good on others
    const sess = buildSession(s, NOW);
    let t = NOW;
    const first = sess.main[0];
    s.reviewCard(first, 1, 1000, (t += MIN));
    s.reviewCard(first, 3, 1000, (t += 2 * MIN));
    let mid = buildCounts(s, t);
    expect(mid.effort.spent + mid.effort.planned).toBe(total);
    s.reviewCard(first, 3, 1000, (t += 11 * MIN));
    for (const id of sess.main.slice(1, 5)) s.reviewCard(id, 3, 1000, (t += MIN));
    mid = buildCounts(s, t);
    expect(mid.effort.spent + mid.effort.planned).toBe(total);
    expect(todayCounts(s, t).effort).toBe(10); // five cards started, two points each
  });
  it("a learning card from yesterday costs one point today", async () => {
    const s = await fresh({ newPerDay: { vocab: 0, kana: 0, kanji: 0, generic: 0 } });
    const ids = deck(s, 2);
    s.prog.v = { [ids[0]]: { st: LEARNING, s: 1, d: 5, due: NOW - 60 * MIN, last: NOW - DAY, reps: 1, lapses: 0, step: 1 } };
    const c = buildCounts(s, NOW);
    expect(c.effort.planned).toBe(1);
  });
});

describe("siblings", () => {
  it("keep a word's recall card away on a day its recognition card is due", async () => {
    const s = await fresh({ newPerDay: { vocab: 0, kana: 0, kanji: 0, generic: 0 }, recall: true });
    const ids = deck(s, 3);
    s.prog.v = {};
    for (const id of ids) {
      s.prog.v[id] = { st: REVIEW, s: 30, d: 5, due: NOW - DAY, last: NOW - 31 * DAY, reps: 4, lapses: 0, step: 0 };
      s.prog.v[prodId(id)] = { st: REVIEW, s: 10, d: 5, due: NOW - DAY, last: NOW - 11 * DAY, reps: 2, lapses: 0, step: 0 };
    }
    const c = buildCounts(s, NOW);
    expect(c.review).toBe(3);
    expect(c.prodReview).toBe(0);
    s.updateSettings({ burySiblings: false });
    expect(buildCounts(s, NOW).prodReview).toBe(3);
  });
});

describe("Anki-style settings", () => {
  it("reads learning steps like Anki", () => {
    expect(parseSteps("1m 10m")).toEqual([MIN, 10 * MIN]);
    expect(parseSteps("30s 1h 1d")).toEqual([30000, 60 * MIN, DAY]);
    expect(parseSteps("")).toEqual([]);
    expect(parseSteps("abc", [5])).toEqual([5]);
    expect(parseSteps("10", [5])).toEqual([10 * MIN]);
  });
  it("caps intervals at the maximum interval", async () => {
    const s = await fresh({ maxInterval: 30 });
    const ids = deck(s, 1);
    s.prog.v = { [ids[0]]: { st: REVIEW, s: 400, d: 3, due: NOW, last: NOW - 300 * DAY, reps: 9, lapses: 0, step: 0 } };
    const e = s.reviewCard(ids[0], 4, 1000, NOW);
    expect(dayIndex(e.next.due) - dayIndex(NOW)).toBeLessThanOrEqual(30);
  });
  it("load balancing keeps the due counts it uses up to date", async () => {
    const s = await fresh();
    const ids = deck(s, 40);
    s.prog.v = {};
    ids.forEach((id) => { s.prog.v[id] = { st: REVIEW, s: 20, d: 5, due: NOW, last: NOW - 20 * DAY, reps: 3, lapses: 0, step: 0 }; });
    const today = dayIndex(NOW);
    expect(s.dueOn(today)).toBe(40);
    const e = s.reviewCard(ids[0], 3, 1000, NOW);
    expect(s.dueOn(today)).toBe(39);
    expect(s.dueOn(dayIndex(e.next.due))).toBe(1);
    s.undoReview(e);
    expect(s.dueOn(today)).toBe(40);
  });
});
