// The daily plan: what to do today, curated from a weekly rhythm.
//
//  - Cards come first, every day.
//  - A new grammar lesson only opens every few days (Settings → Daily plan). The first, easy lessons
//    come faster. In between, grammar days hold a review or sentence practice instead.
//  - A few other kinds of practice rotate through the week so no day repeats the last.
//  - The core list is trimmed to the minutes you chose. What does not fit moves to "If you have time".
// Everything here is a pure function of the store and a few counts, so it is easy to test.
import { dayIndex, dayIndexToDate, dayKey, monthKey, DAY } from "./time.js";
import { ACTIVITY } from "./effort.js";
import { LESSONS, LESSON_BY_ID } from "../content/lessons.js";

/** How many of the first lessons count as easy (writing, です, は, が, adjectives, verbs, negatives). */
export const EARLY_LESSONS = 8;
export const PACE = { min: 1, max: 21, def: 7 };

const clampPace = (n) => (Number.isFinite(n) ? Math.min(PACE.max, Math.max(PACE.min, Math.round(n))) : PACE.def);

/** Days between two new lessons, for the lesson at `index`. */
export function grammarInterval(settings = {}, index = 99) {
  const every = clampPace(settings.grammarEvery);
  const quick = settings.grammarEarlyFast !== false && index < EARLY_LESSONS;
  return quick ? Math.max(1, Math.round(every / 3)) : every;
}

/** When the last lesson was really learned. Lessons marked as "already known" don't count. */
export function lastLearnedAt(store) {
  let t = 0;
  for (const l of LESSONS) {
    const r = store.lessons[l.id];
    if (r && r.done && !r.imp && r.done > t) t = r.done;
  }
  return t;
}

/**
 * Is a new lesson on the plan today?
 * Returns { next, open, interval, daysLeft, openDay }: `openDay` is the day index it opens on.
 */
export function grammarGate(store, now = Date.now()) {
  const s = store.settings || {};
  const next = LESSONS.find((l) => !store.lessons[l.id]?.done) || null;
  const today = dayIndex(now);
  if (!next) return { next: null, open: false, interval: 0, daysLeft: 0, openDay: today };
  const interval = grammarInterval(s, next.index);
  const last = lastLearnedAt(store);
  if (!last) return { next, open: true, interval, daysLeft: 0, openDay: today };
  const openDay = dayIndex(last) + interval;
  return { next, open: today >= openDay, interval, daysLeft: Math.max(0, openDay - today), openDay };
}

/** What was finished today, read from the activity log: { lesson, review, sentences, write, read, out, pitch }. */
export function doneToday(store, now = Date.now()) {
  const key = dayKey(now);
  const out = { lesson: false, review: false, sentences: false, write: false, read: false, out: false, pitch: false };
  for (const r of store.log[monthKey(now)] || []) {
    if (r[4] !== ACTIVITY || r[2] === 0 || dayKey(r[0]) !== key) continue;
    const id = String(r[1]).replace(/^g\./, "");
    if (id === "review") out.review = true;
    else if (id === "sentences") out.sentences = true;
    else if (id === "writing") out.write = true;
    else if (id.startsWith("read.")) out.read = true;
    else if (id.startsWith("out.")) out.out = true;
    else if (id.startsWith("pitch.")) out.pitch = true;
  }
  // a new lesson counts only when it was passed for the first time today
  for (const l of LESSONS) {
    const r = store.lessons[l.id];
    if (r && r.done && !r.imp && dayKey(r.done) === key) out.lesson = true;
  }
  return out;
}

