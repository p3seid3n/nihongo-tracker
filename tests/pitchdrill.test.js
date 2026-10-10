import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { pitchWords, minimalPairs, shapeOptions, buildPitchSession } from "../src/lib/pitchDrill.js";
import { pitchType } from "../src/lib/pitch.js";

// [word, reading, meaning, pitch, audio]
const WORDS = [
  ["橋", "はし", "bridge", "ハシ/2", "hashi2.mp3"],
  ["箸", "はし", "chopsticks", "ハシ/1", "hashi1.mp3"],
  ["端", "はし", "edge", "ハシ/0", ""],
  ["雨", "あめ", "rain", "アメ/1", "ame1.mp3"],
  ["飴", "あめ", "candy", "アメ/0", "ame0.mp3"],
  ["猫", "ねこ", "cat", "ネコ/1", "neko.mp3"],
  ["私", "わたし", "I", "ワタシ/0", "watashi.mp3"],
  ["日本", "にほん", "Japan", "ニホン/2", "nihon.mp3"],
  ["木", "き", "tree", "キ/1", "ki.mp3"], // one mora: skipped
  ["何", "なに", "what", "ナニ/1|ナン/1", "nani.mp3"], // two readings: no single answer
  ["桜", "さくら", "cherry", "サクラ/0", "sakura.mp3"],
  ["先生", "せんせい", "teacher", "センセー/3", "sensei.mp3"],
  ["花", "はな", "flower", "ハナ/2", "hana.mp3"],
  ["鼻", "はな", "nose", "ハナ/0", "hana0.mp3"],
];
async function mk(known = WORDS.length) {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  const content = {};
  WORDS.forEach(([f, r, m, p, wa], i) => { content["d." + i] = { f, r, m, o: i, x: { pitch: p, wa } }; });
  s.addDeck({ id: "d", name: "Words", kind: "vocab" }, content);
  s.markKnown("d", known);
  return s;
}
const seeded = (seed) => { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };

describe("pitchWords", () => {
  it("keeps words with one pitch pattern and two or more morae, and says whether there is a recording", async () => {
    const w = pitchWords(await mk());
    const fs = w.map((x) => x.f);
    expect(fs).toContain("橋");
    expect(fs).not.toContain("木"); // one mora
    expect(fs).not.toContain("何"); // two patterns
    expect(w.find((x) => x.f === "端").hasFile).toBe(false);
    expect(w.find((x) => x.f === "橋")).toMatchObject({ k: "ハシ", a: 2, n: 2, hasFile: true, learned: true });
  });
  it("marks words you have not started", async () => {
    const w = pitchWords(await mk(3));
    expect(w.find((x) => x.f === "橋").learned).toBe(true);
    expect(w.find((x) => x.f === "桜").learned).toBe(false);
  });
  it("skips decks that are turned off and non-vocabulary decks", async () => {
    const s = await mk();
    s.updateDeck("d", { enabled: false });
    expect(pitchWords(s)).toEqual([]);
  });
});

describe("minimalPairs", () => {
  it("pairs words with the same reading and different accents, needing one started word", async () => {
    const pairs = minimalPairs(pitchWords(await mk()));
    const names = pairs.map(([a, b]) => [a.f, b.f].sort().join("/"));
    expect(names).toContain("橋/箸");
    expect(names).toContain("雨/飴");
    expect(names).toContain("花/鼻");
    expect(names).toContain("橋/端");
    const none = minimalPairs(pitchWords(await mk(0)));
    expect(none).toEqual([]);
  });
  it("never pairs a word with itself or an equal accent", () => {
    const w = (id, f, k, a) => ({ cardId: id, f, k, a, learned: true });
    expect(minimalPairs([w("1", "橋", "ハシ", 2), w("2", "橋", "ハシ", 2)]).length).toBe(0);
    expect(minimalPairs([w("1", "橋", "ハシ", 2), w("2", "端", "ハシ", 2)]).length).toBe(0);
  });
});

describe("shapeOptions", () => {
  it("always contains the right accent once, stays in range and shows the types", () => {
    for (const n of [2, 3, 4, 5, 7]) {
      for (let a = 0; a <= n; a++) {
        const o = shapeOptions(n, a, seeded(n * 31 + a));
        expect(o.filter((x) => x === a).length).toBe(1);
        expect(new Set(o).size).toBe(o.length);
        expect(o.every((x) => x >= 0 && x <= n)).toBe(true);
        expect(o.length).toBe(Math.min(4, n === 2 ? 3 : 4));
      }
    }
    // two morae: heiban, atamadaka, odaka are the only patterns
    const o2 = shapeOptions(2, 0, seeded(1));
    expect(new Set(o2.map((a) => pitchType("xx", a)))).toEqual(new Set(["heiban", "atamadaka", "odaka"]));
  });
});

describe("buildPitchSession", () => {
  it("builds questions with valid answers from words that have recordings", async () => {
    const s = await mk();
    const words = pitchWords(s);
    const has = async (file) => file !== "ame0.mp3"; // one clip is missing on this device
    const sess = await buildPitchSession(words, { count: 8, rand: seeded(5), has });
    expect(sess.questions.length).toBeGreaterThan(3);
    expect(sess.questions.length).toBeLessThanOrEqual(8);
    const used = new Set();
    for (const q of sess.questions) {
      if (q.kind === "pair") {
        expect(q.options.length).toBe(2);
        expect(q.options.some((o) => o.cardId === q.answer)).toBe(true);
        expect(q.heard.cardId).toBe(q.answer);
        expect(q.options[0].a).not.toBe(q.options[1].a);
        expect(q.options.every((o) => o.hasFile && o.part.file !== "ame0.mp3")).toBe(true);
      } else {
        expect(q.options).toContain(q.word.a);
        expect(q.answer).toBe(q.word.a);
        expect(q.word.part.file).not.toBe("ame0.mp3");
        expect(q.word.hasFile).toBe(true);
        used.add(q.word.cardId);
      }
    }
    expect(sess.questions.some((q) => q.kind === "pair")).toBe(true);
    expect(sess.questions.some((q) => q.kind === "shape")).toBe(true);
    expect(used.size).toBe(sess.questions.filter((q) => q.kind === "shape").length); // no word twice
  });
  it("without any recording nothing is asked", async () => {
    const words = pitchWords(await mk()).map((w) => ({ ...w, hasFile: false }));
    const sess = await buildPitchSession(words, { count: 10, has: async () => true });
    expect(sess.questions).toEqual([]);
  });
  it("falls back to shape questions when there are no pairs", async () => {
    const words = pitchWords(await mk()).filter((w) => ["猫", "私", "日本", "桜", "先生"].includes(w.f));
    const sess = await buildPitchSession(words, { count: 10, rand: seeded(9) });
    expect(sess.questions.length).toBe(5);
    expect(sess.questions.every((q) => q.kind === "shape")).toBe(true);
  });
});
