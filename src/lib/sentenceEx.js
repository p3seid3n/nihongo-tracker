// Mixed practice built from the example sentences on your own vocabulary cards.
// Only sentences made of words and grammar the lexicon can explain are used; anything you have not
// learned yet carries a short translation above it.
import { conjugate, segsToMarkup, KANJI_RE, FORMS } from "./jp.js";
import { currentRetrievability, REVIEW, NEW } from "./fsrs.js";
import { shuffle } from "../content/generators.js";
import { sentencePart } from "./audio.js";
import { buildLexicon, analyzeSentence, fit, tokenInfo, shortGloss, wordShape } from "./lexicon.js";

let counter = 0;
const nid = () => `s${++counter}`;
const uniq = (a) => [...new Set(a)];
const plainText = (m) => String(m).replace(/\[[^\]]*\]/g, "");

const MAX_GLOSSED = 4;
const MIN_TOKENS = 2;
const MAX_TOKENS = 16;

const isVerbEntry = (e) => /^to\b/i.test(e.m || "");
const catOf = (e) => (isVerbEntry(e) ? "verb" : e.f.endsWith("い") && e.f.length > 1 ? "iadj" : "noun");

// How a verb or adjective form can be confused with other forms (English tells them apart by tense or polarity)
const CONTRAST = {
  polite: ["polite-neg", "polite-past", "polite-past-neg"],
  "polite-neg": ["polite", "polite-past-neg", "polite-past"],
  "polite-past": ["polite", "polite-past-neg", "polite-neg"],
  "polite-past-neg": ["polite-past", "polite-neg", "polite"],
  neg: ["dict", "past", "past-neg"],
  past: ["dict", "neg", "past-neg"],
  "past-neg": ["past", "neg", "dict"],
  dict: ["neg", "past", "past-neg"],
  te: ["dict", "past", "neg"],
};
const ADJ_CONTRAST = { ...CONTRAST, adv: ["dict", "neg", "past"] };
const FINAL_PARTICLES = ["ね", "よ", "か", "わ", "ぞ", "ぜ", "さ", "な", "かな", "なあ", "ねえ"];

/** Markup with furigana for a dictionary word, e.g. 食[た]べる. */
export function entryMarkup(e) {
  if (!KANJI_RE.test(e.f)) return e.f;
  const shapes = wordShape(e.f, e.r, e.m);
  if (shapes.length) {
    const segs = conjugate(shapes[0], "dict");
    if (segs) return segsToMarkup(segs);
  }
  if ([...e.f].every((c) => KANJI_RE.test(c)) && e.r) return `${e.f}[${e.r}]`;
  return e.f;
}

/** Cards you have started that have a sentence with an English translation. */
export function startedSentences(store, now = Date.now()) {
  const out = [];
  for (const deck of store.deckList()) {
    if (deck.kind !== "vocab" || deck.enabled === false) continue;
    const content = store.content[deck.id] || {};
    const prog = store.prog[deck.id] || {};
    for (const [id, r] of Object.entries(prog)) {
      const c = content[id];
      if (!c || !c.x || !(c.x.sentF || c.x.sent) || !c.x.sentE || !r || r.st === NEW || r.sus) continue;
      out.push({ id, deckId: deck.id, card: c, en: c.x.sentE, r: r.st === REVIEW ? currentRetrievability(r, now) : 0.4 });
    }
  }
  return out;
}

export function displayTokens(toks, lex) {
  return toks.map((t) => ({ text: t.text, m: t.m, type: t.type, gloss: t.gloss || "", known: !!t.known, info: t.type === "word" || t.type === "grammar" ? tokenInfo(t, lex) : null }));
}

// ---------------------------------------------------------------------------
function chooseMeaning(S, allEn, rng) {
  const wrongs = shuffle(rng, uniq(allEn.filter((e) => e !== S.en))).slice(0, 3);
  if (wrongs.length < 3) return null;
  const options = shuffle(rng, [{ id: nid(), text: S.en, correct: true }, ...wrongs.map((w) => ({ id: nid(), text: w, correct: false }))]);
  return {
    id: nid(), kind: "choose", lessonId: "sentences", instruction: "What does this sentence mean?",
    prompt: { toks: S.toks }, options, explain: S.card.f ? `Word in focus: ${S.card.f}${S.card.m ? ` (${shortGloss(S.card.m)})` : ""}` : "",
  };
}

