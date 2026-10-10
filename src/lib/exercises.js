// Turns lesson content into interactive exercises.
import { parseSentence, sentenceText, plainOf, conjMarkup, FORMS, endPunct } from "./jp.js";
import { generate, mulberry32, pick, shuffle } from "../content/generators.js";
import { BY_ID, VERBS, ADJECTIVES, markup, surface } from "../content/bank.js";

let counter = 0;
const nid = () => `x${++counter}`;
const uniq = (arr) => [...new Set(arr)];

export const DEFAULT_POOL = ["は", "が", "を", "に", "で", "へ", "と", "も", "の"];

function optionsFrom(correct, wrongs, rng) {
  const opts = [{ id: nid(), text: correct, correct: true }];
  for (const w of wrongs) if (w !== correct && !opts.some((o) => o.text === w)) opts.push({ id: nid(), text: w, correct: false });
  return shuffle(rng, opts);
}

// ---------------------------------------------------------------------------
// static sentence exercises
function translateChoice(lessonId, s, others, rng, extra = []) {
  const [jp, en, note] = s;
  const near = shuffle(rng, uniq(others.filter((e) => e && e !== en)));
  const far = shuffle(rng, uniq(extra.filter((e) => e && e !== en && !near.includes(e))));
  const wrongs = [...near, ...far].slice(0, 3);
  if (wrongs.length < 2) return null;
  return {
    id: nid(), kind: "choose", lessonId, instruction: "What does this mean?",
    prompt: { jp }, options: optionsFrom(en, wrongs, rng), explain: note || "", recap: { jp, en },
  };
}

function buildFrom(lessonId, jp, en, distractors, rng, note) {
  const toks = endPunct(String(jp).split("|")).tokens.map((m) => ({ m, text: plainOf(m) }));
  if (toks.length < 2 || toks.length > 9) return null;
  const extra = shuffle(rng, distractors.filter((d) => !toks.some((t) => t.text === d))).slice(0, toks.length > 4 ? 2 : 1);
  const bank = toks.map((t) => ({ id: nid(), text: t.text, m: t.m }));
  extra.forEach((d) => bank.push({ id: nid(), text: d, m: d }));
  let sh = shuffle(rng, bank);
  if (sh.length > 2 && sh.map((b) => b.text).join("") === toks.map((t) => t.text).join("")) sh = shuffle(rng, sh).reverse();
  return {
    id: nid(), kind: "build", lessonId, instruction: "Build the sentence",
    prompt: { en }, bank: sh, answer: toks.map((t) => t.text), explain: note || "", recap: { jp, en },
  };
}

function clozeFrom(lessonId, c, pool, rng) {
  const [jp, en, why, optStr] = c;
  const toks = parseSentence(jp);
  const bi = toks.findIndex((t) => t.blank);
  if (bi < 0) return null;
  const correct = toks[bi].m;
  const optPool = optStr ? optStr.split(",") : pool;
  const wrongs = shuffle(rng, optPool.filter((p) => p !== correct)).slice(0, 3);
  return {
    id: nid(), kind: "choose", lessonId, instruction: "Fill in the blank",
    prompt: { jp, en, blank: bi }, options: optionsFrom(correct, wrongs, rng), explain: why || "",
    recap: { jp: toks.map((t) => t.m).join("|"), en },
  };
}

function quizFrom(lessonId, q, rng) {
  let [question, correct, ...rest] = q;
  const noFuri = question.startsWith("!");
  if (noFuri) question = question.slice(1);
  const why = rest.length && rest[rest.length - 1].startsWith("~") ? rest.pop().slice(1) : "";
  if (!rest.length) return null;
  return {
    id: nid(), kind: "choose", lessonId, instruction: "Quick check",
    prompt: { text: question, noFuri }, options: optionsFrom(correct, rest, rng), explain: why,
  };
}

function spotFrom(lessonId, s, rng) {
  const [good, ...rest] = s;
  const why = rest.length && typeof rest[rest.length - 1] === "string" && rest[rest.length - 1].startsWith("~") ? rest.pop().slice(1) : "";
  const bad = rest.filter(Boolean);
  if (!bad.length) return null;
  return {
    id: nid(), kind: "choose", lessonId, instruction: "Which sentence is correct?",
    prompt: {}, options: optionsFrom(good, bad, rng).map((o) => ({ ...o, jp: o.text })), explain: why, recap: { jp: good },
  };
}