// The weekly rhythm, by weekday (0 = Sunday). "grammar" is the lesson on the day it opens, otherwise a review.
const RHYTHM = {
  1: ["grammar", "reading"],
  2: ["write", "sentences"],
  3: ["grammar", "prompts"],
  4: ["reading", "pitch"],
  5: ["grammar", "sentences"],
  6: ["write", "prompts", "reading"],
  0: ["pitch", "grammar"],
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Minutes each kind of activity usually takes. */
export const MINUTES = { lesson: 12, review: 6, sentences: 6, reading: 6, write: 5, prompts: 8, pitch: 5 };

const KIND = {
  review: { icon: "refresh", title: "Review grammar" },
  sentences: { icon: "book", title: "Sentence practice" },
  reading: { icon: "book", title: "Read a short text" },
  write: { icon: "pen", title: "Write characters" },
  prompts: { icon: "pen", title: "Writing prompt" },
  pitch: { icon: "volume", title: "Pitch practice" },
};

/** Which kinds of practice make sense for this person right now. */
export function availability(store, inputs = {}) {
  const s = store.settings || {};
  const tracks = s.tracks || {};
  const maintain = s.focus === "maintain";
  const grammarOn = tracks.grammar !== false && !maintain;
  const readingOn = tracks.vocab !== false && !maintain;
  const doneCount = LESSONS.filter((l) => store.lessons[l.id]?.done).length;
  return {
    grammarOn,
    lesson: grammarOn,
    review: grammarOn && (inputs.lessonsDue || 0) > 0,
    sentences: grammarOn && (inputs.poolSize || 0) >= 6,
    reading: readingOn,
    write: (inputs.writeSet || []).length >= 1,
    prompts: readingOn || (grammarOn && doneCount >= 2),
    pitch: !maintain && (inputs.pitchCount || 0) >= 4,
  };
}

/** The kinds on the rhythm for a study day (a day index), left out when unavailable. */
export function slotsFor(dayIdx, avail) {
  const wd = dayIndexToDate(dayIdx).getDay();
  return RHYTHM[wd].filter((k) => (k === "grammar" ? avail.grammarOn : avail[k]));
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;

/**
 * inputs: { counts (buildCounts), lessonsDue, poolSize, writeSet, pitchCount }
 * Returns { items, extras, minutes: { planned, left, budget }, gate, tomorrow, week, allDone }
 */
export function buildPlan(store, now, inputs) {
  const s = store.settings || {};
  const budget = Math.max(5, Math.round(s.minutes || 20));
  const today = dayIndex(now);
  const avail = availability(store, inputs);
  const done = doneToday(store, now);
  const gate = grammarGate(store, now);
  const c = inputs.counts;

  const items = [];
  const extras = [];

  // 1. cards
  const remaining = c ? c.total : 0;
  const cardsDone = remaining === 0;
  if (c && (remaining > 0 || c.today.total > 0)) {
    items.push({
      id: "cards", kind: "cards", icon: "cards", done: cardsDone, min: cardsDone ? 0 : Math.max(1, Math.round(remaining * 0.3)),
      title: cardsDone ? "Cards done" : `Study ${plural(remaining, "card")}`,
      sub: cardsDone
        ? (c.deferred > 0 ? "Today's effort budget is used up" : `${c.today.total} reviewed today`)
        : `${c.review} reviews · ${c.new} new${c.learn ? ` · ${c.learn} learning` : ""}${c.prodReview + c.prodNew ? ` (${c.prodReview + c.prodNew} are recall cards)` : ""}`,
      open: { type: "study" },
    });
  }

  // 2. the new lesson, only on the day the gate opens (or once it was done today)
  const lessonDone = done.lesson;
  if (avail.lesson && gate.next && (gate.open || lessonDone)) {
    const l = lessonDone ? LESSONS.filter((x) => store.lessons[x.id]?.done && !store.lessons[x.id]?.imp).sort((a, b) => store.lessons[b.id].done - store.lessons[a.id].done)[0] : gate.next;
    items.push({
      id: "lesson", kind: "lesson", icon: "learn", done: lessonDone, min: lessonDone ? 0 : MINUTES.lesson,
      title: `New lesson: ${l.title}`, sub: `${l.jp} · ${l.blurb}`, open: { type: "lesson", id: l.id },
    });
  }
  // the next lesson stays reachable while it is not yet due (also right after finishing today's)
  if (avail.lesson && gate.next && !gate.open) {
    const when = gate.daysLeft === 1 ? "tomorrow" : `in ${gate.daysLeft} days`;
    extras.push({
      id: "lesson-early", kind: "lesson", icon: "learn", done: false, min: MINUTES.lesson,
      title: `Get ahead: ${gate.next.title}`, sub: `The next new lesson is planned ${when}. You can start it early.`, open: { type: "lesson", id: gate.next.id },
    });
  }

  // 3. the day's rhythm
  const make = (kind) => {
    if (kind === "grammar") return avail.review ? make("review") : null;
    if (!KIND[kind] || !avail[kind]) return null;
    const base = { id: kind, kind, icon: KIND[kind].icon, title: KIND[kind].title, done: !!done[{ write: "write", reading: "read", prompts: "out" }[kind] || kind], min: MINUTES[kind] };
    switch (kind) {
      case "review": return { ...base, sub: `${plural(inputs.lessonsDue, "lesson")} ready for a quick refresher`, open: { type: "review" } };
      case "sentences": return { ...base, sub: "Translate and fill gaps using only words you know", open: { type: "sentences" } };
      case "reading": return { ...base, sub: "Short texts with a bar for how much you already know", open: { type: "reader" } };
      case "write": {
        const w = inputs.writeSet || [];
        return { ...base, title: `Write ${plural(w.length, "character")}`, sub: `Stroke order: ${w.slice(0, 5).map((x) => x.ch).join(" ")}`, open: { type: "write", items: w } };
      }
      case "prompts": return { ...base, sub: "Write a few sentences and see which words you used", open: { type: "output" } };
      case "pitch": return { ...base, sub: "Hear a word and pick its pitch pattern", open: { type: "pitch" } };
      default: return null;
    }
  };

  const slots = slotsFor(today, avail);
  const seen = new Set();
  let used = items.reduce((n, i) => n + i.min, 0);
  let rhythmAdded = 0;
  for (const k of slots) {
    // on the day a lesson opens, the grammar slot is the lesson itself
    if (k === "grammar" && (items.some((i) => i.id === "lesson") || gate.open)) continue;
    const it = make(k);
    if (!it || seen.has(it.id)) continue;
    seen.add(it.id);
    // the first one always stays, so the day is never only cards; the rest only while the minutes allow
    if (it.done || rhythmAdded === 0 || used + it.min <= budget) { items.push(it); used += it.done ? 0 : it.min; rhythmAdded++; }
    else extras.push(it);
  }
  // other practice that is not on today's rhythm stays reachable as an extra
  for (const k of ["review", "sentences", "reading", "write", "prompts", "pitch"]) {
    if (seen.has(k) || !avail[k]) continue;
    const it = make(k);
    if (it) { seen.add(k); extras.push(it); }
  }

  const planned = items.reduce((n, i) => n + (i.done ? 0 : i.min), 0);
  const allDone = items.length > 0 && items.every((i) => i.done);

  // tomorrow, by name
  const tomorrowKinds = slotsFor(today + 1, avail).map((k) => (k === "grammar" ? (gate.next && gate.openDay <= today + 1 && avail.lesson ? "New lesson" : "Grammar review") : KIND[k].title));
  const week = weekStrip(store, now);

  return { items, extras, minutes: { planned, left: Math.max(0, budget - planned), budget }, gate, tomorrow: [...new Set(tomorrowKinds)], week, allDone, weekday: WEEKDAYS[dayIndexToDate(today).getDay()] };
}

/** Monday to Sunday of this week: was anything studied that day? */
export function weekStrip(store, now = Date.now()) {
  const today = dayIndex(now);
  const wd = dayIndexToDate(today).getDay(); // 0 = Sunday
  const monday = today - ((wd + 6) % 7);
  const studied = new Set();
  for (const m of new Set([monthKey(now), monthKey(now - 8 * DAY)])) {
    for (const r of store.log[m] || []) if (r[2] !== 0) studied.add(dayIndex(r[0]));
  }
  return Array.from({ length: 7 }, (_, i) => {
    const idx = monday + i;
    return { idx, label: "MTWTFSS"[i], today: idx === today, future: idx > today, studied: studied.has(idx) };
  });
}

export { LESSON_BY_ID };
