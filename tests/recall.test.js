import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { toKana } from "../src/lib/romaji.js";
import { checkRecall, answerKeys, recallEligible, editDistance } from "../src/lib/recall.js";
import { buildCounts, buildSession, todayCounts, throttleFor, weakSpots, recentRecall } from "../src/lib/queue.js";
import { effortCfg, rowCost, COST } from "../src/lib/effort.js";
import { isProd, baseId, prodId } from "../src/lib/ids.js";
import { isLeechHit, LEECH_AT } from "../src/lib/leech.js";
import { SentenceIndex, pickSentence } from "../src/lib/sentenceIndex.js";
import { REVIEW, NEW, LEARNING } from "../src/lib/fsrs.js";
import { DAY, MIN } from "../src/lib/time.js";

const NOW = new Date(2026, 9, 10, 15, 0, 0).getTime();

describe("romaji to kana", () => {
  const cases = {
    watashi: "わたし", gakkou: "がっこう", kitte: "きって", sensei: "せんせい", toukyou: "とうきょう",
    ryokou: "りょこう", "kon'ya": "こんや", konnnichiha: "こんにちは", shinnnyuu: "しんにゅう", nihongo: "にほんご", "ra-men": "らーめん",
    chi: "ち", tsu: "つ", ja: "じゃ", fune: "ふね", shinnyuu: "しんゆう",
  };
  for (const [from, to] of Object.entries(cases)) {
    it(`${from} -> ${to}`, () => expect(toKana(from, { final: true })).toBe(to));
  }
  it("keeps an unfinished syllable while typing and turns a final n into ん", () => {
    expect(toKana("desu.")).toBe("です.");
    expect(toKana("desu. ne?", { punct: true })).toBe("です。 ね？");
    expect(toKana("ichi, ni!", { punct: true, final: true })).toBe("いち、 に！");
    expect(toKana("ほんn")).toBe("ほんn");
    expect(toKana("ほんn", { final: true })).toBe("ほんん");
    expect(toKana("sh")).toBe("sh");
    expect(toKana("shinbun")).toBe("しんぶn");
    expect(toKana("shinbun", { final: true })).toBe("しんぶん");
  });
  it("passes kana, kanji and punctuation through", () => {
    expect(toKana("私は学生です。")).toBe("私は学生です。");
    expect(toKana("かたかな")).toBe("かたかな");
  });
});

describe("checking a recall answer", () => {
  const card = { f: "学生", r: "がくせい", m: "student" };
  it("accepts romaji, hiragana, katakana and the written form", () => {
    for (const a of ["gakusei", "がくせい", "ガクセイ", "学生", " gaku sei "]) expect(checkRecall(a, card).verdict, a).toBe("exact");
  });
  it("calls one slip in a longer word 'close' and suggests Hard", () => {
    const r = checkRecall("gakusai", card);
    expect(r.verdict).toBe("close");
    expect(r.grade).toBe(2);
  });
  it("does not forgive slips in very short words", () => {
    expect(checkRecall("ki", { f: "木", r: "き", m: "tree" }).verdict).toBe("exact");
    expect(checkRecall("ku", { f: "木", r: "き", m: "tree" })).toMatchObject({ verdict: "wrong", grade: 1 });
    expect(checkRecall("sakan", { f: "魚", r: "さかな", m: "fish" }).verdict).toBe("wrong"); // too short for a 'close' call
  });
  it("handles empty and wrong answers", () => {
    expect(checkRecall("", card)).toMatchObject({ verdict: "empty", grade: 1 });
    expect(checkRecall("tomodachi", card)).toMatchObject({ verdict: "wrong", grade: 1 });
  });
  it("accepts any of several listed readings", () => {
    const c = { f: "私", r: "わたし、わたくし", m: "I" };
    expect(answerKeys(c)).toEqual(expect.arrayContaining(["わたし", "わたくし", "私"]));
    expect(checkRecall("watakushi", c).verdict).toBe("exact");
  });
  it("edit distance", () => {
    expect(editDistance("かき", "かき")).toBe(0);
    expect(editDistance("かき", "かく")).toBe(1);
    expect(editDistance("", "あい")).toBe(2);
  });
});

