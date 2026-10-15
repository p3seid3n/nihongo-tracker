import { describe, it, expect } from "vitest";
import { explainBuild, explainChoice, isAltOrder, formRule, diffText, chunks } from "../src/lib/mistakes.js";
import { buildLessonExercises } from "../src/lib/exercises.js";
import { LESSONS } from "../src/content/lessons.js";
import { mulberry32 } from "../src/content/generators.js";

const bank = (texts) => texts.map((t, i) => ({ id: "b" + i, text: t, m: t }));
const build = (answer, extra = []) => ({ answer, bank: bank([...answer, ...extra]) });

describe("explaining a built sentence", () => {
  it("names a wrong particle and says what each one does", () => {
    const r = explainBuild(build(["私", "は", "医者", "じゃありません"], ["を"]), ["私", "を", "医者", "じゃありません"]);
    expect(r.correct).toBe(false);
    expect(r.points[0]).toMatch(/You used \*\*を\*\* where the sentence needs \*\*は\*\* after \*\*私\*\*/);
    expect(r.points[0]).toMatch(/\*\*は\*\* marks the topic/);
    expect(r.points[0]).toMatch(/object/);
    expect(r.fix.markup).toBe("私は医者じゃありません");
  });
  it("says when the verb is not at the end", () => {
    const r = explainBuild(build(["パン", "を", "食べます"]), ["食べます", "パン", "を"]);
    expect(r.points.join(" ")).toMatch(/\*\*食べます\*\* belongs at the end/);
  });
  it("says when a particle is cut off from its word", () => {
    const r = explainBuild(build(["私", "は", "学生", "です"]), ["は", "私", "学生", "です"]);
    expect(r.points.join(" ")).toMatch(/\*\*は\*\* goes right after \*\*私\*\*/);
  });
  it("points out extra and missing words", () => {
    const r = explainBuild(build(["私", "は", "学生", "です"], ["先生"]), ["私", "は", "先生", "です"]);
    const all = r.points.join(" ");
    expect(all).toMatch(/\*\*先生\*\*.*isn't part of this sentence/);
    expect(all).toMatch(/\*\*学生\*\*.*is missing/);
  });
  it("accepts noun phrases in another order and shows the usual one", () => {
    const ans = ["私", "は", "学校", "で", "日本語", "を", "勉強します"];
    expect(isAltOrder(ans, ["私", "は", "日本語", "を", "学校", "で", "勉強します"])).toBe(true);
    const r = explainBuild(build(ans), ["私", "は", "日本語", "を", "学校", "で", "勉強します"]);
    expect(r).toMatchObject({ correct: true, alt: true });
    // but not when the verb moves, a particle changes, or the topic leaves the front
    expect(isAltOrder(ans, ["私", "は", "学校", "で", "勉強します", "日本語", "を"])).toBe(false);
    expect(isAltOrder(ans, ["学校", "で", "私", "は", "日本語", "を", "勉強します"])).toBe(false);
    expect(isAltOrder(["私", "は", "医者", "です"], ["医者", "です", "私", "は"])).toBe(false);
  });
  it("explains a right answer too", () => {
    const r = explainBuild(build(["私", "は", "医者", "じゃありません"]), ["私", "は", "医者", "じゃありません"]);
    expect(r.correct).toBe(true);
    expect(r.points.join(" ")).toMatch(/私は/);
  });
  it("splits sentences into phrases", () => {
    expect(chunks(["私", "は", "パン", "を", "食べる"])).toEqual({ phrases: [["私", "は"], ["パン", "を"]], predicate: ["食べる"] });
  });
});

describe("explaining a choice", () => {
  const opt = (text, correct, meta) => ({ id: text, text, correct, meta });
  it("explains a conjugation picked as the wrong kind of verb", () => {
    const ex = { instruction: "Make the negative (〜ない)", options: [opt("帰[かえ]らない", true, { form: "neg", cls: "u" }), opt("帰[かえ]ない", false, { form: "neg", cls: "ru" })], meta: { form: "neg", cls: "u", word: "帰る" } };
    const r = explainChoice(ex, ex.options[1]);
    expect(r.points.join(" ")).toMatch(/as if it were a る-verb/);
    expect(r.points.join(" ")).toMatch(/Change the final る to ら and add ない/);
  });
  it("explains a conjugation picked in the wrong form", () => {
    const ex = { instruction: "Choose the right form", options: [opt("食[た]べる", true, { form: "dict", cls: "ru" }), opt("食[た]べなかった", false, { form: "past-neg", cls: "ru" })], meta: { form: "dict", cls: "ru", word: "食べる", en: "I eat bread." } };
    const r = explainChoice(ex, ex.options[1]);
    expect(r.points[0]).toMatch(/past negative/);
    expect(r.points[0]).toMatch(/“I eat bread.” calls for the dictionary form/);
  });
  it("contrasts two particles in a gap", () => {
    const ex = { instruction: "Fill in the blank", options: [opt("に", true), opt("を", false)], explain: "行く takes に for the destination." };
    const r = explainChoice(ex, ex.options[1]);
    expect(r.points[0]).toMatch(/You picked \*\*を\*\*.*needs \*\*に\*\*/);
    expect(r.points).toContain("行く takes に for the destination.");
  });
  it("names the meaning of a wrong word", () => {
    const ex = { instruction: "Fill in the gap", prompt: { en: "I like cats." }, options: [opt("猫[ねこ]", true, { gloss: "cat" }), opt("犬[いぬ]", false, { gloss: "dog" })] };
    expect(explainChoice(ex, ex.options[1]).points[0]).toMatch(/\*\*犬\*\* means “dog”.*needs \*\*猫\*\* \(“cat”\)/);
  });
  it("finds the difference between two sentences", () => {
    expect(diffText("私は学生です", "私が学生です")).toEqual(["は", "が"]);
    const ex = { instruction: "Which sentence is correct?", options: [opt("私は学生です", true), opt("私が学生です", false)] };
    expect(explainChoice(ex, ex.options[1]).points[0]).toMatch(/\*\*が\*\* against \*\*は\*\*/);
  });
});

describe("form rules", () => {
  it("give the way to make each form", () => {
    expect(formRule("te", "u", "書く")).toMatch(/いて/);
    expect(formRule("te", "iku", "行く")).toMatch(/行って/);
    expect(formRule("past", "u", "飲む")).toMatch(/んだ/);
    expect(formRule("polite", "u", "書く")).toMatch(/書き/);
    expect(formRule("neg", "u", "買う")).toMatch(/わ/);
    expect(formRule("past", "ii", "いい")).toMatch(/よかった/);
    expect(formRule("neg", "nadj", "静か")).toMatch(/じゃない/);
  });
});

describe("every lesson exercise can be explained", () => {
  it("never throws and always says something for a wrong answer", () => {
    let n = 0;
    for (const lesson of LESSONS) {
      const list = buildLessonExercises(lesson, { rng: mulberry32(7), weight: () => 1 });
      for (const ex of list) {
        if (ex.kind === "build") {
          const wrong = [...ex.answer].reverse();
          const r = explainBuild(ex, wrong);
          if (!r.correct) expect(r.points.length).toBeGreaterThan(0);
          n++;
        } else if (ex.kind === "choose") {
          const bad = ex.options.find((o) => !o.correct);
          const r = explainChoice(ex, bad);
          expect(r.correct).toBe(false);
          expect(r.points.length + (r.fix ? 1 : 0)).toBeGreaterThan(0);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(300);
  });
});
