// Builds the daily study queue from decks, limits and FSRS state.
import { NEW, LEARNING, RELEARNING, REVIEW, currentRetrievability } from "./fsrs.js";
import { dayKey, monthKey, dayStart, dayIndex, MIN, DAY } from "./time.js";
import { ACTIVITY, COST, rowCost, effortCfg } from "./effort.js";
import { isProd, baseId, prodId } from "./ids.js";
import { recallEligible } from "./recall.js";

export const LEARN_AHEAD = 20 * MIN;
export { ACTIVITY };

/** Counts for the current study day, derived from the review log. */
export function todayCounts(store, now = Date.now()) {
  const key = dayKey(now);
  const rows = store.log[monthKey(now)] || [];
  const out = { newByDeck: {}, reviews: 0, total: 0, ms: 0, lessons: 0, effort: 0, prodNew: 0 };
  for (const r of rows) {
    if (r[2] === 0 || dayKey(r[0]) !== key) continue;
    out.ms += r[3] || 0;
    if (r[4] === ACTIVITY) { out.lessons++; continue; }
    out.total++;
    out.effort += rowCost(r);
    if (r[4] === NEW) {
      if (isProd(r[1])) { out.prodNew++; continue; }
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

/** Share of answers on review-state cards that were remembered, over the last `days` days. */
export function recentRecall(store, now = Date.now(), days = 7) {
  const from = now - days * DAY;
  let n = 0, pass = 0;
  for (const m of [monthKey(now), monthKey(now - 31 * DAY)]) {
    for (const r of store.log[m] || []) {
      if (r[2] === 0 || r[4] !== REVIEW || r[0] < from || r[0] > now) continue;
      n++; if (r[2] > 1) pass++;
    }
  }
  return { n, pass, rate: n ? pass / n : 1 };
}

/**
 * How many of the usual new cards to allow today (0..1) and why. New cards pile up work for
 * the weeks after, so they slow down while due work is heavy or recall is slipping.
 */
export function throttleFor(store, dueEffort, cfg, now = Date.now()) {
  if (!cfg.throttle) return { factor: 1, reason: "" };
  let factor = 1, reason = "";
  const ratio = dueEffort / cfg.budget;
  if (ratio >= 1) { factor = 0; reason = "a lot is due, so reviews come first"; }
  else if (ratio > 0.5) { factor = 1 - (ratio - 0.5) / 0.5; reason = "many reviews are due"; }
  const rc = recentRecall(store, now, 7);
  if (rc.n >= 30) {
    const pct = Math.round(rc.rate * 100);
    if (rc.rate < 0.7 && factor > 0) { factor = 0; reason = `recall is ${pct}% this week`; }
    else if (rc.rate < 0.8 && factor > 0.5) { factor = 0.5; reason = `recall is ${pct}% this week`; }
  }
  return { factor: Math.max(0, Math.min(1, factor)), reason };
}

const scaled = (limit, factor) => {
  if (factor >= 1) return limit;
  const v = Math.round(limit * factor);
  return v === 0 && factor >= 0.2 && limit > 0 ? 1 : v;
};

function deckStatus(store, deck, now, today, opts, cfg) {
  const ids = store.cardIds(deck.id);
  const prog = store.prog[deck.id] || {};
  const content = store.content[deck.id] || {};
  const learning = [], reviews = [], fresh = [], prodReviews = [], prodFresh = [];
  const today0 = dayStart(now);
  const vocab = deck.kind === "vocab";
  for (const id of ids) {
    const r = prog[id];
    if (r && r.sus) continue;
    if (!r || r.st === NEW) fresh.push(id);
    else if (r.st === LEARNING || r.st === RELEARNING) {
      if (r.due <= now + LEARN_AHEAD) learning.push(id);
    } else if (r.st === REVIEW) {
      if (dayStart(r.due) <= today0) reviews.push(id);
    }
    if (vocab && cfg.recall) {
      const pid = prodId(id);
      const pr = prog[pid];
      if (pr && !pr.sus && pr.st !== NEW) {
        if (pr.st === LEARNING || pr.st === RELEARNING) { if (pr.due <= now + LEARN_AHEAD) learning.push(pid); }
        else if (pr.st === REVIEW && dayStart(pr.due) <= today0) prodReviews.push(pid);
      } else if (!pr?.sus && recallEligible(deck, content[id], r, cfg)) prodFresh.push(pid);
    }
  }
  const limit = newLimit(store, deck);
  const done = today.newByDeck[deck.id] || 0;
  return { deck, learning, reviews, prodReviews, fresh, prodFresh, limit, done };
}

/** Counts for the home screen and deck list. Also decides what fits into today's effort budget. */
export function buildCounts(store, now = Date.now(), opts = {}) {
  const cfg = effortCfg(store.settings);
  const today = todayCounts(store, now);
  const decks = (opts.deckId ? store.deckList().filter((d) => d.id === opts.deckId) : activeDecks(store));
  const per = decks.map((d) => deckStatus(store, d, now, today, opts, cfg));

  const sum = (f) => per.reduce((n, p) => n + f(p), 0);
  const learnN = sum((p) => p.learning.length);
  const dueTotal = sum((p) => p.reviews.length + p.prodReviews.length);
  const dueEffort = learnN * COST.review + sum((p) => p.reviews.length) * COST.review + sum((p) => p.prodReviews.length) * COST.recallReview;
  const throttle = throttleFor(store, dueEffort, cfg, now);

  const lift = !!opts.extraReviews;
  const extra = opts.extraNew || 0;
  // asking for more new cards also raises today's budget by what they cost
  let left = lift ? Infinity : Math.max(0, cfg.budget - today.effort - learnN * COST.review) + extra * COST.new;
  const reviewCap = lift ? Infinity : Math.max(0, (store.settings.maxReviews || 200) - today.reviews);

  // due reviews: oldest first, weakest first; recall cards cost more
  const dueList = per.flatMap((p) => [...p.reviews, ...p.prodReviews]).map((id) => {
    const r = store.rec(id);
    return { id, day: dayIndex(r.due), r: currentRetrievability(r, now) };
  }).sort((a, b) => a.day - b.day || a.r - b.r);
  const reviewsSel = [];
  let deferred = 0, planned = learnN * COST.review;
  for (const x of dueList) {
    const cost = isProd(x.id) ? COST.recallReview : COST.review;
    if (reviewsSel.length >= reviewCap || cost > left) { deferred++; continue; }
    reviewsSel.push(x.id); left -= cost; planned += cost;
  }

  // new cards: the usual limit, scaled down by the throttle, then what the budget allows
  const newByDeck = per.map((p) => {
    const allowed = Math.max(0, scaled(p.limit, throttle.factor) + extra - p.done);
    const want = p.fresh.slice(0, allowed);
    const out = [];
    for (const id of want) { if (COST.new > left) { deferred++; continue; } out.push(id); left -= COST.new; planned += COST.new; }
    return out;
  });
  const throttledAway = !lift && throttle.factor < 1 ? sum((p) => Math.min(p.fresh.length, Math.max(0, p.limit - p.done))) - newByDeck.reduce((n, l) => n + l.length, 0) : 0;
  const prodAllowed = Math.max(0, (lift ? cfg.recallNewPerDay : scaled(cfg.recallNewPerDay, throttle.factor)) - today.prodNew);
  const prodNewSel = [];
  if (!opts.reviewsOnly) {
    for (const id of per.flatMap((p) => p.prodFresh)) {
      if (prodNewSel.length >= prodAllowed) break;
      if (COST.recallNew > left) { deferred++; continue; }
      prodNewSel.push(id); left -= COST.recallNew; planned += COST.recallNew;
    }
  }

  const reviewShown = reviewsSel.length;
  const prodReview = reviewsSel.filter(isProd).length;
  const fresh = newByDeck.reduce((n, l) => n + l.length, 0) + prodNewSel.length;
  return {
    today, per, learn: learnN, review: reviewShown, new: fresh,
    total: learnN + reviewShown + fresh,
    overflow: dueTotal - reviewShown,
    newAvailable: sum((p) => p.fresh.length),
    prodReview, prodNew: prodNewSel.length,
    effort: { budget: cfg.budget, spent: today.effort, planned, left: lift ? Infinity : Math.max(0, left) },
    throttle: { ...throttle, held: Math.max(0, throttledAway) },
    deferred,
    sel: { reviews: reviewsSel, news: newByDeck, prodNews: prodNewSel },
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
 * Cards you keep getting wrong lately (two or more misses in the last three days) that are not
 * due today anyway. Offered as an extra short round at the end of a session.
 */
export function weakSpots(store, now = Date.now(), { max = 6, exclude = new Set() } = {}) {
  if (store.settings.weakSpots === false) return [];
  const from = now - 3 * DAY;
  const misses = new Map();
  for (const m of [monthKey(now), monthKey(now - 4 * DAY)]) {
    for (const r of store.log[m] || []) {
      if (r[2] !== 1 || r[0] < from || r[4] === ACTIVITY || r[1].startsWith("g.")) continue;
      misses.set(r[1], (misses.get(r[1]) || 0) + 1);
    }
  }
  const out = [];
  for (const [id, n] of misses) {
    if (n < 2 || exclude.has(id)) continue;
    const rec = store.rec(id);
    if (!rec || rec.sus || rec.st !== REVIEW || !store.card(id)) continue;
    out.push({ id, n, r: currentRetrievability(rec, now) });
  }
  return out.sort((a, b) => b.n - a.n || a.r - b.r).slice(0, max).map((x) => x.id);
}

/**
 * Build a session. `limit` caps the number of main cards (for quick sessions).
 * Returns { learning: [ids], main: [ids], weak: [ids], counts }.
 */
export function buildSession(store, now = Date.now(), opts = {}) {
  const counts = buildCounts(store, now, opts);
  const learning = counts.per.flatMap((p) => p.learning);
  const reviews = counts.sel.reviews;
  const news = opts.reviewsOnly ? [] : interleave(counts.sel.news);
  // new cards and new recall cards are each spread evenly through the reviews
  let main = weave(weave(reviews, news), opts.reviewsOnly ? [] : counts.sel.prodNews);
  if (opts.limit != null) main = main.slice(0, opts.limit);
  const weak = opts.limit != null || opts.reviewsOnly ? [] : weakSpots(store, now, { exclude: new Set([...main, ...learning]) });
  return { learning, main, weak, counts };
}

export { baseId };
