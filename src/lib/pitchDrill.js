// Pitch accent drills built from the pitch data of your own vocabulary decks (Kaishi has it).
//  - "pair": two words with the same reading and a different accent (橋 / 箸): hear one, say which.
//  - "shape": hear a word, pick the pitch pattern that matches.
// Only words with a native recording are played: a phone's synthetic voice does not reliably get the accent right.
import { unpackPitch, morae, pitchType } from "./pitch.js";
import { NEW } from "./fsrs.js";
import { wordPart } from "./audio.js";

/** Words of your vocabulary decks that have exactly one pitch pattern and at least two morae. `hasFile`: the deck has a recording. */
export function pitchWords(store) {
  const out = [];
  for (const deck of store.deckList()) {
    if (deck.kind !== "vocab" || deck.enabled === false) continue;
    const content = store.content[deck.id] || {};
    const prog = store.prog[deck.id] || {};
    for (const [id, c] of Object.entries(content)) {
      const list = unpackPitch(c.x && c.x.pitch);
      if (!list.length) continue;
      const first = list[0];
      if (list.some((v) => v.k !== first.k || v.a !== first.a)) continue; // more than one pattern: no single right answer
      const n = morae(first.k).length;
      if (n < 2 || first.a > n) continue;
      const part = wordPart(c, "word");
      if (!part) continue;
      const r = prog[id];
      out.push({ cardId: id, deckId: deck.id, f: c.f, r: c.r || "", m: c.m || "", k: first.k, a: first.a, n, part, hasFile: !!part.file, learned: !!r && r.st !== NEW && !r.sus, order: c.o ?? 0 });
    }
  }
  return out;
}

/** Pairs with the same reading and different accents. At least one word of the pair is one you have started. */
export function minimalPairs(words) {
  const by = new Map();
  for (const w of words) { const l = by.get(w.k); if (l) l.push(w); else by.set(w.k, [w]); }
  const pairs = [];
  for (const list of by.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.a === b.a || a.f === b.f) continue;
        if (!a.learned && !b.learned) continue;
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

/** The accents to offer for a word of n morae: the right one and up to three others, spread over the four types. */
export function shapeOptions(n, accent, rand = Math.random) {
  const all = new Set([0, 1, n]); // heiban, atamadaka, odaka
  for (let i = 2; i < n; i++) all.add(i); // nakadaka
  all.delete(accent);
  const others = [...all];
  // keep the type variety: one of each type first, then fill up
  const typed = new Map();
  for (const a of others) { const t = pitchType("x".repeat(n), a); if (!typed.has(t)) typed.set(t, []); typed.get(t).push(a); }
  const picks = [];
  for (const list of typed.values()) picks.push(list[Math.floor(rand() * list.length)]);
  const opts = [accent, ...picks].slice(0, 4);
  // shuffle
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}

const shuffle = (a, rand) => { const o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };

/**
 * Build a session of up to `count` questions, alternating pairs (when there are any) and shapes.
 * `has(file)` tells whether the clip is on this device (async). Resolves to { questions, pairCount, wordCount }.
 */
export async function buildPitchSession(words, { count = 10, rand = Math.random, has = async () => true } = {}) {
  const ok = new Map();
  const clip = async (w) => { if (!ok.has(w.cardId)) ok.set(w.cardId, await has(w.part.file)); return ok.get(w.cardId); };
  const usable = [];
  for (const w of shuffle(words.filter((x) => x.hasFile), rand)) { if (await clip(w)) usable.push(w); if (usable.length >= 80) break; }
  const usableIds = new Set(usable.map((w) => w.cardId));
  const pairs = [];
  for (const [a, b] of shuffle(minimalPairs(words.filter((x) => x.hasFile)), rand)) {
    if ((usableIds.has(a.cardId) || await clip(a)) && (usableIds.has(b.cardId) || await clip(b))) pairs.push([a, b]);
    if (pairs.length >= 12) break;
  }
  // learned words first for the shape questions, but never run out
  const pool = [...shuffle(usable.filter((w) => w.learned), rand), ...shuffle(usable.filter((w) => !w.learned), rand)];
  const questions = [];
  let pi = 0, si = 0;
  const usedPair = new Set();
  while (questions.length < count && (pi < pairs.length || si < pool.length)) {
    const wantPair = questions.length % 2 === 0 && pi < pairs.length;
    if (wantPair) {
      const [a, b] = pairs[pi++];
      const key = [a.cardId, b.cardId].sort().join("|");
      if (usedPair.has(key)) continue;
      usedPair.add(key);
      const heard = rand() < 0.5 ? a : b;
      const options = rand() < 0.5 ? [a, b] : [b, a];
      questions.push({ kind: "pair", heard, options, answer: heard.cardId });
    } else if (si < pool.length) {
      const w = pool[si++];
      questions.push({ kind: "shape", word: w, options: shapeOptions(w.n, w.a, rand), answer: w.a });
    } else if (pi < pairs.length) {
      pi++; // only pairs left but it is a shape turn: take the next pair
      const [a, b] = pairs[pi - 1];
      const heard = rand() < 0.5 ? a : b;
      questions.push({ kind: "pair", heard, options: [a, b], answer: heard.cardId });
    }
  }
  return { questions, pairCount: pairs.length, wordCount: usable.length };
}
