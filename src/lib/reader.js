// Graded reader: how much of a text you already know, and which text to read next.
import { analyzeSentence } from "./lexicon.js";
import { displayTokens } from "./sentenceEx.js";

/** Read a passage against your lexicon. coverage = share of words and grammar you already know. */
export function analyzePassage(passage, lex) {
  let total = 0, known = 0;
  const lines = [];
  const fresh = new Map(); // key -> new thing
  for (const [jp, en] of passage.lines) {
    const a = analyzeSentence({ x: { sentF: jp } }, lex);
    if (!a) { lines.push({ jp, en, toks: [] }); continue; }
    for (const t of a.tokens) {
      if (t.type === "punct") continue;
      total++;
      if (t.type === "unknown") {
        if (!fresh.has(t.text)) fresh.set(t.text, { kind: "unknown", text: t.text, meaning: "" });
      } else if (t.known) known++;
      else if (t.type === "word") {
        const e = t.entry;
        const key = e.learned ? `form:${t.text}` : `word:${e.f}`;
        if (!fresh.has(key)) fresh.set(key, e.learned
          ? { kind: "form", text: t.text, meaning: t.gloss }
          : { kind: "word", text: e.f, reading: e.r, meaning: e.m, gloss: e.gloss });
      } else if (t.type === "grammar") {
        const key = `g:${t.text}`;
        if (!fresh.has(key)) fresh.set(key, { kind: "grammar", text: t.text, meaning: t.g.gloss, lesson: t.g.lessonTitle });
      }
    }
    lines.push({ jp, en, toks: displayTokens(a.tokens, lex) });
  }
  return { id: passage.id, passage, lines, total, known, coverage: total ? known / total : 1, fresh: [...fresh.values()] };
}

export const TARGET = 0.94;

/**
 * Research on reading suggests 95-98% known words for comfortable reading on your own. These texts are short
 * (every new word is a few percent) and every new word is glossed, so the bands are a little more forgiving:
 * easy 97%+, good fit 90-97%, a stretch 80-90%, hard below.
 */
export const BANDS = { easy: 0.97, sweet: 0.9, stretch: 0.8 };
export function coverageBand(c) {
  return c >= BANDS.easy ? "easy" : c >= BANDS.sweet ? "sweet" : c >= BANDS.stretch ? "stretch" : "hard";
}
export const BAND_LABEL = { easy: "Easy", sweet: "Good fit", stretch: "A stretch", hard: "Too hard for now" };

/** The text to suggest: not read yet, close to the target; if everything is read, the best fit again. */
export function recommend(results, isRead) {
  const pool = results.filter((r) => !isRead(r.id));
  const list = pool.length ? pool : results;
  const ok = list.filter((r) => r.coverage >= BANDS.stretch);
  const pick = (arr) => arr.slice().sort((a, b) => Math.abs(a.coverage - TARGET) - Math.abs(b.coverage - TARGET) || a.passage.level - b.passage.level)[0];
  if (ok.length) return pick(ok);
  return list.slice().sort((a, b) => b.coverage - a.coverage || a.passage.level - b.passage.level)[0] || null;
}

/** Order for the list: unread first by fit, then the ones already read. */
export function orderPassages(results, isRead) {
  const dist = (r) => Math.abs(r.coverage - TARGET);
  return results.slice().sort((a, b) => (isRead(a.id) - isRead(b.id)) || (dist(a) - dist(b)) || a.passage.level - b.passage.level);
}