async function fresh(settings = {}) {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  s.updateSettings({ onboarded: true, newPerDay: { kana: 5, kanji: 5, vocab: 5, generic: 5 }, ...settings });
  return s;
}
const WORDS = ["あい", "いえ", "うみ", "えき", "おと", "かお", "きた", "くつ", "けさ", "こえ", "さけ", "しお"];
function vocabDeck(s, n = 12, id = "d") {
  const content = {};
  for (let i = 0; i < n; i++) content[`${id}.${i}`] = { f: WORDS[i % WORDS.length] + (i >= WORDS.length ? "ん" : ""), r: WORDS[i % WORDS.length] + (i >= WORDS.length ? "ん" : ""), m: `meaning ${i}`, o: i, x: {} };
  s.addDeck({ id, name: id, kind: "vocab" }, content);
  return Object.keys(content);
}
/** Mark cards as known with a given stability and a due date. */
function stable(s, ids, { stability = 20, due = NOW + 10 * DAY } = {}) {
  for (const id of ids) {
    const d = id.split(".")[0];
    (s.prog[d] = s.prog[d] || {})[id] = { st: REVIEW, s: stability, d: 5, due, last: NOW - 5 * DAY, reps: 3, lapses: 0, step: 0, u: NOW };
  }
}

describe("ids", () => {
  it("builds and recognises recall card ids", () => {
    expect(prodId("d.1")).toBe("d.1~p");
    expect(prodId("d.1~p")).toBe("d.1~p");
    expect(isProd("d.1~p")).toBe(true);
    expect(isProd("d.1")).toBe(false);
    expect(baseId("d.1~p")).toBe("d.1");
  });
});

describe("recall cards in the queue", () => {
  it("offers a recall card only for words that are stable and have a kana reading", async () => {
    const s = await fresh({ recallAfter: 4 });
    const ids = vocabDeck(s, 4);
    stable(s, [ids[0]], { stability: 10 });
    stable(s, [ids[1]], { stability: 2 }); // too young
    const c = buildCounts(s, NOW);
    expect(c.sel.prodNews).toEqual(["d.0~p"]);
    expect(c.prodNew).toBe(1);
  });
  it("does nothing when recall cards are switched off", async () => {
    const s = await fresh({ recall: false });
    const ids = vocabDeck(s, 3);
    stable(s, ids);
    expect(buildCounts(s, NOW).sel.prodNews).toEqual([]);
  });
  it("limits new recall cards per day, counting the ones already started", async () => {
    const s = await fresh({ recallNewPerDay: 2 });
    const ids = vocabDeck(s, 6);
    stable(s, ids);
    expect(buildCounts(s, NOW).prodNew).toBe(2);
    s.reviewCard("d.0~p", 3, 2000, NOW);
    expect(buildCounts(s, NOW + 1000).prodNew).toBe(1);
    s.reviewCard("d.1~p", 3, 2000, NOW + 2000);
    expect(buildCounts(s, NOW + 3000).prodNew).toBe(0);
  });
  it("a recall card goes straight into review (no learning steps) and keeps its own schedule", async () => {
    const s = await fresh();
    const ids = vocabDeck(s, 2);
    stable(s, ids);
    const e = s.reviewCard("d.0~p", 3, 2500, NOW);
    expect(e.next.st).toBe(REVIEW);
    expect(s.rec("d.0").s).toBe(20); // recognition card untouched
    expect(s.rec("d.0~p").reps).toBe(1);
    expect(s.card("d.0~p")).toBe(s.card("d.0"));
  });
  it("a due recall card comes back for review and a failed one enters relearning", async () => {
    const s = await fresh();
    const ids = vocabDeck(s, 2);
    stable(s, ids, { due: NOW + 30 * DAY });
    const e = s.reviewCard("d.0~p", 3, 2000, NOW);
    const later = buildCounts(s, e.next.due + 1000);
    expect(later.sel.reviews).toContain("d.0~p");
    expect(later.prodReview).toBe(1);
    const f = s.reviewCard("d.0~p", 1, 2000, e.next.due + 1000);
    expect(f.next.st).not.toBe(REVIEW);
    expect(buildSession(s, e.next.due + 2 * MIN).learning).toContain("d.0~p");
  });
  it("a suspended word loses its recall card", async () => {
    const s = await fresh();
    const ids = vocabDeck(s, 3);
    stable(s, ids);
    s.toggleSuspend("d.0");
    expect(buildCounts(s, NOW).sel.prodNews).not.toContain("d.0~p");
  });
  it("recall answers do not count as new vocabulary cards", async () => {
    const s = await fresh();
    const ids = vocabDeck(s, 3);
    stable(s, ids);
    s.reviewCard("d.0~p", 3, 1000, NOW);
    const t = todayCounts(s, NOW + 1000);
    expect(t.prodNew).toBe(1);
    expect(t.newByDeck.d || 0).toBe(0);
  });
  it("recallEligible follows the settings", () => {
    const cfg = effortCfg({ recallAfter: 4 });
    const deck = { kind: "vocab" };
    const card = { f: "犬", r: "いぬ", m: "dog" };
    expect(recallEligible(deck, card, { st: REVIEW, s: 5 }, cfg)).toBe(true);
    expect(recallEligible(deck, card, { st: REVIEW, s: 3 }, cfg)).toBe(false);
    expect(recallEligible(deck, card, { st: LEARNING, s: 9 }, cfg)).toBe(false);
    expect(recallEligible({ kind: "kanji" }, card, { st: REVIEW, s: 9 }, cfg)).toBe(false);
    expect(recallEligible(deck, { f: "x", r: "r", m: "m" }, { st: REVIEW, s: 9 }, cfg)).toBe(false);
  });
});

