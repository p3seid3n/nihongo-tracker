// The dojo: experience points, ranks, a daily goal, daily quests, combos and achievements.
//
// Everything is worked out from the review log, so it syncs between devices with nothing extra stored and can
// never drift from what you actually did. Only "which celebrations has this device already shown" is local.
import { ACTIVITY } from "./effort.js";
import { NEW } from "./fsrs.js";
import { isProd } from "./ids.js";
import { dayIndex, dayKey, DAY } from "./time.js";

// ---------------------------------------------------------------------------
// experience
/** XP for one answer: what you did, not how well (a miss is still practice), with a little extra for success. */
export function cardXp(row, firstToday) {
  const g = row[2];
  if (!firstToday) return 1; // learning steps and repeats of the same card
  let xp = g === 1 ? 1 : g === 2 ? 2 : 3;
  if (row[4] === NEW) xp += 2;
  if (isProd(row[1])) xp = Math.round(xp * 1.5);
  return xp;
}

/** XP for a lesson or practice set (log rows with state 9); the grade there is the score band 1..4. */
export function activityXp(row) {
  const id = String(row[1]).replace(/^g\./, "");
  const band = row[2];
  if (id === "review" || id === "sentences" || id === "testout") return 10 + band * 4;
  if (id === "writing") return 12 + band * 2;
  if (/^(read|out|pitch)\./.test(id)) return 12;
  return 15 + band * 5; // a grammar lesson
}

/** Combos: answers in a row graded Good or Easy, within one sitting (gaps under 10 minutes). */
const COMBO_GAP = 10 * 60 * 1000;
export const comboBonus = (combo) => (combo >= 25 ? 3 : combo >= 15 ? 2 : combo >= 5 ? 1 : 0);

/** A fresh ledger to fold rows into. */
function emptyLedger() {
  return { total: 0, byDay: new Map(), maxCombo: 0, cardsTotal: 0, reviewsTotal: 0, lessonsTotal: 0, rows: 0, distinct: new Set(),
    _combo: 0, _lastCardAt: 0, _day: "", _seen: new Set(), _lastTs: -Infinity };
}

/** Fold one row (rows must come in time order). */
function fold(L, r) {
  L.rows++;
  L._lastTs = r[0];
  const key = dayKey(r[0]);
  if (key !== L._day) { L._day = key; L._seen = new Set(); }
  let d = L.byDay.get(key);
  if (!d) { d = { xp: 0, cards: 0, reviews: 0, news: 0, lessons: 0, kinds: new Set(), maxCombo: 0, good: 0, firstAt: r[0], lastAt: r[0], perfect: 0 }; L.byDay.set(key, d); }
  d.lastAt = r[0];
  if (r[4] === ACTIVITY) {
    const id = String(r[1]).replace(/^g\./, "");
    const xp = activityXp(r);
    d.xp += xp; L.total += xp; d.lessons++; L.lessonsTotal++;
    const plain = /^(review|sentences|writing|testout)$/.test(id);
    d.kinds.add(id.includes(".") ? id.split(".")[0] : plain ? id : "lesson");
    if (r[2] === 4 && !id.includes(".") && !plain) d.perfect++;
    return;
  }
  const first = !L._seen.has(r[1]);
  L._seen.add(r[1]);
  L.distinct.add(r[1]);
  let xp = cardXp(r, first);
  if (r[0] - L._lastCardAt > COMBO_GAP) L._combo = 0;
  L._lastCardAt = r[0];
  // Good and Easy build the combo, Again breaks it, Hard keeps it as it is
  if (r[2] >= 3) { L._combo++; d.good++; } else if (r[2] === 1) L._combo = 0;
  xp += r[2] >= 3 ? comboBonus(L._combo) : 0;
  if (L._combo > d.maxCombo) d.maxCombo = L._combo;
  if (L._combo > L.maxCombo) L.maxCombo = L._combo;
  d.xp += xp; L.total += xp;
  if (first) { d.cards++; L.cardsTotal++; if (r[4] === NEW) d.news++; }
  d.reviews++; L.reviewsTotal++;
}

