import { describe, it, expect, beforeEach } from "vitest";
import { ledger, rankFor, RANKS, questsFor, progress, streakOf, newEvents, cardXp, comboBonus, resetSeen } from "../src/lib/game.js";
import { DAY, MIN } from "../src/lib/time.js";

const T = new Date(2026, 9, 20, 10, 0).getTime(); // a Tuesday, 10 am local
const monthOf = (ts) => { const d = new Date(ts - 4 * 3600e3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
function storeOf(rows, settings = {}) {
  const log = {};
  for (const r of rows) (log[monthOf(r[0])] = log[monthOf(r[0])] || []).push(r);
  return { log, settings: { xpGoal: 50, ...settings } };
}
const card = (ts, id, g, st = 2) => [ts, id, g, 4000, st, 3];

beforeEach(() => { resetSeen(); });

describe("experience", () => {
  it("pays for every answer, more for new and recall cards, little for repeats", () => {
    expect(cardXp(card(T, "a", 3), true)).toBe(3);
    expect(cardXp(card(T, "a", 1), true)).toBe(1);
    expect(cardXp(card(T, "a", 3, 0), true)).toBe(5);
    expect(cardXp(card(T, "a~p", 3), true)).toBe(5);
    expect(cardXp(card(T, "a", 4), false)).toBe(1);
  });
  it("adds combo bonuses and resets combos on a miss or a long pause", () => {
    const rows = [];
    for (let i = 0; i < 6; i++) rows.push(card(T + i * 10000, "c" + i, 3));
    rows.push(card(T + 70000, "x", 1));
    rows.push(card(T + 80000, "y", 3));
    rows.push(card(T + 80000 + 11 * MIN, "z", 3)); // after a break: a new combo
    const led = ledger(storeOf(rows));
    expect(led.maxCombo).toBe(6);
    // 6×3 + bonus(5)+bonus(6)=2, miss 1, two more 3s
    expect(led.total).toBe(18 + 2 + 1 + 3 + 3);
    expect(comboBonus(25)).toBe(3);
  });
  it("is the same whatever order synced rows arrive in", () => {
    const rows = [card(T, "a", 3), card(T + 1000, "b", 3), card(T + 2000, "a", 4), [T + 5000, "g.u1-wa", 4, 60000, 9, 0]];
    const a = ledger(storeOf(rows)), b = ledger(storeOf([...rows].reverse()));
    expect(a.total).toBe(b.total);
    expect(a.maxCombo).toBe(b.maxCombo);
  });
  it("ignores manual 'known' rows (grade 0)", () => {
    expect(ledger(storeOf([[T, "a", 0, 0, 0, 30]])).total).toBe(0);
  });
});

describe("ranks", () => {
  it("climbs kyū to dan", () => {
    expect(rankFor(0).rank.jp).toBe("十級");
    expect(rankFor(99).rank.jp).toBe("十級");
    expect(rankFor(100).rank.jp).toBe("九級");
    expect(rankFor(4000).rank.jp).toBe("初段");
    expect(rankFor(1e9).rank.jp).toBe("十段");
    expect(rankFor(1e9).progress).toBe(1);
    const r = rankFor(175);
    expect(r.into).toBe(75); expect(r.span).toBe(150);
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].xp).toBeGreaterThan(RANKS[i - 1].xp);
  });
});

describe("streaks", () => {
  it("counts yesterday while today is still open", () => {
    const rows = [card(T - 2 * DAY, "a", 3), card(T - DAY, "b", 3)];
    const s = streakOf(ledger(storeOf(rows)), T);
    expect(s.current).toBe(2); expect(s.today).toBe(false);
    const s2 = streakOf(ledger(storeOf([...rows, card(T, "c", 3)])), T);
    expect(s2.current).toBe(3); expect(s2.best).toBe(3);
  });
  it("uses the 4 am rollover", () => {
    const late = new Date(2026, 9, 20, 2, 0).getTime(); // 2 am belongs to the 19th
    const s = streakOf(ledger(storeOf([card(late, "a", 3)])), new Date(2026, 9, 20, 3, 0).getTime());
    expect(s.today).toBe(true);
  });
});

describe("quests", () => {
  it("are three, the same all day, and track progress", () => {
    const empty = ledger(storeOf([]));
    const q1 = questsFor(empty, T), q2 = questsFor(empty, T + 5 * 3600e3);
    expect(q1.length).toBe(3);
    expect(q1.map((q) => q.title)).toEqual(q2.map((q) => q.title));
    expect(q1[0].kind).toBe("cards");
    const rows = []; for (let i = 0; i < 40; i++) rows.push(card(T + i * 1000, "k" + i, 3));
    const q3 = questsFor(ledger(storeOf(rows)), T + 60000);
    expect(q3[0].done).toBe(true);
  });
  it("change from day to day and skip what you cannot do", () => {
    const empty = ledger(storeOf([]));
    const seen = new Set();
    for (let d = 0; d < 14; d++) seen.add(questsFor(empty, T + d * DAY).map((q) => q.kind).join());
    expect(seen.size).toBeGreaterThan(3);
    for (let d = 0; d < 14; d++) expect(questsFor(empty, T + d * DAY, { avail: { write: false, reading: false } }).some((q) => q.kind === "write" || q.kind === "read")).toBe(false);
  });
});

describe("progress and celebrations", () => {
  it("adds quest rewards and reports the goal", () => {
    const rows = []; for (let i = 0; i < 40; i++) rows.push(card(T + i * 1000, "k" + i, 3));
    const p = progress(storeOf(rows), T + 60000);
    expect(p.today).toBeGreaterThan(120);
    expect(p.goalMet).toBe(true);
    expect(p.xp).toBe(p.today);
    expect(p.badges.find((b) => b.id === "first").got).toBe(true);
    expect(p.badges.find((b) => b.id === "combo25").got).toBe(true);
  });
  it("celebrates only what is new, never on first run", () => {
    const store = storeOf([card(T, "a", 3)]);
    const first = newEvents(progress(store, T), T);
    expect(first.rankUp).toBe(null); expect(first.badges.length).toBe(0);
    for (let i = 0; i < 60; i++) store.log[monthOf(T)].push(card(T + 1000 + i * 1000, "n" + i, 3, 0));
    const ev = newEvents(progress(store, T + 70000), T + 70000);
    expect(ev.rankUp).not.toBe(null);
    expect(ev.goal).toBe(true);
    expect(ev.badges.map((b) => b.id)).toContain("combo25");
    const again = newEvents(progress(store, T + 70000), T + 70000);
    expect(again.rankUp).toBe(null); expect(again.badges.length).toBe(0); expect(again.goal).toBe(false);
  });
});

describe("the cached ledger", () => {
  it("folds in new answers and matches a full rebuild, and rebuilds after an undo or an older synced row", async () => {
    const { ledgerCached } = await import("../src/lib/game.js");
    const store = storeOf([card(T, "a", 3)]);
    const m = monthOf(T);
    expect(ledgerCached(store).total).toBe(ledger(store).total);
    for (let i = 0; i < 12; i++) { store.log[m].push(card(T + 1000 * (i + 1), "b" + i, i % 5 ? 3 : 1)); expect(ledgerCached(store).total).toBe(ledger(store).total); }
    store.log[m].pop();
    expect(ledgerCached(store).total).toBe(ledger(store).total);
    store.log[m].push(card(T - 5000, "old", 4)); // synced from another device, earlier than the rest
    const a = ledgerCached(store), b = ledger(store);
    expect(a.total).toBe(b.total); expect(a.maxCombo).toBe(b.maxCombo);
  });
});