describe("effort budget", () => {
  it("prices answers by kind", () => {
    expect(rowCost([1, "d.1", 3, 0, REVIEW, 1])).toBe(COST.review);
    expect(rowCost([1, "d.1", 3, 0, NEW, 1])).toBe(COST.new);
    expect(rowCost([1, "d.1~p", 3, 0, REVIEW, 1])).toBe(COST.recallReview);
    expect(rowCost([1, "d.1~p", 3, 0, NEW, 1])).toBe(COST.recallNew);
    expect(rowCost([1, "d.1", 0, 0, REVIEW, 1])).toBe(0); // undone
    expect(rowCost([1, "g.lesson", 3, 0, 9, 0])).toBe(0); // lesson
  });
  it("adds up what you did today", async () => {
    const s = await fresh();
    const ids = vocabDeck(s, 4);
    stable(s, ids.slice(0, 2));
    s.reviewCard("d.0", 3, 1000, NOW); // review: 1
    s.reviewCard("d.3", 3, 1000, NOW + 1000); // new: 2
    s.reviewCard("d.1~p", 3, 1000, NOW + 2000); // new recall: 4
    expect(todayCounts(s, NOW + 3000).effort).toBe(7);
  });
  it("stops adding cards when the budget is used up and lets 'keep going' lift it", async () => {
    const s = await fresh({ effortBudget: 40, maxReviews: 500, autoThrottle: false });
    const ids = vocabDeck(s, 60);
    stable(s, ids, { due: NOW - DAY });
    const c = buildCounts(s, NOW);
    expect(c.review).toBeLessThanOrEqual(40);
    expect(c.deferred).toBeGreaterThan(0);
    const all = buildCounts(s, NOW, { extraReviews: true });
    expect(all.review).toBe(60);
    expect(all.deferred).toBe(0);
  });
  it("recall reviews cost three times as much as normal reviews", async () => {
    const s = await fresh({ effortBudget: 40, maxReviews: 500, autoThrottle: false, recall: true });
    const ids = vocabDeck(s, 24);
    stable(s, ids, { due: NOW + 30 * DAY });
    for (const id of ids) { const e = s.reviewCard(prodId(id), 3, 1000, NOW - 30 * DAY); void e; }
    // spent so far is on an earlier day, so today starts clean; all recall cards are now due
    const c = buildCounts(s, NOW + 60 * DAY);
    expect(c.prodReview * COST.recallReview).toBeLessThanOrEqual(40);
    expect(c.prodReview).toBeLessThan(24);
    expect(c.prodReview).toBeGreaterThan(0);
  });
  it("asking for more new cards also raises the budget by what they cost", async () => {
    const s = await fresh({ effortBudget: 40, autoThrottle: false });
    vocabDeck(s, 20);
    s.updateSettings({ newPerDay: { kana: 0, kanji: 0, vocab: 5, generic: 5 } });
    const base = buildCounts(s, NOW);
    expect(base.new).toBe(5);
    expect(buildCounts(s, NOW, { extraNew: 5 }).new).toBe(10);
  });
  it("older settings without the new keys fall back to defaults", () => {
    expect(effortCfg({})).toMatchObject({ recall: true, recallAfter: 4, recallNewPerDay: 5, budget: 200, throttle: true });
    expect(effortCfg({ effortBudget: 80, recall: false, autoThrottle: false })).toMatchObject({ budget: 80, recall: false, throttle: false });
  });
});

