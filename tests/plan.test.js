import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { grammarInterval, grammarGate, lastLearnedAt, doneToday, buildPlan, slotsFor, availability, weekStrip, EARLY_LESSONS } from "../src/lib/plan.js";
import { LESSONS } from "../src/content/lessons.js";
import { dayIndex, DAY } from "../src/lib/time.js";

const FRI = new Date(2026, 9, 9, 15, 0, 0).getTime(); // Friday 9 October 2026
async function fresh(settings = {}) {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  s.updateSettings({ onboarded: true, ...settings });
  return s;
}
const learn = (s, i, t) => s.recordLesson(LESSONS[i].id, 0.9, { first: true, now: t });
const counts = (o = {}) => ({ total: 12, review: 8, new: 4, learn: 0, deferred: 0, today: { total: 0 }, ...o });
const inputs = (o = {}) => ({ counts: counts(), lessonsDue: 0, poolSize: 10, writeSet: [{ ch: "日" }, { ch: "月" }], pitchCount: 8, ...o });

describe("grammar pace", () => {
  it("opens a new lesson about once a week, faster for the first easy ones", () => {
    expect(grammarInterval({}, EARLY_LESSONS)).toBe(7);
    expect(grammarInterval({}, 0)).toBe(2);
    expect(grammarInterval({ grammarEvery: 9 }, 3)).toBe(3);
    expect(grammarInterval({ grammarEvery: 9 }, 20)).toBe(9);
  });
  it("can turn the early speed-up off, and clamps nonsense", () => {
    expect(grammarInterval({ grammarEarlyFast: false }, 0)).toBe(7);
    expect(grammarInterval({ grammarEvery: 0 }, 30)).toBe(1);
    expect(grammarInterval({ grammarEvery: 500 }, 30)).toBe(21);
    expect(grammarInterval({ grammarEvery: "x" }, 30)).toBe(7);
    expect(grammarInterval({ grammarEvery: 1 }, 0)).toBe(1);
  });
});

describe("grammar gate", () => {
  it("is open for a brand new learner", async () => {
    const s = await fresh();
    const g = grammarGate(s, FRI);
    expect(g.open).toBe(true);
    expect(g.next.id).toBe(LESSONS[0].id);
  });
  it("closes after a lesson and reopens after the early interval", async () => {
    const s = await fresh();
    learn(s, 0, FRI);
    expect(grammarGate(s, FRI).open).toBe(false);
    expect(grammarGate(s, FRI).daysLeft).toBe(2);
    expect(grammarGate(s, FRI + DAY).daysLeft).toBe(1);
    expect(grammarGate(s, FRI + 2 * DAY).open).toBe(true);
  });
  it("waits a full week once the easy lessons are done", async () => {
    const s = await fresh();
    for (let i = 0; i < EARLY_LESSONS; i++) learn(s, i, FRI - (40 - i) * DAY);
    const t = FRI - 20 * DAY;
    learn(s, EARLY_LESSONS, t);
    expect(grammarGate(s, t + 6 * DAY).open).toBe(false);
    expect(grammarGate(s, t + 6 * DAY).daysLeft).toBe(1);
    expect(grammarGate(s, t + 7 * DAY).open).toBe(true);
  });
  it("follows the pace setting", async () => {
    const s = await fresh({ grammarEvery: 3, grammarEarlyFast: false });
    learn(s, 0, FRI);
    expect(grammarGate(s, FRI + 2 * DAY).open).toBe(false);
    expect(grammarGate(s, FRI + 3 * DAY).open).toBe(true);
  });
  it("ignores lessons marked as already known", async () => {
    const s = await fresh();
    s.markLessonsDone([LESSONS[0].id, LESSONS[1].id], FRI);
    expect(lastLearnedAt(s)).toBe(0);
    const g = grammarGate(s, FRI);
    expect(g.open).toBe(true);
    expect(g.next.id).toBe(LESSONS[2].id);
  });
  it("has nothing to offer when every lesson is done", async () => {
    const s = await fresh();
    s.markLessonsDone(LESSONS.map((l) => l.id), FRI);
    expect(grammarGate(s, FRI).next).toBe(null);
    expect(grammarGate(s, FRI).open).toBe(false);
  });
});