function chunkTiles(S) {
  const toks = S.tokens.filter((t) => t.type !== "punct");
  // sentence-final ね / よ / わ... are not in the English, so they are not asked for
  while (toks.length > 3) {
    const last = toks[toks.length - 1];
    if (last.type === "grammar" && ["ね", "よ", "わ", "ぞ", "ぜ", "さ", "なあ", "ねえ", "かな", "かしら"].includes(last.text)) toks.pop(); else break;
  }
  let tiles = toks.map((t) => ({ text: t.text, m: t.m, gloss: t.gloss || "", g: t.type === "grammar" && t.g && t.g.kind === "particle" }));
  if (tiles.length > 8) {
    const merged = [];
    for (const t of tiles) {
      const prev = merged[merged.length - 1];
      if (t.g && prev && !prev.g) { prev.text += t.text; prev.m += t.m; } else merged.push({ ...t });
    }
    tiles = merged;
  }
  return tiles.length >= 3 && tiles.length <= 8 ? tiles : null;
}

function buildSentence(S, pool, rng) {
  const tiles = chunkTiles(S);
  if (!tiles) return null;
  const have = new Set(tiles.map((t) => t.text));
  const particles = ["を", "に", "で", "が", "は", "も", "と", "の", "へ"].filter((p) => !have.has(p));
  const words = pool.filter((w) => !have.has(w.text));
  const extra = [];
  const nExtra = tiles.length > 4 ? 2 : 1;
  const wordPick = shuffle(rng, words)[0];
  if (wordPick) extra.push({ text: wordPick.text, m: wordPick.m, gloss: wordPick.gloss });
  const partPick = shuffle(rng, particles)[0];
  if (partPick && extra.length < nExtra) extra.push({ text: partPick, m: partPick, gloss: "" });
  const bank = [...tiles, ...extra].map((t) => ({ id: nid(), text: t.text, m: t.m, gloss: t.gloss }));
  let sh = shuffle(rng, bank);
  if (sh.length > 2 && sh.map((b) => b.text).join("") === tiles.map((t) => t.text).join("")) sh = sh.slice().reverse();
  return {
    id: nid(), kind: "build", lessonId: "sentences", instruction: "Translate this sentence",
    prompt: { en: S.en }, bank: sh, answer: tiles.map((t) => t.text), explain: "",
  };
}

function enWords(en) {
  return new Set(String(en || "").toLowerCase().match(/[a-z]{3,}/g) || []);
}

function gapWord(S, lex, rng) {
  // prefer the word of the card the sentence belongs to
  const cands = S.tokens.map((t, i) => ({ t, i })).filter(({ t }) => t.type === "word" && !t.form && t.entry && !t.entry.bank && !isVerbEntry(t.entry) && t.known);
  if (!cands.length) return null;
  const focus = cands.find(({ t }) => t.entry.cardId === S.id) || shuffle(rng, cands)[0];
  const { t, i } = focus;
  const cat = catOf(t.entry);
  const inSentence = new Set(S.tokens.map((x) => x.text));
  const sentenceEn = enWords(S.en);
  const kanjiLike = KANJI_RE.test(t.text);
  const len = [...t.text].length;
  const pool = lex.entries.filter((e) => {
    if (!e.learned || e.bank || !e.deckEnabled || e.f === t.text || inSentence.has(e.f)) return false;
    if (catOf(e) !== cat) return false;
    if (KANJI_RE.test(e.f) !== kanjiLike) return false;
    if (Math.abs([...e.f].length - len) > 1) return false;
    const g = shortGloss(e.m).toLowerCase().match(/[a-z]{3,}/g) || [];
    if (g.some((w) => sentenceEn.has(w))) return false;
    return true;
  });
  const wrongs = [];
  const seen = new Set([t.text]);
  for (const e of shuffle(rng, pool)) {
    if (seen.has(e.f)) continue;
    seen.add(e.f);
    wrongs.push(e);
    if (wrongs.length === 3) break;
  }
  if (wrongs.length < 3) return null;
  const options = shuffle(rng, [{ id: nid(), text: t.m, correct: true, jp: true }, ...wrongs.map((e) => ({ id: nid(), text: entryMarkup(e), correct: false, jp: true }))]);
  return {
    id: nid(), kind: "choose", lessonId: "sentences", instruction: "Fill in the gap",
    prompt: { toks: S.toks, blank: i, en: S.en }, options, explain: `${S.markup} · ${S.en}`,
  };
}