describe("auto-throttle for new cards", () => {
  it("leaves new cards alone when little is due", async () => {
    const s = await fresh();
    vocabDeck(s, 20);
    const c = buildCounts(s, NOW);
    expect(c.new).toBe(5);
    expect(c.throttle.held).toBe(0);
  });
  it("shrinks and then stops new cards as the due work grows", async () => {
    const s = await fresh({ effortBudget: 100, maxReviews: 500, newPerDay: { kana: 8, kanji: 8, vocab: 8, generic: 8 } });
    const ids = vocabDeck(s, 120);
    stable(s, ids.slice(0, 75), { due: NOW - DAY }); // 75 due of 100 budget
    const mid = buildCounts(s, NOW);
    const newWords = (c) => c.sel.news.flat().length;
    expect(newWords(mid)).toBeGreaterThan(0);
    expect(newWords(mid)).toBeLessThan(8);
    expect(mid.throttle.held).toBeGreaterThan(0);
    stable(s, ids.slice(75, 110), { due: NOW - DAY }); // 110 due
    const high = buildCounts(s, NOW);
    expect(high.sel.news.flat()).toEqual([]);
    expect(high.sel.prodNews).toEqual([]);
    expect(high.throttle.reason).toMatch(/due/);
  });
  it("can be switched off", async () => {
    const s = await fresh({ effortBudget: 100, maxReviews: 500, autoThrottle: false });
    const ids = vocabDeck(s, 60);
    stable(s, ids.slice(0, 40), { due: NOW - DAY });
    expect(buildCounts(s, NOW).sel.news.flat().length).toBe(5);
  });
  it("slows down when recall has been poor this week", async () => {
    const s = await fresh({ maxReviews: 500, newPerDay: { kana: 8, kanji: 8, vocab: 8, generic: 8 } });
    const ids = vocabDeck(s, 60);
    stable(s, ids.slice(0, 40), { due: NOW + 20 * DAY });
    for (let i = 0; i < 40; i++) {
      // 25 of 40 remembered = 62%
      s.reviewCard(ids[i], i < 25 ? 3 : 1, 1000, NOW - 2 * DAY + i * 1000);
    }
    const rc = recentRecall(s, NOW, 7);
    expect(rc.n).toBe(40);
    expect(rc.rate).toBeCloseTo(0.625, 2);
    const c = buildCounts(s, NOW);
    expect(c.throttle.reason).toMatch(/recall is 63%/);
    expect(c.new).toBe(0);
  });
  it("user asking for more new cards overrides the throttle", async () => {
    const s = await fresh({ effortBudget: 100, maxReviews: 500 });
    const ids = vocabDeck(s, 60);
    stable(s, ids.slice(0, 55), { due: NOW - DAY });
    expect(buildCounts(s, NOW, { extraNew: 3 }).new).toBeGreaterThanOrEqual(3);
  });
  it("throttleFor math", async () => {
    const s = await fresh();
    const cfg = effortCfg({ effortBudget: 100 });
    expect(throttleFor(s, 40, cfg, NOW).factor).toBe(1);
    expect(throttleFor(s, 75, cfg, NOW).factor).toBeCloseTo(0.5, 5);
    expect(throttleFor(s, 100, cfg, NOW).factor).toBe(0);
  });
});

describe("leeches", () => {
  const rev = (lapses) => ({ st: REVIEW, lapses });
  it("fires on the 8th lapse and then every 4", () => {
    expect(isLeechHit(rev(6), { lapses: 7 }, 1)).toBe(false);
    expect(isLeechHit(rev(7), { lapses: LEECH_AT }, 1)).toBe(true);
    expect(isLeechHit(rev(8), { lapses: 9 }, 1)).toBe(false);
    expect(isLeechHit(rev(11), { lapses: 12 }, 1)).toBe(true);
  });
  it("only fires on a miss of a review card", () => {
    expect(isLeechHit(rev(7), { lapses: 8 }, 3)).toBe(false);
    expect(isLeechHit({ st: LEARNING, lapses: 7 }, { lapses: 8 }, 1)).toBe(false);
    expect(isLeechHit(null, { lapses: 8 }, 1)).toBe(false);
  });
  it("the mnemonic is saved, survives reviews and can be cleared", async () => {
    const s = await fresh();
    const ids = vocabDeck(s, 2);
    stable(s, ids);
    s.setNote("d.0", "  a picture of an ear  ");
    expect(s.rec("d.0").note).toBe("a picture of an ear");
    s.reviewCard("d.0", 3, 1000, NOW);
    expect(s.rec("d.0").note).toBe("a picture of an ear");
    s.setNote("d.0~p", "same word"); // set from a recall card: stored on the word
    expect(s.rec("d.0").note).toBe("same word");
    s.setNote("d.0", "");
    expect(s.rec("d.0").note).toBeUndefined();
    expect(s.meta.dirty["prog:d"]).toBe(true);
  });
});