const counted = (r) => r && r[2] > 0;

/**
 * Walk the whole log once. Returns { total, byDay: Map(dayKey -> {xp, cards, reviews, news, lessons, kinds:Set, maxCombo, good, firstAt, lastAt, perfect}), maxCombo, distinct, ... }.
 * Rows are sorted by time first, so devices that synced in any order agree.
 */
export function ledger(store) {
  const rows = [];
  for (const m of Object.keys(store.log || {})) for (const r of store.log[m] || []) if (counted(r)) rows.push(r);
  rows.sort((a, b) => a[0] - b[0]);
  const L = emptyLedger();
  for (const r of rows) fold(L, r);
  return L;
}

/**
 * The same, kept up to date cheaply: answers are appended to the newest month, so usually only those few new rows
 * are folded in. Anything else (undo, a sync bringing older rows, an import) rebuilds it.
 */
const cache = new WeakMap(); // store -> { L, size, month, monthLen }
export function ledgerCached(store) {
  const months = Object.keys(store.log || {}).sort();
  let size = 0;
  for (const m of months) size += (store.log[m] || []).length;
  const month = months[months.length - 1] || "";
  const arr = store.log[month] || [];
  const c = cache.get(store);
  if (c && c.size === size && c.month === month) return c.L;
  if (c && c.month === month && size > c.size && arr.length - c.monthLen === size - c.size) {
    const fresh = arr.slice(c.monthLen);
    if (fresh.every((r) => !counted(r) || r[0] >= c.L._lastTs)) {
      for (const r of fresh) if (counted(r)) fold(c.L, r);
      c.size = size; c.monthLen = arr.length;
      return c.L;
    }
  }
  const L = ledger(store);
  cache.set(store, { L, size, month, monthLen: arr.length });
  return L;
}

// ---------------------------------------------------------------------------
// ranks: kyū count down to 1, then dan count up, with the belt colours of a martial-arts dojo
export const RANKS = [
  { xp: 0, jp: "十級", name: "10th kyū", belt: "white" },
  { xp: 100, jp: "九級", name: "9th kyū", belt: "white" },
  { xp: 250, jp: "八級", name: "8th kyū", belt: "yellow" },
  { xp: 450, jp: "七級", name: "7th kyū", belt: "yellow" },
  { xp: 700, jp: "六級", name: "6th kyū", belt: "orange" },
  { xp: 1000, jp: "五級", name: "5th kyū", belt: "orange" },
  { xp: 1400, jp: "四級", name: "4th kyū", belt: "green" },
  { xp: 1900, jp: "三級", name: "3rd kyū", belt: "blue" },
  { xp: 2500, jp: "二級", name: "2nd kyū", belt: "purple" },
  { xp: 3200, jp: "一級", name: "1st kyū", belt: "brown" },
  { xp: 4000, jp: "初段", name: "Shodan", belt: "black" },
  { xp: 5000, jp: "二段", name: "2nd dan", belt: "black" },
  { xp: 6200, jp: "三段", name: "3rd dan", belt: "black" },
  { xp: 7600, jp: "四段", name: "4th dan", belt: "black" },
  { xp: 9200, jp: "五段", name: "5th dan", belt: "black" },
  { xp: 11000, jp: "六段", name: "6th dan", belt: "red-white" },
  { xp: 13000, jp: "七段", name: "7th dan", belt: "red-white" },
  { xp: 15500, jp: "八段", name: "8th dan", belt: "red-white" },
  { xp: 18500, jp: "九段", name: "9th dan", belt: "red" },
  { xp: 22000, jp: "十段", name: "10th dan", belt: "red" },
];
export const BELT_COLOURS = { white: "#efe9e2", yellow: "#e9c04c", orange: "#ee8559", green: "#7fb77e", blue: "#6f9fd8", purple: "#a07ad0", brown: "#9a6b48", black: "#26201d", "red-white": "#d9564a", red: "#c93a2b" };