describe("done today", () => {
  it("reads activities from the log", async () => {
    const s = await fresh();
    expect(Object.values(doneToday(s, FRI)).some(Boolean)).toBe(false);
    s.logLesson("review", 0.9, 1000, FRI);
    s.markPractice("read", "intro", { ms: 1000, now: FRI });
    s.markPractice("out", "p1", { now: FRI });
    s.markPractice("pitch", "session", { now: FRI });
    s.logLesson("sentences", 1, 1000, FRI);
    s.logLesson("writing", 1, 1000, FRI);
    const d = doneToday(s, FRI);
    expect(d).toMatchObject({ review: true, read: true, out: true, pitch: true, sentences: true, write: true, lesson: false });
    expect(Object.values(doneToday(s, FRI + 2 * DAY)).some(Boolean)).toBe(false);
  });
  it("counts a lesson only when it was first passed today", async () => {
    const s = await fresh();
    learn(s, 0, FRI - 3 * DAY);
    expect(doneToday(s, FRI).lesson).toBe(false);
    learn(s, 1, FRI);
    expect(doneToday(s, FRI).lesson).toBe(true);
  });
});

describe("daily plan", () => {
  it("puts cards first, then a new lesson on the day it opens", async () => {
    const s = await fresh({ minutes: 45 });
    const p = buildPlan(s, FRI, inputs());
    expect(p.items[0].kind).toBe("cards");
    expect(p.items[1]).toMatchObject({ kind: "lesson", done: false });
    expect(p.items[1].open).toEqual({ type: "lesson", id: LESSONS[0].id });
    // the lesson replaces the grammar slot, it is not listed twice
    expect(p.items.filter((i) => i.kind === "lesson").length).toBe(1);
  });
  it("shows no new lesson while the gate is closed, but offers it as an extra", async () => {
    const s = await fresh();
    learn(s, 0, FRI - DAY);
    const p = buildPlan(s, FRI, inputs());
    expect(p.items.some((i) => i.kind === "lesson")).toBe(false);
    const early = p.extras.find((i) => i.id === "lesson-early");
    expect(early).toBeTruthy();
    expect(early.sub).toMatch(/tomorrow/);
  });
  it("keeps today's lesson on the list, ticked, after it is done", async () => {
    const s = await fresh();
    learn(s, 0, FRI);
    const p = buildPlan(s, FRI, inputs());
    const l = p.items.find((i) => i.kind === "lesson");
    expect(l.done).toBe(true);
    expect(l.title).toContain(LESSONS[0].title);
    // the next one can still be started early
    expect(p.extras.find((i) => i.id === "lesson-early").title).toContain(LESSONS[1].title);
  });
  it("follows a weekly rhythm", async () => {
    const monday = new Date(2026, 9, 12, 12).getTime();
    const tuesday = monday + DAY;
    const saturday = new Date(2026, 9, 10, 12).getTime();
    // pace of 21 days keeps the lesson gate shut, so only the rhythm items show
    const s = await fresh({ minutes: 60, grammarEvery: 21, grammarEarlyFast: false });
    learn(s, 0, saturday - 2 * DAY);
    const kinds = (t) => buildPlan(s, t, inputs()).items.map((i) => i.kind).join(",");
    expect(kinds(tuesday)).toBe("cards,write,sentences");
    expect(kinds(saturday)).toBe("cards,write,prompts,reading");
    expect(kinds(tuesday)).not.toBe(kinds(saturday));
  });
  it("uses the grammar slot for a review when one is due", async () => {
    const monday = new Date(2026, 9, 12, 12).getTime();
    const s = await fresh({ minutes: 60 });
    learn(s, 0, monday - DAY);
    expect(buildPlan(s, monday, inputs()).items.map((i) => i.kind)).toEqual(["cards", "reading"]);
    const p = buildPlan(s, monday, inputs({ lessonsDue: 3 }));
    expect(p.items.map((i) => i.kind)).toEqual(["cards", "review", "reading"]);
    expect(p.items[1].sub).toContain("3 lessons");
  });
  it("trims the day to the minutes you chose", async () => {
    const tuesday = new Date(2026, 9, 13, 12).getTime();
    const s = await fresh({ minutes: 10 });
    learn(s, 0, tuesday - DAY);
    const p = buildPlan(s, tuesday, inputs({ counts: counts({ total: 30 }) }));
    // cards alone are about 9 minutes, so only the first extra stays and the rest move down
    expect(p.items.map((i) => i.kind)).toEqual(["cards", "write"]);
    expect(p.extras.map((i) => i.kind)).toContain("sentences");
    expect(p.minutes.budget).toBe(10);
  });
  it("skips what is not available", async () => {
    const tuesday = new Date(2026, 9, 13, 12).getTime();
    const s = await fresh({ minutes: 60 });
    learn(s, 0, tuesday - DAY);
    const p = buildPlan(s, tuesday, inputs({ writeSet: [], poolSize: 2 }));
    expect(p.items.map((i) => i.kind)).toEqual(["cards"]);
  });
  it("marks finished items and reports a finished day", async () => {
    const tuesday = new Date(2026, 9, 13, 12).getTime();
    const s = await fresh({ minutes: 60 });
    learn(s, 0, tuesday - DAY);
    s.logLesson("writing", 1, 1000, tuesday);
    s.logLesson("sentences", 1, 1000, tuesday);
    const p = buildPlan(s, tuesday, inputs({ counts: counts({ total: 0, today: { total: 20 } }) }));
    expect(p.items.every((i) => i.done)).toBe(true);
    expect(p.allDone).toBe(true);
    expect(p.minutes.planned).toBe(0);
  });
  it("in maintain mode offers only cards, writing and pitch", async () => {
    const s = await fresh({ focus: "maintain", minutes: 60 });
    const av = availability(s, inputs());
    expect(av.lesson).toBe(false);
    expect(av.reading).toBe(false);
    expect(av.pitch).toBe(false);
    const p = buildPlan(s, FRI, inputs());
    expect(p.items.some((i) => i.kind === "lesson")).toBe(false);
  });
  it("turns grammar off cleanly", async () => {
    const s = await fresh({ tracks: { kana: true, kanji: true, vocab: true, grammar: false } });
    const p = buildPlan(s, FRI, inputs());
    expect(p.items.concat(p.extras).some((i) => ["lesson", "review", "sentences"].includes(i.kind))).toBe(false);
  });
  it("names tomorrow's practice", async () => {
    const s = await fresh({ minutes: 60 });
    learn(s, 0, FRI);
    const p = buildPlan(s, FRI, inputs());
    // Saturday
    expect(p.tomorrow).toEqual(["Write characters", "Writing prompt", "Read a short text"]);
  });
  it("slots cover every weekday", async () => {
    const s = await fresh();
    const av = availability(s, inputs({ lessonsDue: 2 }));
    const base = dayIndex(FRI);
    for (let i = 0; i < 7; i++) expect(slotsFor(base + i, av).length).toBeGreaterThan(0);
  });
});

describe("week strip", () => {
  it("runs Monday to Sunday and marks studied days", async () => {
    const s = await fresh();
    s.logLesson("review", 1, 1000, FRI - 2 * DAY); // Wednesday
    s.logLesson("review", 1, 1000, FRI);
    const w = weekStrip(s, FRI);
    expect(w.map((d) => d.label).join("")).toBe("MTWTFSS");
    expect(w[2].studied).toBe(true);
    expect(w[4]).toMatchObject({ studied: true, today: true });
    expect(w[5].future).toBe(true);
    expect(w[0].studied).toBe(false);
  });
});
