// Explains an answer in the exercises: what was wrong, why, and how to put it right.
//
// Works from what the exercise knows: the tiles of the correct sentence, which of them are particles, the form a
// verb was asked in and the form you picked, the meanings of the words. The output is a short list of points
// (plain text with **bold** and furigana markup) plus the corrected sentence and a word-by-word breakdown.
import { plainOf, FORMS } from "./jp.js";
import { GRAMMAR, shortGloss } from "./lexicon.js";
import { ALL, surface } from "../content/bank.js";

// ---------------------------------------------------------------------------
// what each particle does
export const PARTICLES = {
  は: { name: "topic", does: "marks the topic, what the sentence is about (“as for …”)" },
  が: { name: "subject", does: "marks the subject: who or what does it or is it, often the new or important part" },
  を: { name: "object", does: "marks the direct object, the thing an action is done to" },
  に: { name: "target", does: "marks a point: where you go, when something happens, where something is, or who receives it" },
  へ: { name: "direction", does: "marks the direction you move towards" },
  で: { name: "place of action or means", does: "marks where an action happens, or what you do it with" },
  と: { name: "with / and", does: "joins nouns (“and”) or marks who you do something with" },
  も: { name: "also", does: "means “also” or “too” and takes the place of は, が or を" },
  の: { name: "of", does: "links two nouns: the first owns or describes the second (X の Y = X's Y)" },
  か: { name: "question", does: "turns the sentence into a question" },
  から: { name: "from / because", does: "marks a starting point (“from”) or, after a clause, a reason" },
  まで: { name: "until", does: "marks an end point (“until”, “as far as”)" },
  や: { name: "and (among others)", does: "lists some examples out of more (“A, B and so on”)" },
  より: { name: "than", does: "marks what something is compared with (“than”)" },
  ね: { name: "right?", does: "at the end, asks for agreement (“…, right?”)" },
  よ: { name: "you know", does: "at the end, tells the listener something new" },
};
const isParticle = (t) => Object.prototype.hasOwnProperty.call(PARTICLES, t);

// what each form means and how to make it, per kind of word
export const FORM_MEANING = {
  dict: "plain present: “does / will do”", neg: "plain negative: “doesn't”", past: "plain past: “did”", "past-neg": "plain past negative: “didn't”",
  polite: "polite present: “does / will do”", "polite-neg": "polite negative: “doesn't”", "polite-past": "polite past: “did”", "polite-past-neg": "polite past negative: “didn't”",
  te: "te-form: links to what follows (and, please, -ing)", stem: "ます-stem", potential: "“can do”", volitional: "“let's / I will”", imperative: "a blunt command",
  tai: "“want to”", passive: "passive: “is done (to)”", causative: "“make / let someone do”", ba: "“if”", tara: "“if / when”", adv: "an adverb (“-ly”)", mod: "before a noun",
};
const U_ROWS = { う: ["わ", "い", "え", "お"], く: ["か", "き", "け", "こ"], ぐ: ["が", "ぎ", "げ", "ご"], す: ["さ", "し", "せ", "そ"], つ: ["た", "ち", "て", "と"], ぬ: ["な", "に", "ね", "の"], ぶ: ["ば", "び", "べ", "ぼ"], む: ["ま", "み", "め", "も"], る: ["ら", "り", "れ", "ろ"] };
const TA = { う: "った", つ: "った", る: "った", む: "んだ", ぶ: "んだ", ぬ: "んだ", く: "いた", ぐ: "いだ", す: "した" };