// ---------------------------------------------------------------------------
// conjugation drills
const POS_POOL = {
  verb: () => VERBS.filter((v) => !["aru"].includes(v.cls)),
  verbRu: () => VERBS.filter((v) => v.cls === "ru"),
  verbU: () => VERBS.filter((v) => v.cls === "u" || v.cls === "iku"),
  iadj: () => ADJECTIVES.filter((a) => a.cls === "iadj" || a.cls === "ii"),
  nadj: () => ADJECTIVES.filter((a) => a.cls === "nadj"),
  adj: () => ADJECTIVES,
};

function wrongConj(word, form, rng) {
  const out = [];
  const flip = { ru: "u", u: "ru", iku: "ru", iadj: "nadj", nadj: "iadj" }[word.cls];
  if (flip) {
    const m = conjMarkup({ ...word, cls: flip }, form);
    if (m) out.push(m);
  }
  const related = {
    neg: ["past-neg", "polite-neg", "past"], "past-neg": ["neg", "past", "polite-past-neg"], past: ["te", "neg", "polite-past"],
    te: ["past", "neg", "stem"], polite: ["neg", "polite-neg", "past"], "polite-neg": ["polite", "neg", "polite-past"], "polite-past": ["polite", "past", "polite-past-neg"],
    "polite-past-neg": ["polite-neg", "polite-past", "past-neg"], dict: ["neg", "past", "te"], potential: ["passive", "causative", "neg"],
    volitional: ["potential", "imperative", "polite"], ba: ["tara", "neg", "past"], tara: ["ba", "past", "te"], imperative: ["volitional", "neg", "stem"], tai: ["polite", "neg", "stem"],
    passive: ["potential", "causative", "neg"], causative: ["passive", "potential", "neg"], adv: ["neg", "te", "past"], mod: ["dict", "neg", "past"], stem: ["polite", "te", "neg"],
  }[form] || ["neg", "past", "te"];
  for (const f of related) {
    const m = conjMarkup(word, f);
    if (m) out.push(m);
  }
  return shuffle(rng, out);
}

function conjExercise(lessonId, spec, ctx) {
  const { rng, weight } = ctx;
  const pool = (POS_POOL[spec.pos] || POS_POOL.verb)().filter((w) => conjMarkup(w, spec.form));
  const word = pick(rng, pool, (w) => weight(w.id));
  if (!word) return null;
  const correct = conjMarkup(word, spec.form);
  const wrongsM = wrongConj(word, spec.form, rng).filter((m) => m !== correct);
  const wrongs = uniq(wrongsM).slice(0, 3);
  if (wrongs.length < 2) return null;
  const options = shuffle(rng, [{ id: nid(), text: correct, correct: true }, ...wrongs.map((m) => ({ id: nid(), text: m, correct: false }))]);
  return {
    id: nid(), kind: "choose", lessonId, instruction: `Make the ${FORMS[spec.form] || spec.form}`,
    prompt: { word: markup(word), wordEn: word.en && typeof word.en === "object" ? word.en.base : word.en },
    options: options.map((o) => ({ ...o, jp: o.text })), explain: `${surface(word)} → ${options.find((o) => o.correct).text.replace(/\[[^\]]*\]/g, "")}`,
    words: [word.id],
  };
}

function matchExercise(lessonId, wordIds, rng) {
  const words = wordIds.map((id) => BY_ID[id]).filter(Boolean);
  const chosen = shuffle(rng, words).slice(0, 5);
  if (chosen.length < 3) return null;
  const pairs = chosen.map((w) => ({
    id: nid(), jp: markup(w),
    en: typeof w.en === "object" ? w.en.base : w.en,
  }));
  return { id: nid(), kind: "match", lessonId, instruction: "Match the words", pairs, left: shuffle(rng, pairs), right: shuffle(rng, pairs), words: chosen.map((w) => w.id) };
}

// generated sentences
function genExercises(lessonId, spec, ctx, kind) {
  const g = generate(spec, ctx);
  if (kind === "choose") {
    const wrongs = uniq(shuffle(ctx.rng, g.others).filter((e) => e !== g.en));
    for (let tries = 0; wrongs.length < 3 && tries < 12; tries++) {
      const g2 = generate(spec, ctx);
      if (g2.en !== g.en && !wrongs.includes(g2.en)) wrongs.push(g2.en);
    }
    wrongs.length = Math.min(wrongs.length, 3);
    return {
      id: nid(), kind: "choose", lessonId, instruction: "What does this mean?",
      prompt: { jp: g.tokens.join("|") }, options: optionsFrom(g.en, wrongs, ctx.rng), explain: "", words: g.words,
    };
  }
  const distract = shuffle(ctx.rng, ["を", "に", "で", "が", "は", "へ", "も"]);
  return buildFrom(lessonId, g.tokens.join("|"), g.en, distract, ctx.rng, "");
}

