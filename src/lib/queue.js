// Builds the daily study queue from decks, limits and FSRS state.
import { NEW, LEARNING, RELEARNING, REVIEW, currentRetrievability } from "./fsrs.js";
import { dayKey, monthKey, dayStart, dayIndex, MIN } from "./time.js";

export const LEARN_AHEAD = 20 * MIN;
/** Log rows with this "state before" value are lesson sessions, not card reviews. */
export const ACTIVITY = 9;

/** Counts for the current study day, derived from the review log. */
export function todayCounts(store, now = Date.now()) {
  const key = dayKey(now);
  const rows = store.log[monthKey(now)] || [];
  const out = { newByDeck: {}, reviews: 0, total: 0, ms: 0, lessons: 0 };
  for (const r of rows) {
    if (r[2] === 0 || dayKey(r[0]) !== key) continue;
    out.ms += r[3] || 0;
    if (r[4] === ACTIVITY) { out.lessons++; continue; }
    out.total++;
    if (r[4] === NEW) {
      const d = r[1].slice(0, r[1].indexOf("."));
      out.newByDeck[d] = (out.newByDeck[d] || 0) + 1;
    } else if (r[4] === REVIEW) out.reviews++;
  }
  return out;
}

export function trackOf(deck) {
  return deck.kind === "kana" ? "kana" : deck.kind === "kanji" ? "kanji" : "vocab";
}

export function activeDecks(store) {
  const t = store.settings.tracks || {};
  return store.deckList().filter((d) => d.enabled !== false && t[trackOf(d)] !== false);
}

export function newLimit(store, deck) {
  if (deck.newPerDay != null) return deck.newPerDay;
  const n = store.settings.newPerDay || {};
  return n[deck.kind] ?? n.generic ?? 8;
}

function deckStatus(store, deck, now, today, opts) {
  const ids = store.cardIds(deck.id);
  const prog = store.prog[deck.id] || {};
  const learning = [], reviews = [], fresh = [];
  const today0 = dayStart(now);
  for (const id of ids) {
    const r = prog[id];
    if (r && r.sus) continue;
    if (!r || r.st === NEW) { fresh.push(id); continue; }
    if (r.st === LEARNING || r.st === RELEARNING) {
      if (r.due <= now + LEARN_AHEAD) learning.push(id);
    } else if (r.st === REVIEW) {
      if (dayStart(r.due) <= today0) reviews.push(id);
    }
  }
  const limit = newLimit(store, deck) + (opts.extraNew || 0);
  const done = today.newByDeck[deck.id] || 0;
  const newLeft = Math.max(0, limit - done);
  return { deck, learning, reviews, newIds: fresh.slice(0, newLeft), newAvailable: fresh.length, newLeft };
}

/** Counts for the home screen and deck list. */
export function buildCounts(store, now = Date.now(), opts = {}) {
  const today = todayCounts(store, now);
  const decks = (opts.deckId ? store.deckList().filter((d) => d.id === opts.deckId) : activeDecks(store));
  const per = decks.map((d) => deckStatus(store, d, now, today, opts));
  const reviewCap = opts.extraReviews ? Infinity : Math.max(0, (store.settings.maxReviews || 200) - today.reviews);
  const dueTotal = per.reduce((n, p) => n + p.reviews.length, 0);
  const reviewShown = Math.min(dueTotal, reviewCap);
  const learn = per.reduce((n, p) => n + p.learning.length, 0);
  const fresh = per.reduce((n, p) => n + p.newIds.length, 0);
  return {
    today, per, learn, review: reviewShown, new: fresh,
    total: learn + reviewShown + fresh,
    overflow: dueTotal - reviewShown,
    newAvailable: per.reduce((n, p) => n + p.newAvailable, 0),
  };
}

function interleave(lists) {
  const out = [];
  const idx = lists.map(() => 0);
  let remaining = lists.reduce((n, l) => n + l.length, 0);
  while (remaining > 0) {
    for (let i = 0; i < lists.length; i++) {
      if (idx[i] < lists[i].length) { out.push(lists[i][idx[i]++]); remaining--; }
    }
  }
  return out;
}

/** Spread `news` evenly between `reviews`. */
function weave(reviews, news) {
  if (!news.length) return reviews.slice();
  if (!reviews.length) return news.slice();
  const out = [];
  const step = reviews.length / (news.length + 1);
  let ni = 0;
  for (let i = 0; i < reviews.length; i++) {
    out.push(reviews[i]);
    while (ni < news.length && (i + 1) >= step * (ni + 1)) out.push(news[ni++]);
  }
  while (ni < news.length) out.push(news[ni++]);
  return out;
}

/**
 * Build a session. `limit` caps the number of main cards (for quick sessions).
 * Returns { learning: [ids], main: [ids], counts }.
 */
export function buildSession(store, now = Date.now(), opts = {}) {
  const counts = buildCounts(store, now, opts);
  const learning = counts.per.flatMap((p) => p.learning);
  let reviewCap = opts.extraReviews ? Infinity : Math.max(0, (store.settings.maxReviews || 200) - counts.today.reviews);
  const reviewsAll = counts.per.flatMap((p) => p.reviews).map((id) => {
    const r = store.rec(id);
    return { id, day: dayIndex(r.due), r: currentRetrievability(r, now) };
  }).sort((a, b) => a.day - b.day || a.r - b.r).map((x) => x.id);
  const reviews = reviewsAll.slice(0, reviewCap);
  const news = opts.reviewsOnly ? [] : interleave(counts.per.map((p) => p.newIds));
  let main = weave(reviews, news);
  if (opts.limit != null) main = main.slice(0, opts.limit);
  return { learning, main, counts };
}