describe("weak spots", () => {
  it("returns cards missed twice in three days that are not due today", async () => {
    const s = await fresh();
    const ids = vocabDeck(s, 4);
    stable(s, ids, { due: NOW + 10 * DAY });
    s.reviewCard("d.0", 1, 1000, NOW - DAY); // one miss only
    stable(s, ["d.1", "d.2"], { due: NOW + 10 * DAY });
    s.reviewCard("d.1", 1, 1000, NOW - 2 * DAY);
    s.reviewCard("d.1", 1, 1000, NOW - DAY);
    stable(s, ["d.1"], { due: NOW + 10 * DAY }); // back in review state
    const w = weakSpots(s, NOW);
    expect(w).toEqual(["d.1"]);
    expect(buildSession(s, NOW).weak).toEqual(["d.1"]);
  });
  it("can be switched off, and quick sessions skip it", async () => {
    const s = await fresh({ weakSpots: false });
    const ids = vocabDeck(s, 2);
    stable(s, ids);
    s.reviewCard("d.1", 1, 1000, NOW - 2 * DAY);
    s.reviewCard("d.1", 1, 1000, NOW - DAY);
    stable(s, ["d.1"]);
    expect(weakSpots(s, NOW)).toEqual([]);
    s.updateSettings({ weakSpots: true });
    expect(buildSession(s, NOW, { limit: 5 }).weak).toEqual([]);
  });
});

describe("sentences for the same word", () => {
  async function mkSent() {
    const s = new Store(memoryBackend(), { autosave: false });
    await s.load();
    const rows = [
      ["私", "わたし", "I", "私は学生です。", "I am a student."],
      ["学生", "がくせい", "student", "先生は学生です。", "The teacher is a student."],
      ["先生", "せんせい", "teacher", "私は先生です。", "I am a teacher."],
      ["本", "ほん", "book", "私は鰐を読む。", "I read a crocodile."],
    ];
    const content = {};
    rows.forEach(([f, r, m, sent, en], i) => { content["d." + i] = { f, r, m, o: i, x: { sent, sentF: sent, sentE: en } }; });
    s.addDeck({ id: "d", name: "Words", kind: "vocab" }, content);
    s.markKnown("d", 4);
    s.markLessonsDone(["u1-wa", "u1-desu"]);
    return s;
  }
  it("finds other sentences whose remaining words you already know", async () => {
    const s = await mkSent();
    const idx = new SentenceIndex(s, NOW).finish();
    const forWatashi = idx.get("d.0").map((x) => x.markup);
    expect(forWatashi).toContain("私は先生です。"); // owned by 先生
    const forTeacher = idx.get("d.2").map((x) => x.markup);
    expect(forTeacher).toContain("先生は学生です。");
  });
  it("never offers a sentence that has another word you do not know", async () => {
    const s = await mkSent();
    const idx = new SentenceIndex(s, NOW).finish();
    for (const list of [...idx.map.values()]) for (const x of list) expect(x.markup).not.toMatch(/鰐/);
  });
  it("does not offer a sentence for words from its own card", async () => {
    const s = await mkSent();
    const idx = new SentenceIndex(s, NOW).finish();
    for (const [target, list] of idx.map) for (const x of list) expect(x.ownerId).not.toBe(target);
  });
  it("rotates through the card's own sentence and the others by review count", () => {
    const card = { x: { sentF: "own", sentE: "own en" } };
    const alts = [{ ownerId: "a", card: {}, markup: "alt1", en: "" }, { ownerId: "b", card: {}, markup: "alt2", en: "" }];
    expect([0, 1, 2, 3, 4].map((n) => pickSentence(card, alts, n).markup)).toEqual(["own", "alt1", "alt2", "own", "alt1"]);
    expect(pickSentence({ x: {} }, alts, 0).markup).toBe("alt1");
    expect(pickSentence({ x: {} }, [], 0)).toBe(null);
  });
});

