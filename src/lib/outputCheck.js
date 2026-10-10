// Output practice: check what you wrote against the words and grammar you know.
// It cannot judge whether Japanese is correct, only what you used and whether you have met it.
import { tokenize } from "./lexicon.js";

export function checkOutput(text, lex, wanted = []) {
  const clean = String(text || "").replace(/\r/g, "").trim();
  if (!clean) return null;
  const toks = tokenize(clean, lex) || [];
  const content = toks.filter((t) => t.type !== "punct");
  const known = [], notYet = [], notFound = [], grammarNew = [];
  const seen = new Set();
  let knownN = 0;
  for (const t of content) {
    if (t.type === "unknown") {
      if (!seen.has("u" + t.text)) { seen.add("u" + t.text); notFound.push(t.text); }
      continue;
    }
    if (t.known) { knownN++; if (t.type === "word" && t.entry) known.push(t.entry); continue; }
    if (t.type === "grammar") {
      if (!seen.has("g" + t.text)) { seen.add("g" + t.text); grammarNew.push({ text: t.text, meaning: t.g.gloss, lesson: t.g.lessonTitle }); }
    } else if (t.type === "word") {
      const key = "w" + t.entry.f + (t.form || "");
      if (!seen.has(key)) { seen.add(key); notYet.push({ text: t.text, meaning: t.entry.gloss || t.entry.m, form: t.form ? t.gloss : "" }); }
    }
  }
  const used = new Set(known.map((e) => e.cardId).filter(Boolean));
  for (const t of content) if (t.type === "word" && t.entry?.cardId) used.add(t.entry.cardId);
  const wantedUsed = wanted.filter((w) => used.has(w.cardId));
  return {
    total: content.length, known: knownN, notYet, notFound, grammarNew, wantedUsed,
    sentences: clean.split(/[。！？!?\n]+/).map((s) => s.trim()).filter(Boolean).length,
    share: content.length ? knownN / content.length : 1,
  };
}

/** Learned words you are least sure of, as ideas to use in what you write. */
export function wordsToTry(lex, store, now = Date.now(), n = 6, rng = Math.random) {
  const out = [];
  for (const e of lex.entries) {
    if (!e.learned || !e.cardId || e.bank) continue;
    const r = store.rec(e.cardId);
    if (!r || r.sus) continue;
    const c = e.card || {};
    if (!c.m || !e.r) continue;
    out.push({ cardId: e.cardId, f: e.f, r: e.r, m: e.gloss || e.m, score: r.st === 2 ? Math.min(1, Math.max(0, (now - r.last) / Math.max(1, r.s * 864e5))) : 1.2, s: r.s || 0 });
  }
  // longest overdue relative to stability first, with a little randomness so the list is not always the same
  return out.sort((a, b) => b.score - a.score || a.s - b.s).slice(0, n * 3).sort(() => rng() - 0.5).slice(0, n);
}
