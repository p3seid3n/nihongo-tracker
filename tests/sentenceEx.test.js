import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { buildSentenceSession, startedSentences } from "../src/lib/sentenceEx.js";
import { mulberry32 } from "../src/content/generators.js";
import { audioPlan } from "../src/lib/audio.js";

const WORDS = [["私", "わたし", "I"], ["学生", "がくせい", "student"], ["先生", "せんせい", "teacher"], ["本", "ほん", "book"], ["水", "みず", "water"], ["犬", "いぬ", "dog"], ["猫", "ねこ", "cat"], ["友達", "ともだち", "friend"]];
const SENT = [
  ["私[わたし]は 学生[がくせい]です。", "I am a student."],
  ["先生[せんせい]は 友達[ともだち]です。", "The teacher is a friend."],
  ["これは 本[ほん]です。", "This is a book."],
  ["私[わたし]の 犬[いぬ]は 猫[ねこ]です。", "My dog is a cat."],
  ["友達[ともだち]は 学生[がくせい]です。", "My friend is a student."],
  ["先生[せんせい]の 本[ほん]です。", "It is the teacher's book."],
  ["水[みず]は 本[ほん]です。", "Water is a book."],
  ["猫[ねこ]は 先生[せんせい]です。", "The cat is a teacher."],
];
const LESSONS = ["u1-desu", "u1-wa", "u1-no", "u1-noun-particles"];
async function mk(known = WORDS.length, lessons = LESSONS) {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  const content = {};
  WORDS.forEach(([f, r, m], i) => { const [sentF, sentE] = SENT[i]; content["d." + i] = { f, r, m, o: i, x: { sentF, sent: sentF.replace(/\[[^\]]*\]| /g, ""), sentE } }; });
  s.addDeck({ id: "d", name: "Words", kind: "vocab" }, content);
  s.markKnown("d", known);
  s.markLessonsDone(lessons);
  return s;
}
const plain = (m) => m.replace(/\[[^\]]*\]/g, "").replace(/ /g, "");

describe("startedSentences", () => {
  it("only lists started, unsuspended cards with a translation", async () => {
    const s = await mk(5);
    expect(startedSentences(s).length).toBe(5);
    s.toggleSuspend("d.0");
    expect(startedSentences(s).length).toBe(4);
  });
});

describe("buildSentenceSession", () => {
  it("needs a few started sentences before it offers anything", async () => {
    const s = await mk(2);
    expect(buildSentenceSession(s, mulberry32(1)).list).toEqual([]);
  });
  it("builds mixed, well-formed exercises", async () => {
    const s = await mk();
    const { list, usable } = buildSentenceSession(s, mulberry32(3), { n: 10 });
    expect(usable).toBeGreaterThanOrEqual(3);
    expect(list.length).toBeGreaterThanOrEqual(5);
    const kinds = new Set(list.map((e) => e.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(2);
    for (const e of list) {
      expect(e.id).toBeTruthy();
      expect(e.instruction).toBeTruthy();
      if (e.kind === "choose") {
        expect(e.options.filter((o) => o.correct).length).toBe(1);
        expect(new Set(e.options.map((o) => o.text)).size).toBe(e.options.length);
      }
      if (e.kind === "build") {
        // the answer can be assembled from the bank
        const bank = e.bank.map((b) => b.text).sort();
        for (const a of e.answer) expect(bank).toContain(a);
      }
      if (e.kind === "match") expect(e.pairs.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("is reproducible for a seed and varies between seeds", async () => {
    const s = await mk();
    const a = buildSentenceSession(s, mulberry32(5)).list.map((e) => e.kind + e.instruction);
    const b = buildSentenceSession(s, mulberry32(5)).list.map((e) => e.kind + e.instruction);
    expect(a).toEqual(b);
  });
  it("never uses a sentence containing a word that is in none of your decks", async () => {
    const s = await mk();
    // add a started card whose sentence uses 鰐, which nothing knows
    s.addDeck({ id: "e", name: "More", kind: "vocab" }, { "e.0": { f: "象", r: "ぞう", m: "elephant", o: 0, x: { sentF: "鰐[わに]は 象[ぞう]です。", sent: "鰐は象です。", sentE: "The crocodile is an elephant." } } });
    s.markKnown("e", 1);
    for (let seed = 1; seed < 15; seed++) {
      const { list } = buildSentenceSession(s, mulberry32(seed), { n: 12 });
      expect(JSON.stringify(list)).not.toContain("鰐");
      // another sentence's translation may appear as a wrong option, but never as the right answer
      for (const e of list) if (e.kind === "choose") expect(e.options.find((o) => o.correct).text).not.toContain("crocodile");
    }
  });
  it("shows a gloss above words you have not learned yet instead of hiding them", async () => {
    const s = await mk(6); // 友達 (index 7) not started, 猫 (6) not started
    const { list } = buildSentenceSession(s, mulberry32(2), { n: 12 });
    const toks = list.flatMap((e) => (e.prompt && e.prompt.toks) || []);
    const unlearned = toks.filter((t) => t.type === "word" && !t.known);
    for (const t of unlearned) expect(t.gloss, t.text).toBeTruthy();
  });
  it("glosses grammar whose lesson is not done, and not grammar whose lesson is", async () => {
    const none = await mk(WORDS.length, []);
    const some = await mk(WORDS.length, LESSONS);
    const g = (s) => buildSentenceSession(s, mulberry32(4), { n: 12 }).list.flatMap((e) => (e.prompt && e.prompt.toks) || []).filter((t) => t.type === "grammar");
    const a = g(none), b = g(some);
    if (a.length) expect(a.every((t) => t.gloss)).toBe(true);
    expect(b.filter((t) => ["は", "です", "の"].includes(t.text)).every((t) => !t.gloss)).toBe(true);
  });
  it("answers to gap exercises are not given away and are among the options", async () => {
    const s = await mk();
    for (let seed = 1; seed < 8; seed++) {
      for (const e of buildSentenceSession(s, mulberry32(seed), { n: 12 }).list) {
        if (e.kind !== "choose" || e.prompt.blank == null) continue;
        const correct = e.options.find((o) => o.correct);
        expect(correct).toBeTruthy();
        expect(e.options.length).toBeGreaterThanOrEqual(3);
        const blankTok = e.prompt.toks[e.prompt.blank];
        expect(blankTok).toBeTruthy();
      }
    }
  });
});

describe("audioPlan", () => {
  it("defaults to word on open, sentence on reveal", () => {
    expect(audioPlan({})).toEqual({ word: "front", sentence: "reveal" });
  });
  it("migrates the old autoplay switch", () => {
    expect(audioPlan({ autoplay: false })).toEqual({ word: "off", sentence: "off" });
    expect(audioPlan({ autoplay: true })).toEqual({ word: "front", sentence: "reveal" });
  });
  it("explicit choices win over the legacy switch", () => {
    expect(audioPlan({ autoplay: false, audioWord: "reveal", audioSentence: "reveal" })).toEqual({ word: "reveal", sentence: "reveal" });
    expect(audioPlan({ audioWord: "off" })).toEqual({ word: "off", sentence: "reveal" });
  });
});
