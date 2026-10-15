// Furigana for a word from its spelling and reading: which kana belong to which kanji.
//
// 手伝う + てつだう → 手伝[てつだ]う: kana in the word must match kana in the reading, the kanji runs take what is
// between. A run of several kanji (手伝, 日本語) is then split per kanji when the readings of those kanji are known
// from your other words (手[て]伝[つだ]う), allowing for sound changes (rendaku: か→が, sokuon: つ→っ).
// When nothing fits, the whole run gets the whole reading, and a word that can't be aligned gets none.
import { KANJI_RE, parseFuri } from "./jp.js";

const toHira = (s) => String(s).replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Split a word into runs: [{ t, kanji }] */
export function runs(word) {
  const out = [];
  for (const ch of String(word)) {
    const k = KANJI_RE.test(ch);
    const last = out[out.length - 1];
    if (last && last.kanji === k) last.t += ch; else out.push({ t: ch, kanji: k });
  }
  return out;
}

const DAKU = { か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご", さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ", た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど", は: "ばぱ", ひ: "びぴ", ふ: "ぶぷ", へ: "べぺ", ほ: "ぼぽ" };

/** A reading and the ways it can sound inside a compound. */
function variants(r, first, last) {
  const out = new Set([r]);
  if (!first) for (const v of DAKU[r[0]] || "") out.add(v + r.slice(1));
  if (!last && r.length > 1 && "つくちき".includes(r[r.length - 1])) for (const v of [...out]) out.add(v.slice(0, -1) + "っ");
  if (r.length > 1 && r.endsWith("う") && !last) for (const v of [...out]) out.add(v.slice(0, -1) + "ゅう");
  return [...out];
}

/** Split a kanji run per kanji using known readings. Returns [{t, r}] or null. At most one kanji may be unknown. */
function splitRun(run, reading, known) {
  const chars = [...run];
  if (chars.length < 2 || !known) return null;
  const best = { v: null };
  const go = (ci, ri, acc, unknownUsed) => {
    if (best.v) return;
    if (ci === chars.length) { if (ri === reading.length) best.v = acc; return; }
    const ch = chars[ci];
    const cands = known.get(ch);
    const first = ci === 0, last = ci === chars.length - 1;
    if (ch === "々" && ci > 0) {
      const prev = acc[acc.length - 1].r;
      for (const v of variants(prev, false, last)) if (reading.startsWith(v, ri)) go(ci + 1, ri + v.length, [...acc, { t: ch, r: v }], unknownUsed);
    }
    if (cands) for (const c of cands) for (const v of variants(c, first, last)) if (reading.startsWith(v, ri)) go(ci + 1, ri + v.length, [...acc, { t: ch, r: v }], unknownUsed);
    if (!unknownUsed) {
      // one kanji without a known reading takes 1–4 kana, as long as the rest can still be read
      for (let n = 1; n <= 4 && ri + n <= reading.length - (chars.length - ci - 1); n++) go(ci + 1, ri + n, [...acc, { t: ch, r: reading.slice(ri, ri + n) }], true);
    }
  };
  go(0, 0, [], false);
  return best.v;
}

/**
 * Furigana markup for a word: 手伝う + てつだう → "手[て]伝[つだ]う" (or "手伝[てつだ]う" when the kanji can't be split).
 * `known` (optional) is a Map kanji → Set of readings. Returns null when the reading doesn't fit the spelling.
 */
export function furiganaFor(word, reading, known = null) {
  const w = String(word || "").trim();
  let r = String(reading || "").trim().split(/[、,/／;；・\s]+/)[0] || "";
  if (!w || !r || !KANJI_RE.test(w)) return null;
  r = toHira(r);
  const parts = runs(w);
  const pattern = "^" + parts.map((p) => (p.kanji ? "(.+?)" : esc(toHira(p.t)))).join("") + "$";
  let m;
  try { m = new RegExp(pattern).exec(r); } catch { m = null; }
  if (!m) return null;
  let g = 1;
  let out = "";
  for (const p of parts) {
    if (!p.kanji) { out += p.t; continue; }
    const rr = m[g++];
    const split = splitRun(p.t, rr, known);
    out += split ? split.map((x) => `${x.t}[${x.r}]`).join("") : `${p.t}[${rr}]`;
  }
  return out;
}

/** Learn which kanji read how from furigana markup ("私[わたし]は 学生[がくせい]") into `known`. */
export function learnReadings(markup, known) {
  for (const s of parseFuri(markup || "")) {
    if (s.r == null || !s.t) continue;
    const ks = [...s.t];
    if (ks.length === 1 && KANJI_RE.test(ks[0])) {
      const set = known.get(ks[0]) || new Set();
      set.add(toHira(s.r));
      known.set(ks[0], set);
    }
  }
}

/** Readings of kanji collected from the user's own vocabulary (single-kanji parts of words and sentences). */
export function readingsFromCards(cards) {
  const known = new Map();
  for (const c of cards) {
    if (!c || !c.f) continue;
    const x = c.x || {};
    if (x.wf) learnReadings(x.wf, known);
    if (x.sentF) learnReadings(x.sentF, known);
    const f = furiganaFor(c.f, c.r);
    if (f) learnReadings(f, known);
  }
  return known;
}

/** Furigana for a card: the deck's own per-kanji furigana when it has it, otherwise worked out. */
export function cardFurigana(card, known) {
  if (!card || !KANJI_RE.test(card.f || "")) return null;
  const wf = card.x && card.x.wf;
  // a deck's furigana that splits per kanji is best; one bracket over a long run can still be refined
  const fromDeck = wf && /\[/.test(wf) && parseFuri(wf).map((s) => s.t).join("") === card.f ? wf : null;
  if (fromDeck) {
    const segs = parseFuri(fromDeck);
    if (segs.every((s) => s.r == null || [...s.t].length === 1)) return fromDeck;
  }
  return furiganaFor(card.f, card.r || (fromDeck ? parseFuri(fromDeck).map((s) => s.r ?? s.t).join("") : ""), known) || fromDeck;
}
