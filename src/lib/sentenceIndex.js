// An index of sentences from your own cards, so a word can be seen in several contexts.
// A sentence is offered for a word only when every other word and grammar point in it is
// something you already know ("i+1": the word being reviewed is the only new thing).
import { buildLexicon, analyzeSentence } from "./lexicon.js";
import { startedSentences } from "./sentenceEx.js";

const MAX_PER_WORD = 6;

/** Work through the sentences in small steps so the screen stays responsive. */
export class SentenceIndex {
  constructor(store, now = Date.now(), lex = null) {
    this.store = store;
    this.now = now;
    this.lex = lex;
    this.map = new Map(); // cardId -> [{ ownerId, card, markup, en }]
    this.items = null;
    this.pos = 0;
    this.done = false;
    this._timer = null;
  }

  _init() {
    if (this.items) return;
    if (!this.lex) this.lex = buildLexicon(this.store, this.now);
    this.items = startedSentences(this.store, this.now);
  }

  _add(item) {
    const a = analyzeSentence(item.card, this.lex);
    if (!a) return;
    const toks = a.tokens.filter((t) => t.type !== "punct");
    const targets = new Set(toks.filter((t) => t.type === "word" && t.entry && t.entry.cardId && t.entry.cardId !== item.id).map((t) => t.entry.cardId));
    for (const target of targets) {
      const others = toks.filter((t) => !(t.type === "word" && t.entry && t.entry.cardId === target));
      if (others.some((t) => t.type === "unknown" || t.known === false)) continue;
      const list = this.map.get(target) || [];
      if (list.length >= MAX_PER_WORD) continue;
      list.push({ ownerId: item.id, card: item.card, markup: item.card.x.sentF || item.card.x.sent, en: item.en, len: a.text.length });
      this.map.set(target, list);
    }
  }

  /** Process for up to `ms` milliseconds. Returns true when everything is indexed. */
  step(ms = 12) {
    this._init();
    const end = (typeof performance !== "undefined" ? performance.now() : Date.now()) + ms;
    while (this.pos < this.items.length) {
      this._add(this.items[this.pos++]);
      if ((typeof performance !== "undefined" ? performance.now() : Date.now()) > end) return false;
    }
    this.done = true;
    for (const list of this.map.values()) list.sort((a, b) => a.len - b.len);
    return true;
  }

  /** Index everything at once (tests, small decks). */
  finish() { while (!this.step(50)) { /* keep going */ } return this; }

  /** Start background indexing; `onDone` runs when finished. */
  start(onDone) {
    const tick = () => {
      this._timer = null;
      if (this.step(10)) { if (onDone) onDone(this); return; }
      this._timer = setTimeout(tick, 0);
    };
    this._timer = setTimeout(tick, 60);
    return this;
  }
  cancel() { if (this._timer) clearTimeout(this._timer); this._timer = null; }

  /** Other sentences for a card (never its own). */
  get(cardId) { return this.map.get(cardId) || []; }
}

/**
 * Which sentence to show on this review: the card's own first, then the others in turn.
 * `reps` is how many times the card has been answered, so each review brings a different one.
 */
export function pickSentence(card, alts, reps = 0) {
  const own = card?.x && (card.x.sentF || card.x.sent) ? { ownerId: null, card, markup: card.x.sentF || card.x.sent, en: card.x.sentE || "" } : null;
  const all = own ? [own, ...alts] : alts.slice();
  if (!all.length) return null;
  return all[Math.max(0, reps) % all.length];
}