/** How to build `form` from a word of class `cls` (ru | u | iku | suru | kuru | aru | iadj | ii | nadj | noun), with the word itself as the example. */
export function formRule(form, cls, word = "") {
  const w = word || "";
  const last = w.slice(-1);
  const row = U_ROWS[last];
  const verb = ["ru", "u", "iku", "suru", "kuru", "aru"].includes(cls);
  const stemOf = () => (cls === "ru" ? w.slice(0, -1) : cls === "suru" ? w.replace(/する$/, "し") : cls === "kuru" ? w.replace(/来る$|くる$/, (m) => (m === "来る" ? "来" : "き")) : row ? w.slice(0, -1) + row[1] : w);
  const classNote = cls === "ru" ? "a る-verb" : cls === "u" || cls === "iku" ? "an う-verb" : cls === "suru" ? "a する-verb" : cls === "kuru" ? "irregular (来る)" : cls === "iadj" || cls === "ii" ? "an い-adjective" : cls === "nadj" ? "a な-adjective" : "";
  const out = (how) => `${w ? `**${w}** is ${classNote}. ` : ""}${how}`;
  if (verb) {
    switch (form) {
      case "neg": return out(cls === "ru" ? "Drop る and add ない." : cls === "suru" ? "する becomes しない." : cls === "kuru" ? "来る becomes 来[こ]ない." : cls === "aru" ? "ある becomes ない." : `Change the final ${last} to ${row ? row[0] : "the あ-sound"} and add ない${last === "う" ? " (う becomes わ)" : ""}.`);
      case "past": return out(cls === "ru" ? "Drop る and add た." : cls === "suru" ? "する becomes した." : cls === "kuru" ? "来る becomes 来[き]た." : cls === "iku" ? "行く is the exception: 行った." : `A word ending in ${last} takes ${TA[last] || "た"} in place of ${last}.`);
      case "te": return out(cls === "ru" ? "Drop る and add て." : cls === "suru" ? "する becomes して." : cls === "kuru" ? "来る becomes 来[き]て." : cls === "iku" ? "行く is the exception: 行って." : `A word ending in ${last} takes ${(TA[last] || "た").replace("た", "て").replace("だ", "で")} in place of ${last}.`);
      case "past-neg": return out("Make the negative (〜ない), then ない becomes なかった.");
      case "polite": return out(`Take the ます-stem (${stemOf()}) and add ます.`);
      case "polite-neg": return out(`Take the ます-stem (${stemOf()}) and add ません.`);
      case "polite-past": return out(`Take the ます-stem (${stemOf()}) and add ました.`);
      case "polite-past-neg": return out(`Take the ます-stem (${stemOf()}) and add ませんでした.`);
      case "stem": return out(cls === "ru" ? "Drop る." : `Change the final ${last} to its い-sound (${row ? row[1] : ""}).`);
      case "potential": return out(cls === "ru" ? "Drop る and add られる." : cls === "suru" ? "する becomes できる." : cls === "kuru" ? "来る becomes 来[こ]られる." : `Change ${last} to ${row ? row[2] : "the え-sound"} and add る.`);
      case "volitional": return out(cls === "ru" ? "Drop る and add よう." : cls === "suru" ? "する becomes しよう." : cls === "kuru" ? "来る becomes 来[こ]よう." : `Change ${last} to ${row ? row[3] : "the お-sound"} and add う.`);
      case "passive": return out(cls === "ru" ? "Drop る and add られる." : cls === "suru" ? "する becomes される." : cls === "kuru" ? "来る becomes 来[こ]られる." : `Change ${last} to ${row ? row[0] : "the あ-sound"} and add れる.`);
      case "causative": return out(cls === "ru" ? "Drop る and add させる." : cls === "suru" ? "する becomes させる." : cls === "kuru" ? "来る becomes 来[こ]させる." : `Change ${last} to ${row ? row[0] : "the あ-sound"} and add せる.`);
      case "ba": return out(cls === "ru" ? "Drop る and add れば." : `Change ${last} to ${row ? row[2] : "the え-sound"} and add ば.`);
      case "tara": return out("Make the past form (〜た) and add ら.");
      case "imperative": return out(cls === "ru" ? "Drop る and add ろ." : cls === "suru" ? "する becomes しろ." : cls === "kuru" ? "来る becomes 来[こ]い." : `Change ${last} to ${row ? row[2] : "the え-sound"}.`);
      case "tai": return out(`Take the ます-stem (${stemOf()}) and add たい.`);
      case "dict": return out("The dictionary form is the word as you'd look it up.");
      default: return out("");
    }
  }
  if (cls === "iadj" || cls === "ii") {
    const base = cls === "ii" ? "よ" : w.slice(0, -1);
    const ex = cls === "ii" ? " (いい uses よ: よくない, よかった)" : "";
    switch (form) {
      case "neg": return out(`Replace the final い with くない (${base}くない)${ex}.`);
      case "past": return out(`Replace the final い with かった (${base}かった)${ex}.`);
      case "past-neg": return out(`Replace the final い with くなかった (${base}くなかった)${ex}.`);
      case "te": return out(`Replace the final い with くて (${base}くて).`);
      case "adv": return out(`Replace the final い with く (${base}く).`);
      case "polite": return out("Add です to the plain form.");
      case "polite-neg": return out(`Make the negative (${base}くない) and add です, or say ${base}くありません.`);
      case "polite-past": return out(`Make the past (${base}かった) and add です. Never 〜いでした.`);
      default: return out("");
    }
  }
  if (cls === "nadj" || cls === "noun") {
    switch (form) {
      case "neg": return out("Add じゃない (or ではない).");
      case "past": return out("Add だった.");
      case "past-neg": return out("Add じゃなかった.");
      case "te": return out("Add で.");
      case "adv": return out("Add に.");
      case "polite": return out("Add です.");
      case "polite-neg": return out("Add じゃありません (or じゃないです).");
      case "polite-past": return out("Add でした.");
      default: return out("");
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// glosses for words in lessons and sentences
let BANK = null;
function bankGloss(text) {
  if (!BANK) {
    BANK = new Map();
    for (const w of ALL) {
      const en = typeof w.en === "object" ? `to ${w.en.base}` : w.en;
      BANK.set(surface(w), en);
    }
    for (const [g, en] of GRAMMAR) if (!BANK.has(g)) BANK.set(g, en);
  }
  return BANK.get(text) || "";
}

/** A short gloss for a tile: from the sentence's own token info, the particle table, the word bank or the grammar table. */
export function glossFor(text, toks) {
  const t = (toks || []).find((x) => x.text === text);
  if (t) {
    if (t.gloss) return t.gloss;
    if (t.info) {
      const g = t.info.gloss || t.info.meaning || t.info.m || t.info.en || "";
      if (g) return shortGloss(g, 28);
    }
  }
  if (isParticle(text)) return PARTICLES[text].name;
  return bankGloss(text);
}

// ---------------------------------------------------------------------------
// word order: Japanese lets noun phrases move around as long as each keeps its particle and the predicate stays last
const CASE = new Set(["は", "が", "を", "に", "で", "へ", "も", "から", "まで"]);
const CLAUSEY = /(です|ます|でした|ました|だ|た|て|ない|ません)$/;

/** Noun-phrase chunks of an answer: [[tiles...] ending in a case particle], the rest is the predicate. */
export function chunks(tiles) {
  const out = [];
  let cur = [];
  for (let i = 0; i < tiles.length; i++) {
    cur.push(tiles[i]);
    if (CASE.has(tiles[i]) && i < tiles.length - 1) { out.push(cur); cur = []; }
  }
  return { phrases: out, predicate: cur };
}

/** Is `picked` the answer with its noun phrases in another order (still correct Japanese)? */
export function isAltOrder(answer, picked) {
  if (picked.length !== answer.length || picked.join("") === answer.join("")) return false;
  const a = chunks(answer), p = chunks(picked);
  if (a.phrases.length < 2 || a.phrases.length !== p.phrases.length) return false;
  if (a.predicate.join("|") !== p.predicate.join("|")) return false;
  // movable phrases are plain nouns with one particle; anything with a verb or a clause stays put
  if (a.phrases.some((ph) => ph.slice(0, -1).some((t) => CLAUSEY.test(t)) || ph.length > 4)) return false;
  const key = (ph) => ph.join("|");
  const aKeys = a.phrases.map(key).sort(), pKeys = p.phrases.map(key).sort();
  if (aKeys.join("¦") !== pKeys.join("¦")) return false;
  // a question word or a topic usually leads; moving a は-phrase away from the front reads oddly, so keep the topic first
  const topicA = a.phrases.findIndex((ph) => ph[ph.length - 1] === "は");
  if (topicA === 0 && key(p.phrases[0]) !== key(a.phrases[0])) return false;
  return true;
}

// ---------------------------------------------------------------------------
const count = (arr) => arr.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());
function multisetDiff(a, b) {
  const ca = count(a), cb = count(b);
  const onlyA = [], onlyB = [];
  for (const [t, n] of ca) for (let k = 0; k < n - (cb.get(t) || 0); k++) onlyA.push(t);
  for (const [t, n] of cb) for (let k = 0; k < n - (ca.get(t) || 0); k++) onlyB.push(t);
  return { onlyA, onlyB };
}
const q = (t) => `**${t}**`;
const glossed = (t, toks) => { const g = glossFor(t, toks); return g ? `${q(t)} (${g})` : q(t); };

/**
 * Explain a built sentence. ex: { answer: [text], bank: [{text, m, gloss}], recap?: { toks, en } }; picked: [text].
 * Returns { correct, alt, points, fix, breakdown }.
 */
export function explainBuild(ex, picked) {
  const answer = ex.answer;
  const toks = ex.recap && ex.recap.toks;
  const ok = picked.length === answer.length && picked.every((t, i) => t === answer[i]);
  const alt = !ok && isAltOrder(answer, picked);
  const breakdown = answer.map((t) => ({ jp: (ex.bank.find((b) => b.text === t) || {}).m || t, gloss: glossFor(t, toks), particle: isParticle(t) }));
  const fixMarkup = answer.map((t) => (ex.bank.find((b) => b.text === t) || {}).m || t).join("");
  if (ok) return { correct: true, points: whyRight(answer, toks), fix: null, breakdown };
  if (alt) {
    return {
      correct: true, alt: true, breakdown, fix: { label: "The usual order", markup: fixMarkup },
      points: ["Also correct. Japanese lets the parts that end in a particle swap places, as long as each keeps its particle and the verb stays at the end. The order below is the more usual one."],
    };
  }
  const points = [];
  const { onlyA: missing, onlyB: extra } = multisetDiff(answer, picked);
  // a wrong particle: one particle in, another one out
  const missP = missing.filter(isParticle), extraP = extra.filter(isParticle);
  const swaps = [];
  while (missP.length && extraP.length) swaps.push([extraP.shift(), missP.shift()]);
  for (const [used, need] of swaps) {
    const host = answer[answer.indexOf(need) - 1];
    points.push(`You used ${q(used)} where the sentence needs ${q(need)}${host ? ` after ${q(host)}` : ""}. ${q(need)} ${PARTICLES[need].does}, while ${q(used)} ${PARTICLES[used].does}.`);
  }
  const missW = missing.filter((t) => !isParticle(t) || !swaps.some((s) => s[1] === t));
  const extraW = extra.filter((t) => !isParticle(t) || !swaps.some((s) => s[0] === t));
  for (const t of extraW) points.push(`${glossed(t, toks)} isn't part of this sentence. ${isParticle(t) ? `${cap(PARTICLES[t].does)}, and nothing here needs that.` : "The English has no word for it."}`);
  for (const t of missW) {
    if (isParticle(t)) points.push(`${q(t)} is missing after ${q(answer[answer.indexOf(t) - 1] || "")}: it ${PARTICLES[t].does}.`);
    else points.push(`${glossed(t, toks)} is missing${answer[answer.length - 1] === t ? ": the sentence needs it at the end" : ""}.`);
  }
  // order: only judged on the tiles both have
  if (!missing.length && !extra.length) points.push(...orderProblems(answer, picked));
  else if (picked.length && picked[picked.length - 1] !== answer[answer.length - 1] && picked.includes(answer[answer.length - 1])) points.push(`${q(answer[answer.length - 1])} belongs at the end: in Japanese the verb or です comes last.`);
  if (!points.length) points.push("The pieces are right, but not in this order.");
  return { correct: false, points, fix: { label: "Correct sentence", markup: fixMarkup }, breakdown };
}

function orderProblems(answer, picked) {
  const out = [];
  const last = answer[answer.length - 1];
  if (picked[picked.length - 1] !== last) out.push(`${q(last)} belongs at the end. In Japanese the verb, adjective or です always comes last.`);
  // particles must follow the word they mark
  for (let i = 1; i < answer.length; i++) {
    const t = answer[i];
    if (!isParticle(t)) continue;
    const host = answer[i - 1];
    const k = picked.indexOf(t);
    if (k >= 0 && picked[k - 1] !== host) {
      out.push(`${q(t)} goes right after ${q(host)} (${host}${t}): a particle always follows the word it marks.`);
      break;
    }
  }
  // X の Y: the owner first
  const no = answer.indexOf("の");
  if (no > 0 && no < answer.length - 1) {
    const x = answer[no - 1], y = answer[no + 1];
    const pi = picked.indexOf("の");
    if (pi > 0 && picked[pi - 1] === y && picked[pi + 1] === x) out.push(`${q(`${x}の${y}`)} means “${y} of ${x}”: the owner or describing noun comes first.`);
  }
  if (!out.length) {
    const firstDiff = picked.findIndex((t, i) => t !== answer[i]);
    out.push(`From ${q(picked[firstDiff])} on the order differs. The sentence starts with ${q(answer.slice(0, firstDiff + 1).join(""))}.`);
  }
  return out;
}

function whyRight(answer, toks) {
  const out = [];
  for (let i = 1; i < answer.length; i++) {
    const t = answer[i];
    if (isParticle(t) && i > 0 && ["は", "が", "を", "に", "で", "へ"].includes(t)) out.push(`${q(answer[i - 1] + t)}: ${t} ${PARTICLES[t].does}.`);
  }
  const last = answer[answer.length - 1];
  const g = glossFor(last, toks);
  out.push(`${q(last)}${g ? ` (${g})` : ""} ends the sentence, as the verb or です always does.`);
  return out.slice(0, 4);
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Explain a multiple-choice answer. ex: the exercise, chosen: the option picked.
 * Returns { correct, points, fix, breakdown }.
 */
export function explainChoice(ex, chosen) {
  const correct = ex.options.find((o) => o.correct);
  const ok = !!chosen && chosen.correct;
  const toks = (ex.recap && ex.recap.toks) || (ex.prompt && ex.prompt.toks) || null;
  let breakdown = toks ? toks.filter((t) => t.type !== "punct").map((t) => ({ jp: t.m, gloss: glossFor(t.text, toks), particle: isParticle(t.text) })) : null;
  if (!breakdown) {
    // a lesson sentence: its |-separated words, glossed from the word bank and the particle table
    const jp = (ex.recap && ex.recap.jp) || (ex.prompt && ex.prompt.jp) || "";
    const parts = jp ? String(jp).split("|").map((m) => m.replace(/\*$/, "")).filter((m) => plainOf(m) && !/^[。、？！?!]+$/.test(plainOf(m))) : [];
    const b = parts.map((m) => { const t = plainOf(m).replace(/[。？！?!]+$/, ""); return { jp: m.replace(/[。？！?!]+$/, ""), gloss: glossFor(t), particle: isParticle(t) }; });
    if (b.length > 1 && b.filter((x) => x.gloss).length >= Math.ceil(b.length / 2)) breakdown = b;
  }
  const note = ex.explain ? [ex.explain] : [];
  const instr = ex.instruction || "";
  const c = plainOf(correct.text), p = chosen ? plainOf(chosen.text) : "";
  const points = [];

  if (ex.meta && ex.meta.form) {
    // conjugation: what you picked, what was asked, how to make it
    const { form, cls, word } = ex.meta;
    const mine = chosen && chosen.meta ? chosen.meta : {};
    if (ok) points.push(`${q(c)} is the ${FORMS[form] || form}: ${FORM_MEANING[form] || ""}.`);
    else if (mine.cls && mine.cls !== cls && mine.form === form) points.push(`${q(p)} conjugates ${q(word)} as if it were ${mine.cls === "ru" ? "a る-verb" : mine.cls === "u" ? "an う-verb" : mine.cls === "iadj" ? "an い-adjective" : "a な-adjective"}. ${formRule(form, cls, word)}`);
    else if (mine.form && mine.form !== form) points.push(`${q(p)} is the ${FORMS[mine.form] || mine.form} (${FORM_MEANING[mine.form] || ""}). ${ex.meta.en ? `The English “${ex.meta.en}” calls for` : "The question asks for"} the ${FORMS[form] || form}: ${FORM_MEANING[form] || ""}.`);
    else if (!ok) points.push(`The ${FORMS[form] || form} of ${q(word)} is ${q(c)}.`);
    const rule = formRule(form, cls, word);
    if (rule && !points.some((x) => x.includes(rule))) points.push(`How to make it: ${rule.replace(/^\*\*[^*]+\*\* is [^.]+\. /, "")}`);
    return { correct: ok, points, fix: ok ? null : { label: "Answer", markup: correct.text }, breakdown };
  }

  if (isParticle(c) && (isParticle(p) || !chosen)) {
    if (ok) points.push(`${q(c)} ${PARTICLES[c].does}.`);
    else points.push(`You picked ${q(p)}: it ${PARTICLES[p] ? PARTICLES[p].does : "doesn't fit here"}. Here the gap needs ${q(c)}, which ${PARTICLES[c].does}.`);
    return { correct: ok, points: [...points, ...note], fix: ok ? null : { label: "Answer", markup: correct.text }, breakdown };
  }

  if (/Which sentence is correct/i.test(instr) && chosen && !ok) {
    const d = diffText(c, p);
    if (d) {
      const [right, wrong] = d;
      points.push(`The difference is ${q(wrong || "nothing")} against ${q(right || "nothing")}.`);
      if (isParticle(right) && isParticle(wrong)) points.push(`${q(right)} ${PARTICLES[right].does}; ${wrong} ${PARTICLES[wrong].does}.`);
    }
    return { correct: false, points: [...points, ...note], fix: { label: "Correct sentence", markup: correct.text }, breakdown };
  }

  if (/meaning|mean\?/i.test(instr)) {
    if (!ok && chosen) points.push(`You picked “${String(chosen.text).replace(/[.!?。]+$/, "")}”.${breakdown ? " Word by word below shows what the Japanese says." : ""}`);
    const keys = breakdown ? breakdown.filter((b) => !b.particle && b.gloss).slice(0, 4) : [];
    if (keys.length) points.push(keys.map((b) => `${q(plainOf(b.jp))} = ${b.gloss}`).join(", ") + ".");
    return { correct: ok, points: [...points, ...note.filter((n) => !/^Word in focus/.test(n))], fix: ok ? null : { label: "Meaning", text: correct.text }, breakdown };
  }

  if (chosen && chosen.meta && chosen.meta.gloss != null && !ok) {
    points.push(`${q(p)} means “${chosen.meta.gloss}”. ${ex.prompt && ex.prompt.en ? `The sentence (“${ex.prompt.en}”) needs ${q(c)}${correct.meta && correct.meta.gloss ? ` (“${correct.meta.gloss}”)` : ""}.` : `The answer is ${q(c)}.`}`);
    return { correct: false, points, fix: { label: "Answer", markup: correct.text }, breakdown };
  }

  if (!ok && chosen) points.push(`You picked ${q(p)}; the answer is ${q(c)}.`);
  return { correct: ok, points: [...points, ...note], fix: ok ? null : { label: "Answer", markup: correct.text }, breakdown };
}

/** The differing middle part of two strings: [inRight, inWrong] or null. */
export function diffText(right, wrong) {
  if (right === wrong) return null;
  let i = 0;
  while (i < right.length && i < wrong.length && right[i] === wrong[i]) i++;
  let j = 0;
  while (j < right.length - i && j < wrong.length - i && right[right.length - 1 - j] === wrong[wrong.length - 1 - j]) j++;
  return [right.slice(i, right.length - j), wrong.slice(i, wrong.length - j)];
}