/** Other forms of the same word that the English translation rules out. */
function formAlternatives(tok) {
  const e = tok.entry;
  if (!e || e.bank) return null;
  const observed = tok.form || (tok.text === e.f ? "dict" : null);
  if (!observed) return null;
  const cat = catOf(e);
  if (cat === "noun") return null;
  // an い ending alone does not prove an adjective (違い, 申し訳ない), so adjectives only count when you see a real form of them
  if (cat === "iadj" && observed === "dict") return null;
  if (cat === "verb" && observed === "dict" && !"うくぐすつぬぶむる".includes(e.f.slice(-1))) return null; // ください is not a dictionary form
  const table = cat === "iadj" ? ADJ_CONTRAST : CONTRAST;
  const alts = table[observed];
  if (!alts) return null;
  const shapes = wordShape(e.f, e.r, e.m);
  if (e.r && e.r !== e.f) shapes.push(...shapes.filter((s) => s.w).map((s) => ({ w: "", k: "", ok: e.r, cls: s.cls })));
  for (const shape of shapes) {
    const own = conjugate(shape, observed);
    if (!own || own.map((s) => s.t).join("") !== tok.text) continue;
    const out = [];
    for (const f of alts) {
      const segs = conjugate(shape, f);
      if (!segs) continue;
      const text = segs.map((s) => s.t).join("");
      if (!text || text === tok.text || out.some((o) => o.text === text)) continue;
      out.push({ form: f, text, m: segsToMarkup(segs) });
    }
    if (out.length >= 2) return { observed, alts: out.slice(0, 3) };
  }
  return null;
}

/** The word that ends the clause (before ね, よ, か ...): there the English translation shows tense and polarity. */
function predicateIndex(S) {
  let i = S.tokens.length - 1;
  while (i >= 0) {
    const t = S.tokens[i];
    if (t.type === "punct" || (t.type === "grammar" && FINAL_PARTICLES.includes(t.text))) i--; else break;
  }
  return i;
}

function formTokens(S) {
  const last = predicateIndex(S);
  return S.tokens
    .map((t, i) => {
      if (t.type !== "word" || !t.known) return { t, i, alt: null };
      const alt = formAlternatives(t);
      if (!alt) return { t, i, alt: null };
      // te-forms are tested where something follows (〜てください); every other form only at the end of the sentence
      if (alt.observed === "te" ? i >= last : i !== last) return { t, i, alt: null };
      return { t, i, alt };
    })
    .filter((x) => x.alt);
}

function gapForm(S, rng) {
  const c = formTokens(S);
  if (!c.length) return null;
  const { t, i, alt } = shuffle(rng, c)[0];
  const options = shuffle(rng, [{ id: nid(), text: t.m, correct: true, jp: true }, ...alt.alts.map((a) => ({ id: nid(), text: a.m, correct: false, jp: true }))]);
  return {
    id: nid(), kind: "choose", lessonId: "sentences", instruction: "Choose the right form",
    prompt: { toks: S.toks, blank: i, en: S.en }, options,
    explain: `${plainText(t.m)} is the ${FORMS[alt.observed] || alt.observed}. ${S.markup} · ${S.en}`,
  };
}

function versionChoice(S, rng) {
  const c = formTokens(S);
  if (!c.length) return null;
  const { t, i, alt } = shuffle(rng, c)[0];
  const swap = (m) => S.tokens.map((x, k) => (k === i ? m : x.m)).join("");
  const options = shuffle(rng, [{ id: nid(), text: S.markup, correct: true, jp: true }, ...alt.alts.slice(0, 2).map((a) => ({ id: nid(), text: swap(a.m), correct: false, jp: true }))]);
  if (new Set(options.map((o) => o.text.replace(/\[[^\]]*\]/g, ""))).size !== options.length) return null;
  return {
    id: nid(), kind: "choose", lessonId: "sentences", instruction: "Which sentence matches the translation?",
    prompt: { text: S.en, noFuri: true }, options, explain: `${plainText(t.m)} is the ${FORMS[alt.observed] || alt.observed}.`,
  };
}

