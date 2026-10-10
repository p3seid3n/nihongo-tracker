import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { buildLexicon, tokenize, analyzeSentence, fit, tokenInfo } from "../src/lib/lexicon.js";

const VOCAB = [
  ["私", "わたし", "I; me"], ["学生", "がくせい", "student"], ["先生", "せんせい", "teacher"], ["本", "ほん", "book"],
  ["読む", "よむ", "to read"], ["食べる", "たべる", "to eat"], ["水", "みず", "water"], ["飲む", "のむ", "to drink"],
  ["大きい", "おおきい", "big"], ["犬", "いぬ", "dog"],
];
async function mk({ known = VOCAB.length, lessons = [] } = {}) {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  const content = {};
  VOCAB.forEach(([f, r, m], i) => { content["d." + i] = { f, r, m, o: i, x: {} }; });
  s.addDeck({ id: "d", name: "Words", kind: "vocab" }, content);
  s.markKnown("d", known);
  if (lessons.length) s.markLessonsDone(lessons);
  return s;
}
const tok = (s, text) => tokenize(text, buildLexicon(s));

describe("tokenize", () => {
  it("splits a sentence into your words and marks grammar glosses until its lesson is done", async () => {
    const s = await mk();
    const t = tok(s, "私は学生です。");
    expect(t.map((x) => x.text).join("")).toBe("私は学生です。");
    const word = t.find((x) => x.text === "学生");
    expect(word.type).toBe("word");
    expect(word.gloss || "").toBe(""); // learned word: no gloss
    const wa = t.find((x) => x.text === "は");
    expect(wa.type).toBe("grammar");
    expect(wa.gloss).toBeTruthy(); // lesson not done yet
  });
  it("drops the gloss on grammar once its lesson is done", async () => {
    const s = await mk({ lessons: ["u1-wa", "u1-desu"] });
    const t = tok(s, "私は学生です。");
    expect(t.find((x) => x.text === "は").gloss || "").toBe("");
  });
  it("glosses vocabulary that is in your deck but not started yet", async () => {
    const s = await mk({ known: 5 }); // 犬 not started
    const t = tok(s, "犬は大きい。");
    const dog = t.find((x) => x.text === "犬");
    expect(dog.type).toBe("word");
    expect(dog.gloss).toMatch(/dog/);
  });
  it("recognises inflected forms of learned verbs", async () => {
    const s = await mk({ lessons: ["u1-verbs", "u1-past", "u1-neg", "u2-polite"] });
    for (const text of ["本を読みました。", "水を飲まない。", "食べている。"]) {
      const t = tok(s, text);
      expect(t.some((x) => x.type === "unknown"), text).toBe(false);
    }
    const t = tok(s, "本を読みました。");
    const v = t.find((x) => x.text.startsWith("読"));
    expect(v.form).toBe("polite-past");
    expect(tokenInfo(v, buildLexicon(s)).base).toBe("読む");
  });
  it("flags words that are not in any deck as unknown", async () => {
    const s = await mk();
    const t = tok(s, "私は鰐です。");
    expect(fit(t).unknown).toBeGreaterThan(0);
  });
  it("does not accept a compound whose parts you know but the word itself is missing", async () => {
    const s = await mk();
    const t = tok(s, "学生先生");
    expect(t.some((x) => x.type === "unknown")).toBe(true);
  });
  it("finds a lesson-bank word written in kana", async () => {
    const s = await mk();
    const t = tok(s, "がくせいです");
    const w = t.find((x) => x.text === "がくせい");
    expect(w && w.type).toBe("word");
  });
  it("keeps punctuation out of the content count", async () => {
    const s = await mk();
    const f = fit(tok(s, "私は学生です。"));
    expect(f.content).toBe(4);
  });
});

describe("analyzeSentence and tokenInfo", () => {
  it("keeps furigana per token and gives popup info", async () => {
    const s = await mk();
    const lex = buildLexicon(s);
    const a = analyzeSentence({ f: "x", x: { sentF: "私[わたし]は 学生[がくせい]です。" } }, lex);
    expect(a.text).toBe("私は学生です。");
    const w = a.tokens.find((t) => t.text === "学生");
    expect(w.m).toBe("学生[がくせい]");
    const info = tokenInfo(w, lex);
    expect(info.meaning).toMatch(/student/);
    expect(info.reading).toBe("がくせい");
  });
  it("returns null for cards without a sentence", async () => {
    const s = await mk();
    expect(analyzeSentence({ f: "x", x: {} }, buildLexicon(s))).toBeNull();
  });
});

describe("a suspended card is not treated as learned", () => {
  it("glosses the word", async () => {
    const s = await mk();
    expect(s.toggleSuspend("d.0")).toBe(true); // 私
    const me = tokenize("私は学生です。", buildLexicon(s)).find((x) => x.text === "私");
    expect(me.gloss).toBeTruthy();
  });
});
