// Recall ("production") cards: you see the meaning and give the Japanese word.
import { toKana, toHiragana } from "./romaji.js";
import { plainOf } from "./jp.js";

const SPLIT = /[、,;\/・]|\s+or\s+/;

/** Strip everything that should not matter when comparing answers. */
export function normalizeKana(s) {
  return toHiragana(String(s ?? "").normalize("NFKC")).replace(/[\s　〜~・、。,.!?！？「」『』()（）\[\]]/g, "");
}

/** Everything that counts as a correct answer: each reading, plus the written form. */
export function answerKeys(card) {
  const keys = new Set();
  const add = (v) => { const n = normalizeKana(v); if (n) keys.add(n); };
  for (const part of String(card.r || "").split(SPLIT)) add(part);
  const written = plainOf(card.f || "");
  add(written);
  return [...keys];
}

export function editDistance(a, b) {
  const A = [...a], B = [...b];
  if (!A.length) return B.length;
  if (!B.length) return A.length;
  let prev = Array.from({ length: B.length + 1 }, (_, i) => i);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[B.length];
}

/**
 * Judge a typed answer. Romaji is converted to kana first.
 * Returns { verdict: "exact" | "close" | "wrong" | "empty", grade, typed } where grade is the suggested rating.
 */
export function checkRecall(raw, card) {
  const typed = normalizeKana(toKana(String(raw ?? "").trim(), { final: true }));
  if (!typed) return { verdict: "empty", grade: 1, typed: "" };
  const keys = answerKeys(card);
  if (keys.includes(typed)) return { verdict: "exact", grade: 3, typed };
  // one slip in a word of four or more kana is "close": right idea, wrong spelling
  const near = keys.some((k) => [...k].length >= 4 && editDistance(k, typed) === 1);
  if (near) return { verdict: "close", grade: 2, typed };
  return { verdict: "wrong", grade: 1, typed };
}

/** Does a card qualify for a recall card yet? `rec` is the recognition card's record. */
export function recallEligible(deck, card, rec, cfg) {
  if (!cfg.recall || !deck || deck.kind !== "vocab" || !card || !rec || rec.sus) return false;
  if (rec.st !== 2 || !(rec.s >= cfg.recallAfter)) return false;
  if (!card.m || !String(card.m).trim()) return false;
  const keys = answerKeys(card);
  return keys.some((k) => /[ぁ-ゖー]/.test(k));
}