/** { index, rank, next, into, span, progress } for a total XP. */
export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const rank = RANKS[i], next = RANKS[i + 1] || null;
  const into = xp - rank.xp, span = next ? next.xp - rank.xp : 1;
  return { index: i, rank, next, into, span, progress: next ? into / span : 1 };
}

// ---------------------------------------------------------------------------
// streak (days with anything done, the 4 am rollover included)
export function streakOf(led, now = Date.now()) {
  const days = new Set([...led.byDay.keys()]);
  let cur = 0;
  let t = now;
  if (!days.has(dayKey(t))) t -= DAY; // today isn't over: yesterday still counts
  while (days.has(dayKey(t))) { cur++; t -= DAY; }
  let best = 0, run = 0, prev = null;
  for (const k of [...days].sort()) {
    const idx = dayIndex(new Date(k + "T12:00:00").getTime());
    run = prev != null && idx === prev + 1 ? run + 1 : 1;
    prev = idx; if (run > best) best = run;
  }
  return { current: cur, best, today: days.has(dayKey(now)) };
}

// ---------------------------------------------------------------------------
// daily quests: three a day, picked from the date so every device shows the same ones
export const GOALS = [{ value: 20, label: "Casual", jp: "気楽" }, { value: 50, label: "Regular", jp: "普通" }, { value: 100, label: "Serious", jp: "真剣" }, { value: 200, label: "Intense", jp: "猛特訓" }];

const QUESTS = [
  { id: "cards", make: (r) => { const n = [20, 30, 40][r % 3]; return { title: `Answer ${n} cards`, need: n, get: (d) => d.cards, reward: 10 }; } },
  { id: "combo", make: (r) => { const n = [8, 12, 15][r % 3]; return { title: `Reach a combo of ${n}`, need: n, get: (d) => d.maxCombo, reward: 15 }; } },
  { id: "xp", make: (r, goal) => { const n = Math.round(goal * [1, 1.2, 1.5][r % 3]); return { title: `Earn ${n} XP`, need: n, get: (d) => d.xp, reward: 15 }; } },
  { id: "lesson", make: () => ({ title: "Finish a lesson or a grammar review", need: 1, get: (d) => (d.kinds.has("lesson") || d.kinds.has("review") ? 1 : 0), reward: 20 }) },
  { id: "write", make: () => ({ title: "Practise writing characters", need: 1, get: (d) => (d.kinds.has("writing") ? 1 : 0), reward: 15 }) },
  { id: "new", make: (r) => { const n = [3, 5, 8][r % 3]; return { title: `Learn ${n} new cards`, need: n, get: (d) => d.news, reward: 10 }; } },
  { id: "read", make: () => ({ title: "Read a short text", need: 1, get: (d) => (d.kinds.has("read") ? 1 : 0), reward: 15 }) },
  { id: "sentences", make: () => ({ title: "Do a round of sentence practice", need: 1, get: (d) => (d.kinds.has("sentences") ? 1 : 0), reward: 15 }) },
];
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** The day's three quests with progress. `avail` limits them to what you can do (see plan.availability). */
export function questsFor(led, now = Date.now(), { goal = 50, avail = {} } = {}) {
  const key = dayKey(now);
  const d = led.byDay.get(key) || { xp: 0, cards: 0, news: 0, maxCombo: 0, kinds: new Set() };
  const can = (id) => (id === "lesson" ? avail.lesson !== false : id === "write" ? avail.write !== false : id === "read" ? avail.reading !== false : id === "sentences" ? avail.sentences !== false : true);
  const pool = QUESTS.filter((q) => can(q.id));
  const h = hash(key);
  const picked = [];
  // always one about cards, then two others in a day-specific order
  picked.push(pool.find((q) => q.id === "cards"));
  const rest = pool.filter((q) => q.id !== "cards").sort((a, b) => hash(key + a.id) - hash(key + b.id));
  picked.push(...rest.slice(0, 2));
  return picked.filter(Boolean).map((q, i) => {
    const spec = q.make((h >>> (i * 3)) & 7, goal);
    const have = Math.min(spec.need, spec.get(d));
    return { id: `${key}:${q.id}`, kind: q.id, title: spec.title, need: spec.need, have, done: have >= spec.need, reward: spec.reward };
  });
}

