// Statistics derived from cards, lessons and the review log.
import { NEW, LEARNING, RELEARNING, REVIEW, currentRetrievability } from "./fsrs.js";
import { dayIndex, dayKey, dayStart, DAY, dayIndexToDate } from "./time.js";
import { ACTIVITY } from "./queue.js";
import { LESSONS } from "../content/lessons.js";
import { KANJI_RE } from "./jp.js";

export const MATURE_DAYS = 21;

export function cardBreakdown(store, deckId, now) {
  const ids = store.cardIds(deckId);
  const prog = store.prog[deckId] || {};
  const out = { total: ids.length, fresh: 0, learning: 0, young: 0, mature: 0, suspended: 0, avgR: 0, due: 0 };
  let rSum = 0, rN = 0;
  const today0 = dayStart(now);
  for (const id of ids) {
    const r = prog[id];
    if (r?.sus) { out.suspended++; continue; }
    if (!r || r.st === NEW) { out.fresh++; continue; }
    if (r.st === LEARNING || r.st === RELEARNING) { out.learning++; if (r.due <= now) out.due++; continue; }
    if (r.s >= MATURE_DAYS) out.mature++; else out.young++;
    const R = currentRetrievability(r, now);
    rSum += R; rN++;
    if (dayStart(r.due) <= today0) out.due++;
  }
  out.avgR = rN ? rSum / rN : 0;
  return out;
}

function rowsByDay(rows) {
  const m = new Map();
  for (const r of rows) {
    const d = dayIndex(r[0]);
    let e = m.get(d);
    if (!e) { e = { reviews: 0, news: 0, ms: 0, lessons: 0, lapses: 0, pass: 0, matureN: 0, maturePass: 0 }; m.set(d, e); }
    e.ms += r[3] || 0;
    if (r[4] === ACTIVITY) { e.lessons++; continue; }
    e.reviews++;
    if (r[4] === NEW) e.news++;
    if (r[4] === REVIEW) { if (r[2] > 1) e.pass++; else e.lapses++; }
  }
  return m;
}

export function computeStats(store, now = Date.now()) {
  const today = dayIndex(now);
  const rows = store.logRows();
  const byDay = rowsByDay(rows);

  // activity (last 20 weeks) and 14 day chart
  const activity = [];
  for (let i = 139; i >= 0; i--) {
    const d = today - i;
    const e = byDay.get(d);
    activity.push({ day: d, n: e ? e.reviews + e.lessons : 0, ms: e ? e.ms : 0 });
  }
  const daily = [];
  for (let i = 13; i >= 0; i--) {
    const d = today - i;
    const e = byDay.get(d);
    daily.push({ day: d, reviews: e ? e.reviews - e.news : 0, news: e ? e.news : 0, minutes: e ? Math.round(e.ms / 60000) : 0, lessons: e ? e.lessons : 0 });
  }

  // streak
  const hasActivity = (d) => { const e = byDay.get(d); return !!e && e.reviews + e.lessons > 0; };
  let current = 0;
  let d = hasActivity(today) ? today : today - 1;
  while (hasActivity(d)) { current++; d--; }
  let longest = 0, run = 0, prev = null;
  for (const k of [...byDay.keys()].sort((a, b) => a - b)) {
    if (!hasActivity(k)) continue;
    run = prev != null && k === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }

  // true retention over the last 30 days (review-state cards only)
  let rn = 0, rp = 0, mn = 0, mp = 0;
  for (const r of rows) {
    if (r[4] !== REVIEW) continue;
    if (dayIndex(r[0]) < today - 29) continue;
    rn++; if (r[2] > 1) rp++;
  }
  void mn; void mp;

  // per deck
  const perDeck = store.deckList().map((deck) => ({ deck, ...cardBreakdown(store, deck.id, now) }));

  const sum = (f) => perDeck.reduce((n, p) => n + f(p), 0);
  const totals = {
    cards: sum((p) => p.total), fresh: sum((p) => p.fresh), learning: sum((p) => p.learning),
    young: sum((p) => p.young), mature: sum((p) => p.mature), suspended: sum((p) => p.suspended),
  };

  // forecast: reviews due per day for the next 30 days (+ overdue today)
  const forecast = Array.from({ length: 30 }, (_, i) => ({ day: today + i, n: 0 }));
  for (const deck of store.deckList()) {
    const prog = store.prog[deck.id] || {};
    for (const r of Object.values(prog)) {
      if (!r || r.sus) continue;
      if (r.st === REVIEW) {
        const dd = Math.max(0, dayIndex(r.due) - today);
        if (dd < 30) forecast[dd].n++;
      } else if (r.st === LEARNING || r.st === RELEARNING) {
        if (r.due <= now + DAY) forecast[0].n++;
      }
    }
  }

  // difficult cards
  const difficult = [];
  for (const deck of store.deckList()) {
    const prog = store.prog[deck.id] || {};
    const content = store.content[deck.id] || {};
    for (const [id, r] of Object.entries(prog)) {
      if (!r || r.st === NEW || !content[id]) continue;
      if ((r.lapses || 0) >= 2) difficult.push({ id, deck: deck.name, f: content[id].f, m: content[id].m, lapses: r.lapses, d: r.d });
    }
  }
  difficult.sort((a, b) => b.lapses - a.lapses || b.d - a.d);

  // knowledge: kanji and words
  const kanji = new Set();
  let words = 0;
  for (const deck of store.deckList()) {
    const prog = store.prog[deck.id] || {};
    const content = store.content[deck.id] || {};
    for (const [id, r] of Object.entries(prog)) {
      if (!r || r.st !== REVIEW || r.sus || !content[id]) continue;
      if (deck.kind === "kanji") for (const ch of content[id].f) { if (KANJI_RE.test(ch)) kanji.add(ch); }
      else if (deck.kind === "vocab") words++;
    }
  }

  // grammar
  const lessons = LESSONS.length;
  let lessonsDone = 0, lessonsDue = 0;
  for (const l of LESSONS) {
    const rec = store.lessons[l.id];
    if (rec?.done) {
      lessonsDone++;
      if (rec.due && dayStart(rec.due) <= dayStart(now)) lessonsDue++;
    }
  }

  // growth: cards introduced per week over the last 12 weeks
  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    let n = 0;
    for (let i = 0; i < 7; i++) n += byDay.get(today - w * 7 - i)?.news || 0;
    weeks.push({ week: w, n });
  }

  // projection: average of graduated-new-cards per day over the last 14 days
  const last14 = daily.reduce((n, x) => n + x.news, 0) / 14;

  const totalMs = rows.reduce((n, r) => n + (r[3] || 0), 0);

  return {
    totals, perDeck, activity, daily, streak: { current, longest },
    retention: rn >= 20 ? rp / rn : null, retentionN: rn,
    forecast, difficult: difficult.slice(0, 12),
    kanjiKnown: kanji.size, wordsKnown: words,
    lessons, lessonsDone, lessonsDue,
    weeks, newPerDay: last14, totalMs, reviewsTotal: rows.filter((r) => r[4] !== ACTIVITY).length,
    activeDays: [...byDay.keys()].filter(hasActivity).length,
  };
}

export { dayKey, dayIndexToDate };