function matchWords(sentences, rng) {
  const seen = new Set();
  const pairs = [];
  for (const S of shuffle(rng, sentences)) {
    for (const t of S.tokens) {
      if (t.type !== "word" || !t.entry || t.entry.bank || seen.has(t.entry.f)) continue;
      seen.add(t.entry.f);
      pairs.push({ id: nid(), jp: entryMarkup(t.entry), en: shortGloss(t.entry.m, 22), key: t.entry.f });
      break;
    }
    if (pairs.length >= 5) break;
  }
  if (pairs.length < 4 || new Set(pairs.map((p) => p.en)).size !== pairs.length) return null;
  return { id: nid(), kind: "match", lessonId: "sentences", instruction: "Match the words", pairs, left: shuffle(rng, pairs), right: shuffle(rng, pairs) };
}

// ---------------------------------------------------------------------------
/**
 * Build a session of mixed exercises. Returns { list, stats } where stats says how many sentences were usable.
 * `rng` is a () => number in [0,1).
 */
export function buildSentenceSession(store, rng, { n = 10, now = Date.now() } = {}) {
  const started = startedSentences(store, now);
  if (started.length < 3) return { list: [], usable: 0 };
  const lex = buildLexicon(store, now);
  const allEn = uniq(started.map((s) => s.en));
  const ranked = shuffle(rng, started).sort((a, b) => a.r - b.r + (rng() - 0.5) * 0.3);

  const usable = [];
  const seenEn = new Set();
  for (const c of ranked) {
    if (usable.length >= 14) break;
    if (seenEn.has(c.en)) continue;
    const a = analyzeSentence(c.card, lex);
    if (!a) continue;
    const f = fit(a.tokens);
    if (f.unknown || f.glossed > MAX_GLOSSED || f.content < MIN_TOKENS || f.content > MAX_TOKENS || a.text.length > 44) continue;
    seenEn.add(c.en);
    usable.push({ ...c, ...a, markup: a.markup, toks: displayTokens(a.tokens, lex), glossed: f.glossed });
  }
  if (usable.length < 3) return { list: [], usable: usable.length };
  // fewer glosses first: calmer sentences, but still random among them
  usable.sort((a, b) => a.glossed - b.glossed + (rng() - 0.5) * 2);

  const wordPool = [];
  for (const S of usable) for (const t of S.tokens) if (t.type === "word" && t.known && t.entry) wordPool.push({ text: t.text, m: t.m, gloss: "" });

  const make = {
    choose: (S) => chooseMeaning(S, allEn, rng),
    build: (S) => buildSentence(S, wordPool, rng),
    gap: (S) => gapWord(S, lex, rng),
    form: (S) => (rng() < 0.5 ? gapForm(S, rng) || versionChoice(S, rng) : versionChoice(S, rng) || gapForm(S, rng)),
  };
  const plan = ["choose", "gap", "form", "build", "choose", "form", "gap", "build", "choose", "form", "gap", "build"];
  const out = [];
  const m = matchWords(usable, rng);
  if (m) out.push(m);
  const used = new Map(); // sentence id -> { n, kinds }
  let cursor = 0;
  for (const kind of [...plan, ...plan]) {
    if (out.length >= n) break;
    for (let tries = 0; tries < usable.length; tries++) {
      const S = usable[(cursor + tries) % usable.length];
      const u = used.get(S.id) || { n: 0, kinds: new Set() };
      if (u.n >= 2 || u.kinds.has(kind)) continue; // each sentence at most twice, never the same type twice
      const ex = make[kind](S);
      if (!ex) continue;
      u.n++; u.kinds.add(kind); used.set(S.id, u);
      cursor = (cursor + tries + 1) % usable.length;
      ex.recap = { toks: S.toks, en: S.en, part: sentencePart(S.card) };
      out.push(ex);
      break;
    }
  }
  // gentle order: matching, reading, gaps and forms, then writing
  const rank = (e) => (e.kind === "match" ? 0 : e.kind === "build" ? 3 : /gap|form/i.test(e.instruction) || e.instruction.startsWith("Which") ? 2 : 1);
  const list = out.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i).map((x) => x.e);
  return { list: list.slice(0, n), usable: usable.length };
}