/** XP from finished quests on a day (counted into the totals by `progress`). */
const questXp = (qs) => qs.filter((q) => q.done).reduce((n, q) => n + q.reward, 0);

// ---------------------------------------------------------------------------
// achievements: kanji badges
export const BADGES = [
  { id: "first", jp: "初", name: "First step", desc: "Answer your first card", test: (s) => s.led.reviewsTotal >= 1 },
  { id: "lesson1", jp: "学", name: "Student", desc: "Finish a grammar lesson", test: (s) => s.lessonsDone >= 1 },
  { id: "hundred", jp: "百", name: "One hundred", desc: "Study 100 different cards", test: (s) => s.distinct >= 100, prog: (s) => [s.distinct, 100] },
  { id: "thousand", jp: "千", name: "One thousand", desc: "Give 1,000 answers", test: (s) => s.led.reviewsTotal >= 1000, prog: (s) => [s.led.reviewsTotal, 1000] },
  { id: "streak7", jp: "連", name: "Unbroken", desc: "Study 7 days in a row", test: (s) => s.streak.best >= 7, prog: (s) => [s.streak.best, 7] },
  { id: "streak30", jp: "炎", name: "Eternal flame", desc: "Study 30 days in a row", test: (s) => s.streak.best >= 30, prog: (s) => [s.streak.best, 30] },
  { id: "combo25", jp: "剣", name: "Swordsman", desc: "A combo of 25", test: (s) => s.led.maxCombo >= 25, prog: (s) => [s.led.maxCombo, 25] },
  { id: "combo50", jp: "刀", name: "Blade master", desc: "A combo of 50", test: (s) => s.led.maxCombo >= 50, prog: (s) => [s.led.maxCombo, 50] },
  { id: "perfect", jp: "完", name: "Flawless", desc: "Finish a lesson without a mistake", test: (s) => s.perfect >= 1 },
  { id: "writer", jp: "書", name: "Calligrapher", desc: "Ten writing sessions", test: (s) => s.kindCount.writing >= 10, prog: (s) => [s.kindCount.writing || 0, 10] },
  { id: "reader", jp: "読", name: "Reader", desc: "Read ten short texts", test: (s) => s.kindCount.read >= 10, prog: (s) => [s.kindCount.read || 0, 10] },
  { id: "grammar15", jp: "文", name: "Grammarian", desc: "Learn 15 grammar lessons", test: (s) => s.lessonsDone >= 15, prog: (s) => [s.lessonsDone, 15] },
  { id: "grammarAll", jp: "侍", name: "Samurai", desc: "Learn every grammar lesson", test: (s) => s.lessonsDone >= s.lessonsTotal && s.lessonsTotal > 0, prog: (s) => [s.lessonsDone, s.lessonsTotal] },
  { id: "early", jp: "朝", name: "Morning training", desc: "Study before 7 am", test: (s) => s.early },
  { id: "night", jp: "夜", name: "Night watch", desc: "Study after 11 pm", test: (s) => s.night },
  { id: "goal7", jp: "的", name: "On target", desc: "Reach your daily goal 7 times", test: (s) => s.goalDays >= 7, prog: (s) => [s.goalDays, 7] },
  { id: "shodan", jp: "段", name: "Black belt", desc: "Reach shodan (4,000 XP)", test: (s) => s.led.total >= 4000, prog: (s) => [s.led.total, 4000] },
  { id: "godan", jp: "将", name: "General", desc: "Reach 5th dan", test: (s) => s.led.total >= 9200, prog: (s) => [s.led.total, 9200] },
];

/**
 * Everything the dojo screens need, in one pass: { xp, today, goal, rank, streak, quests, badges, led }.
 * `lessonsTotal`/`lessonsDone` and `avail` come from the caller (content knowledge lives elsewhere).
 */