import { parsePitch, packPitch, unpackPitch, pitchPattern, pitchType, morae } from "../src/lib/pitch.js";
import { mergeContent } from "../src/lib/merge.js";

const wrap = (t, drop) => `<span style="display:inline-block;position:relative;${drop ? "padding-right:0.1em;margin-right:0.1em;" : ""}"><span style="display:inline;">${t}</span><span style="border-color:currentColor;display:block;position:absolute;top:0.1em;border-top-width:0.1em;border-top-style:solid;${drop ? "right:-0.1em;height:0.4em;border-right-width:0.1em;border-right-style:solid;" : ""}"></span></span>`;

describe("pitch accent", () => {
  it("reads Kaishi's overline markup", () => {
    expect(packPitch(parsePitch("ワ" + wrap("タシ")))).toBe("ワタシ/0");
    expect(packPitch(parsePitch("ニ" + wrap("ホ", true) + "ン"))).toBe("ニホン/2");
    expect(packPitch(parsePitch(wrap("ネ", true) + "コ"))).toBe("ネコ/1");
    expect(packPitch(parsePitch("ヒ" + wrap("ト") + "・ヒ" + wrap("ト", true)))).toBe("ヒト/0|ヒト/2");
    expect(parsePitch("")).toEqual([]);
  });
  it("reads nested markup: the nasal g mark and drops after several morae", () => {
    // いそがしい [4]: イ + (ソ カ° シ with the step down) + イ, with the red ° after カ
    const inner = 'ソカ<span style="color: red;">°</span>シ';
    expect(packPitch(parsePitch("イ" + wrap(inner, true) + "イ"))).toBe("イソガシイ/4");
    // ソンナニ [0]: nothing after the overline
    expect(packPitch(parsePitch("ソ" + wrap("ンナニ")))).toBe("ソンナニ/0");
    // サイキン [0]
    expect(packPitch(parsePitch("サ" + wrap("イキン")))).toBe("サイキン/0");
    // a ° that does not follow か行 is ignored, stray tags and entities do not break it
    expect(packPitch(parsePitch("<b>ア</b>&nbsp;" + wrap('ト<span style="color:red">°</span>', true)))).toBe("アト/2");
  });
  it("counts morae with small kana and long vowels", () => {
    expect(morae("キョウト")).toEqual(["キョ", "ウ", "ト"]);
    expect(morae("ガッコウ")).toHaveLength(4);
    expect(morae("ラーメン")).toHaveLength(4);
  });
  it("builds the high/low pattern", () => {
    const cells = (k, a) => pitchPattern(k, a).map((c) => (c.high ? "H" : "L")).join("");
    expect(cells("ワタシ", 0)).toBe("LHH");
    expect(cells("ニホン", 2)).toBe("LHL");
    expect(cells("ネコ", 1)).toBe("HL");
    expect(cells("ハナ", 2)).toBe("LH");
    expect(cells("ハズカシイ", 4)).toBe("LHHHL");
    expect(pitchType("ワタシ", 0)).toBe("heiban");
    expect(pitchType("ネコ", 1)).toBe("atamadaka");
    expect(pitchType("ニホン", 2)).toBe("nakadaka");
    expect(pitchType("ハナ", 2)).toBe("odaka");
  });
  it("round-trips the stored form", () => {
    const list = [{ k: "ヒト", a: 0 }, { k: "ヒト", a: 2 }];
    expect(unpackPitch(packPitch(list))).toEqual(list);
    expect(unpackPitch("")).toEqual([]);
  });
});

describe("content merge", () => {
  it("keeps local values and gains fields only the other side has", () => {
    const local = { a: { f: "犬", m: "dog", x: { sent: "犬だ" } }, b: { f: "猫" } };
    const remote = { a: { f: "犬", m: "DOG", x: { sent: "x", pitch: "イヌ/2" } }, c: { f: "鳥" } };
    const out = mergeContent(local, remote);
    expect(out.a.m).toBe("dog");
    expect(out.a.x).toEqual({ sent: "犬だ", pitch: "イヌ/2" });
    expect(out.b).toEqual({ f: "猫" });
    expect(out.c).toEqual({ f: "鳥" });
  });
  it("is stable when merged twice", () => {
    const a = { z: { f: "a", x: { p: "1" } } };
    const b = { z: { f: "a", x: { q: "2" } } };
    expect(mergeContent(mergeContent(a, b), b)).toEqual(mergeContent(a, b));
    expect(mergeContent(a, b)).toEqual(mergeContent(b, a));
  });
});