// ---------------------------------------------------------------------------
/** Collect every static example of a lesson as [jp, en, note]. */
export function lessonExamples(lesson) {
  const out = [];
  for (const p of lesson.pages || []) for (const e of p.ex || []) out.push(e);
  return out;
}

/** The main practice set for a lesson (about 12 exercises). */
export function buildLessonExercises(lesson, ctx, { max = 14 } = {}) {
  const rng = ctx.rng;
  const pool = lesson.pool || DEFAULT_POOL;
  const ex = lessonExamples(lesson);
  const engs = ex.map((e) => e[1]);
  const out = [];
  const push = (e) => { if (e) out.push(e); };

  if (lesson.vocab && lesson.vocab.length >= 4) push(matchExercise(lesson.id, lesson.vocab, rng));

  const order = shuffle(rng, ex);
  order.slice(0, 3).forEach((e) => push(translateChoice(lesson.id, e, engs, rng, ctx.extraEngs || [])));
  (lesson.cloze || []).slice().sort(() => rng() - 0.5).slice(0, 4).forEach((c) => push(clozeFrom(lesson.id, c, pool, rng)));
  for (const spec of lesson.conj || []) for (let i = 0; i < (spec.n || 1); i++) push(conjExercise(lesson.id, spec, ctx));
  (lesson.gens || []).forEach((spec, i) => {
    push(genExercises(lesson.id, spec, ctx, "choose"));
    if (i % 2 === 0) push(genExercises(lesson.id, spec, ctx, "build"));
  });
  order.slice(3, 5).forEach((e) => push(buildFrom(lesson.id, e[0], e[1], pool, rng, e[2])));
  (lesson.spot || []).slice(0, 2).forEach((s) => push(spotFrom(lesson.id, s, rng)));
  (lesson.quiz || []).slice(0, 4).forEach((q) => push(quizFrom(lesson.id, q, rng)));

  // keep a gentle difficulty curve: recognition first, production later
  const rank = { match: 0, choose: 1, build: 2 };
  const sorted = out.map((e, i) => ({ e, i, r: rank[e.kind] + (e.instruction.startsWith("Which") ? 0.5 : 0) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.e);
  return sorted.slice(0, max);
}

/** Short mixed review from earlier lessons (interleaving). */
export function buildReviewExercises(lessons, ctx, n = 6) {
  const out = [];
  const rng = ctx.rng;
  let guard = 0;
  while (out.length < n && lessons.length && guard++ < n * 6) {
    const lesson = lessons[Math.floor(rng() * lessons.length)];
    const set = buildLessonExercises(lesson, { ...ctx, rng: mulberry32(Math.floor(rng() * 1e9)) }, { max: 20 }).filter((e) => e.kind !== "match");
    if (set.length) out.push(set[Math.floor(rng() * set.length)]);
  }
  return out;
}

/** Reading practice from the user's own vocabulary sentences: "what does this mean?". */
export function sentenceExercises(pool, rng, n = 8) {
  const uniqueEn = [...new Set(pool.map((p) => p.en))];
  if (pool.length < 4 || uniqueEn.length < 4) return [];
  // shakier words first, with some randomness
  const ranked = shuffle(rng, pool).sort((a, b) => a.r - b.r + (rng() - 0.5) * 0.3);
  const out = [];
  const seen = new Set();
  for (const p of ranked) {
    if (out.length >= n) break;
    if (seen.has(p.en)) continue;
    seen.add(p.en);
    const wrongs = shuffle(rng, uniqueEn.filter((e) => e !== p.en)).slice(0, 3);
    out.push({
      id: nid(), kind: "choose", lessonId: "sentences", instruction: "What does this sentence mean?",
      prompt: { jp: p.jp }, options: optionsFrom(p.en, wrongs, rng), explain: p.word ? `Word in focus: ${p.word}` : "",
    });
  }
  return out;
}

/** Check a build answer. */
export function checkBuild(ex, picked) {
  return picked.length === ex.answer.length && picked.every((t, i) => t === ex.answer[i]);
}

export { sentenceText, plainOf };
