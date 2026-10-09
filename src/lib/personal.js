// Connects what you have learned in your decks to lessons and practice.
import { KANJI_RE, kanjiOf } from "./jp.js";
import { currentRetrievability, REVIEW, LEARNING, RELEARNING, NEW } from "./fsrs.js";
import { surface, reading, ALL } from "../content/bank.js";

/** Kanji you can recognise: graduated cards in kanji decks, and kanji inside well-known words. */
export function knownKanjiSet(store) {
  const set = new Set();
  for (const deck of store.deckList()) {
    if (deck.kind !== "kanji" && deck.kind !== "vocab") continue;
    const content = store.content[deck.id];
    const prog = store.prog[deck.id];
    if (!content || !prog) continue;
    for (const [id, r] of Object.entries(prog)) {
      if (!r || r.st !== REVIEW || r.sus) continue;
      const c = content[id];
      if (!c) continue;
      if (deck.kind === "kanji") { for (const ch of c.f) if (KANJI_RE.test(ch)) set.add(ch); }
      else if (r.s >= 10) kanjiOf(c.f).forEach((k) => set.add(k));
    }
  }
  return set;
}

/** Weight for the sentence generators: practise words you are shaky on, avoid ones you haven't met. */
export function makeWeight(store, now = Date.now()) {
  const byKey = new Map();
  for (const deck of store.deckList()) {
    if (deck.kind !== "vocab" || deck.enabled === false) continue;
    const content = store.content[deck.id] || {};
    const prog = store.prog[deck.id] || {};
    for (const [id, c] of Object.entries(content)) {
      const r = prog[id];
      let w;
      if (!r || r.st === NEW) w = 0.5;
      else if (r.sus) w = 0.3;
      else if (r.st === LEARNING || r.st === RELEARNING) w = 3;
      else w = currentRetrievability(r, now) < 0.8 ? 3 : 1.5;
      byKey.set(c.f, Math.max(byKey.get(c.f) || 0, w));
      if (c.r) byKey.set(c.r, Math.max(byKey.get(c.r) || 0, w));
    }
  }
  const byId = new Map();
  for (const word of ALL) {
    const w = byKey.get(surface(word)) ?? byKey.get(reading(word));
    if (w != null) byId.set(word.id, w);
  }
  return (id) => byId.get(id) ?? 1;
}

/** Sentences from your own vocabulary cards (e.g. Kaishi) for reading practice. */
export function sentencePool(store, now = Date.now()) {
  const out = [];
  for (const deck of store.deckList()) {
    if (deck.kind !== "vocab" || deck.enabled === false) continue;
    const content = store.content[deck.id] || {};
    const prog = store.prog[deck.id] || {};
    for (const [id, r] of Object.entries(prog)) {
      const c = content[id];
      if (!c || !c.x || !c.x.sent || !c.x.sentE || !r || r.st === NEW || r.sus) continue;
      const rr = r.st === REVIEW ? currentRetrievability(r, now) : 0.4;
      out.push({ id, jp: c.x.sentF || c.x.sent, en: c.x.sentE, word: c.f, r: rr });
    }
  }
  return out;
}