export function progress(store, now = Date.now(), { lessonsTotal = 0, lessonsDone = 0, avail = {}, cached = false } = {}) {
  const led = cached ? ledgerCached(store) : ledger(store);
  const goal = store.settings.xpGoal || 50;
  // quests of every day add their rewards (past days too, so the total never shrinks)
  let questTotal = 0, goalDays = 0;
  for (const [k] of led.byDay) {
    const t = new Date(k + "T12:00:00").getTime();
    const qx = questXp(questsFor(led, t, { goal, avail }));
    questTotal += qx;
    if (led.byDay.get(k).xp + qx >= goal) goalDays++;
  }
  const todayKey = dayKey(now);
  const quests = questsFor(led, now, { goal, avail });
  const today = (led.byDay.get(todayKey)?.xp || 0) + questXp(quests);
  const xp = led.total + questTotal;
  const streak = streakOf(led, now);
  const kindCount = {};
  let perfect = 0, early = false, night = false;
  for (const d of led.byDay.values()) {
    for (const k of d.kinds) kindCount[k] = (kindCount[k] || 0) + 1;
    perfect += d.perfect;
    const h1 = new Date(d.firstAt).getHours(), h2 = new Date(d.lastAt).getHours();
    if (h1 >= 4 && h1 < 7) early = true;
    if (h2 >= 23 || h2 < 3) night = true;
  }
  const s = { led: { ...led, total: xp }, streak, distinct: led.distinct.size, lessonsDone, lessonsTotal, perfect, kindCount, early, night, goalDays };
  const badges = BADGES.map((b) => {
    const got = !!b.test(s);
    const p = b.prog ? b.prog(s) : null;
    return { ...b, got, have: p ? Math.min(p[0], p[1]) : got ? 1 : 0, need: p ? p[1] : 1 };
  });
  return { xp, today, goal, goalMet: today >= goal, rank: rankFor(xp), streak, quests, badges, led, maxComboToday: led.byDay.get(todayKey)?.maxCombo || 0 };
}

// ---------------------------------------------------------------------------
// celebrations this device has already shown (rank ups, badges, the day's goal, quests)
const SEEN = "nt-dojo-seen";
let memSeen = null; // when storage is unavailable (private mode, tests), remember for this session
export function loadSeen() { try { if (typeof localStorage !== "undefined") return JSON.parse(localStorage.getItem(SEEN) || "{}") || {}; } catch { /* fall through */ } return memSeen || {}; }
export function saveSeen(s) { memSeen = s; try { if (typeof localStorage !== "undefined") localStorage.setItem(SEEN, JSON.stringify(s)); } catch { /* ignore */ } }
export function resetSeen() { memSeen = null; try { localStorage.removeItem(SEEN); } catch { /* ignore */ } }

/** What is new since the last look: { rankUp, badges: [...], goal, quests: [...] }. First run marks everything as seen. */
export function newEvents(p, now = Date.now()) {
  const seen = loadSeen();
  const first = seen.rank == null;
  const day = dayKey(now);
  const ev = { rankUp: null, badges: [], goal: false, quests: [] };
  if (!first && p.rank.index > seen.rank) ev.rankUp = p.rank.rank;
  const had = new Set(seen.badges || []);
  if (!first) ev.badges = p.badges.filter((b) => b.got && !had.has(b.id));
  if (p.goalMet && seen.goalDay !== day) ev.goal = !first;
  const qs = new Set(seen.quests || []);
  if (!first) ev.quests = p.quests.filter((q) => q.done && !qs.has(q.id));
  saveSeen({
    rank: Math.max(p.rank.index, seen.rank ?? 0),
    badges: [...new Set([...(seen.badges || []), ...p.badges.filter((b) => b.got).map((b) => b.id)])],
    goalDay: p.goalMet ? day : seen.goalDay,
    quests: [...new Set([...(seen.quests || []).filter((id) => id.startsWith(day)), ...p.quests.filter((q) => q.done).map((q) => q.id)])],
  });
  return ev;
}
