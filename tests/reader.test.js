import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { buildLexicon } from "../src/lib/lexicon.js";
import { PASSAGES, READER_LEVELS, READER_WORDS } from "../src/content/reader.js";
import { PROMPTS } from "../src/content/prompts.js";
import { analyzePassage, coverageBand, recommend, orderPassages, TARGET } from "../src/lib/reader.js";
import { checkOutput, wordsToTry } from "../src/lib/outputCheck.js";
import { plainOf, readingOf, parseFuri } from "../src/lib/jp.js";
import { dayKey } from "../src/lib/time.js";
import { ACTIVITY } from "../src/lib/effort.js";

const KANA = /^[ぁ-ゖァ-ヺー]+$/;
const KANJI = /[一-鿿々]/;

async function emptyStore() {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  return s;
}

function lintLine(jp, where) {
  const marks = [...jp.matchAll(/\[([^\]]*)\]/g)];
  for (const m of marks) expect(KANA.test(m[1]), `${where}: reading "${m[1]}" must be kana`).toBe(true);
  // every bracket belongs to kanji right before it
  expect(/[^一-鿿々]\[/.test(jp) || /^\[/.test(jp), `${where}: furigana must follow kanji`).toBe(false);
  const plain = plainOf(jp);
  expect(/[\[\]]/.test(plain), where).toBe(false);
  expect(/[A-Za-z0-9]/.test(plain), `${where}: no latin letters or digits`).toBe(false);
  expect(/[。？！」]$/.test(plain), `${where}: ends with punctuation`).toBe(true);
  // kanji without a reading would show no furigana for a learner
  const segs = parseFuri(jp);
  for (const sg of segs) if (!sg.r && KANJI.test(sg.t)) expect.fail(`${where}: kanji without a reading in "${sg.t}"`);
}

describe("reader texts", () => {
  it("have unique ids, levels and non-empty lines", () => {
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(PASSAGES.length);
    for (const p of PASSAGES) {
      expect(READER_LEVELS[p.level], p.id).toBeTruthy();
      expect(p.jp && p.en, p.id).toBeTruthy();
      expect(p.lines.length, p.id).toBeGreaterThanOrEqual(4);
      for (const [jp, en] of p.lines) { expect(jp.length).toBeGreaterThan(2); expect(en.length).toBeGreaterThan(3); }
    }
  });
  it("use well-formed furigana markup", () => {
    for (const p of PASSAGES) p.lines.forEach(([jp], i) => lintLine(jp, `${p.id}#${i}`));
  });
  it("cover all four levels with a good spread", () => {
    for (const lv of [1, 2, 3, 4]) expect(PASSAGES.filter((p) => p.level === lv).length).toBeGreaterThanOrEqual(4);
  });
  it("are tokenised completely, with nothing left unexplained", async () => {
    const s = await emptyStore();
    const lex = buildLexicon(s, Date.now(), { extra: READER_WORDS });
    const unexplained = [];
    for (const p of PASSAGES) {
      const r = analyzePassage(p, lex);
      r.lines.forEach((l, i) => l.toks.forEach((t) => { if (t.type === "unknown") unexplained.push(`${p.id}#${i}: ${t.text}`); }));
    }
    expect(unexplained).toEqual([]);
  });
  it("use readings that agree with the reader word list and the word bank", async () => {
    const s = await emptyStore();
    const lex = buildLexicon(s, Date.now(), { extra: READER_WORDS });
    const bad = [];
    for (const p of PASSAGES) {
      const r = analyzePassage(p, lex);
      r.lines.forEach((l, i) => {
        expect(l.toks.length, `${p.id}#${i}`).toBeGreaterThan(0);
        expect(l.toks.map((t) => t.text).join(""), `${p.id}#${i}`).toBe(plainOf(l.jp));
        for (const t of l.toks) {
          if (t.type !== "word" || !t.info || t.info.form || !KANJI.test(t.text)) continue;
          // dictionary-form tokens only; compare with what the app knows about this word
          const known = t.info.reading;
          if (known && !/[・、]/.test(known) && known !== t.info.text && readingOf(t.m) !== known) bad.push(`${p.id}#${i} ${t.text}: text says ${readingOf(t.m)}, word list says ${known}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });
});

describe("writing prompts", () => {
  it("have unique ids and clean model answers", () => {
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
    for (const p of PROMPTS) {
      expect([1, 2, 3]).toContain(p.level);
      expect(p.en.length).toBeGreaterThan(10);
      expect(p.model.length).toBeGreaterThanOrEqual(2);
      p.model.forEach(([jp, en], i) => { lintLine(jp, `${p.id}#${i}`); expect(en.length).toBeGreaterThan(3); });
    }
  });
});

const WORDS = [
  ["私", "わたし", "I; me"], ["学生", "がくせい", "student"], ["先生", "せんせい", "teacher"], ["本", "ほん", "book"],
  ["読む", "よむ", "to read"], ["水", "みず", "water"], ["飲む", "のむ", "to drink"], ["犬", "いぬ", "dog"],
];
async function withDeck({ known = WORDS.length, lessons = [] } = {}) {
  const s = await emptyStore();
  const content = {};
  WORDS.forEach(([f, r, m], i) => { content["d." + i] = { f, r, m, o: i, x: {} }; });
  s.addDeck({ id: "d", name: "Words", kind: "vocab" }, content);
  s.markKnown("d", known);
  if (lessons.length) s.markLessonsDone(lessons);
  return s;
}

describe("coverage of a text", () => {
  const passage = { id: "t", level: 1, jp: "t", en: "t", lines: [["私[わたし]は学生[がくせい]です。", "I am a student."], ["私[わたし]は鰐[わに]を読[よ]みます。", "I read a crocodile."]] };
  it("counts known words and grammar, and lists what is new", async () => {
    const s = await withDeck({ lessons: ["u1-wa", "u1-desu", "u1-wo", "u2-polite", "u1-verbs"] });
    const r = analyzePassage(passage, buildLexicon(s));
    expect(r.total).toBeGreaterThan(5);
    expect(r.coverage).toBeGreaterThan(0.6);
    expect(r.coverage).toBeLessThan(1);
    expect(r.fresh.some((f) => f.text === "鰐")).toBe(true);
  });
  it("improves as you learn more", async () => {
    const few = await withDeck({ known: 1 });
    const many = await withDeck({ known: WORDS.length, lessons: ["u1-wa", "u1-desu", "u1-wo", "u2-polite", "u1-verbs"] });
    const a = analyzePassage(passage, buildLexicon(few));
    const b = analyzePassage(passage, buildLexicon(many));
    expect(b.coverage).toBeGreaterThan(a.coverage);
  });
  it("names the bands", () => {
    expect(coverageBand(0.99)).toBe("easy");
    expect(coverageBand(0.97)).toBe("easy");
    expect(coverageBand(0.94)).toBe("sweet");
    expect(coverageBand(0.9)).toBe("sweet");
    expect(coverageBand(0.85)).toBe("stretch");
    expect(coverageBand(0.6)).toBe("hard");
  });
  it("recommends the unread text nearest the sweet spot and orders the list", () => {
    const mk = (id, coverage, level = 1) => ({ id, coverage, passage: { level } });
    const rs = [mk("a", 1), mk("b", 0.94), mk("c", 0.7), mk("d", 0.91)];
    expect(recommend(rs, () => false).id).toBe("b");
    expect(recommend(rs, (id) => id === "b").id).toBe("d"); // 0.91 is nearer than 1.0
    expect(recommend([mk("x", 0.5), mk("y", 0.7)], () => false).id).toBe("y"); // nothing near: the easiest
    expect(recommend(rs, () => true)).toBeTruthy(); // all read: still suggests one
    expect(orderPassages(rs, (id) => id === "b").map((r) => r.id)).toEqual(["d", "a", "c", "b"]);
    expect(TARGET).toBeGreaterThan(0.9);
  });
});

describe("marking practice as done", () => {
  it("stores the record, counts as activity and keeps the first date", async () => {
    const s = await emptyStore();
    const t0 = new Date(2026, 9, 10, 12).getTime();
    s.markPractice("read", "cafe", { ms: 90000, now: t0 });
    s.markPractice("read", "cafe", { ms: 60000, now: t0 + 1000 });
    const rec = s.lessons["read.cafe"];
    expect(rec.done).toBe(t0 + 1000);
    expect(rec.first).toBe(t0);
    expect(rec.tries).toBe(2);
    const rows = s.log[Object.keys(s.log)[0]];
    expect(rows.every((r) => r[4] === ACTIVITY)).toBe(true);
    expect(rows).toHaveLength(2);
    expect(dayKey(rows[0][0])).toBe(dayKey(t0));
    expect(s.meta.dirty.lessons).toBe(true);
  });
});

describe("output check", () => {
  it("separates what you know, what is new and what is not found", async () => {
    const s = await withDeck({ known: 6, lessons: ["u1-wa", "u1-desu"] }); // 犬 and 水 are not started
    const lex = buildLexicon(s);
    const res = checkOutput("私は学生です。犬は鰐です。", lex);
    expect(res.total).toBeGreaterThan(5);
    expect(res.notFound).toContain("鰐");
    expect(res.notYet.some((w) => w.text === "犬")).toBe(true);
    expect(res.share).toBeGreaterThan(0.4);
    expect(res.sentences).toBe(2);
  });
  it("flags grammar from lessons you have not done", async () => {
    const s = await withDeck({ lessons: [] });
    const res = checkOutput("私は学生です。", buildLexicon(s));
    expect(res.grammarNew.map((g) => g.text)).toEqual(expect.arrayContaining(["は"]));
    const done = await withDeck({ lessons: ["u1-wa", "u1-desu"] });
    expect(checkOutput("私は学生です。", buildLexicon(done)).grammarNew).toEqual([]);
  });
  it("accepts kana spellings of words you know and notes which wanted words were used", async () => {
    const s = await withDeck({ lessons: ["u1-wa", "u1-desu"] });
    const lex = buildLexicon(s);
    const wanted = wordsToTry(lex, s, Date.now(), 4, () => 0.5);
    expect(wanted.length).toBeGreaterThan(0);
    const res = checkOutput("わたしはがくせいです", lex, wanted);
    expect(res.notFound).toEqual([]);
    expect(res.wantedUsed.map((w) => w.f)).toEqual(expect.arrayContaining(["私", "学生"]));
  });
  it("returns nothing for empty text", async () => {
    const s = await withDeck();
    expect(checkOutput("   ", buildLexicon(s))).toBe(null);
  });
});
