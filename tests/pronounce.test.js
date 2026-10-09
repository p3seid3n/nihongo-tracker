import { describe, it, expect } from "vitest";
import { norm, align, judge, unitsFromMarkup } from "../src/lib/pronounce.js";

describe("norm", () => {
  it("ignores punctuation, spaces and katakana/hiragana differences", () => {
    expect(norm("私は、アンです。")).toBe("私はあんです");
    expect(norm(" わ た し ")).toBe("わたし");
  });
  it("makes digits and kanji numerals comparable", () => {
    expect(norm("3つ")).toBe(norm("三つ"));
  });
  it("width-normalises", () => {
    expect(norm("ｱﾝ")).toBe("あん");
    expect(norm("ＡＢＣ")).toBe("abc");
  });
});

describe("align", () => {
  it("marks which target characters were heard, in order", () => {
    const { hits, lcs } = align("おはよう", "おはよ");
    expect(hits).toEqual([true, true, true, false]);
    expect(lcs).toBe(3);
  });
  it("does not let out-of-order characters count", () => {
    const { hits } = align("ab", "ba");
    expect(hits.filter(Boolean)).toHaveLength(1);
  });
});

describe("judge", () => {
  it("accepts the exact word", () => {
    const r = judge([{ text: "橋" }, { text: "はし" }], [{ text: "橋", conf: 0.9 }]);
    expect(r.level).toBe("great");
    expect(r.score).toBe(1);
  });
  it("accepts the reading when the recogniser writes kana", () => {
    const r = judge([{ text: "橋" }, { text: "はし" }], [{ text: "ハシ" }]);
    expect(r.level).toBe("great");
    expect(r.target).toBe("はし");
  });
  it("takes the best of several alternatives", () => {
    const r = judge(["私"], [{ text: "渡し" }, { text: "私" }, { text: "わたし" }]);
    expect(r.level).toBe("great");
  });
  it("one wrong sound in a short word is not accepted", () => {
    const r = judge([{ text: "ねこ" }], ["ねご"]);
    expect(r.level).toBe("retry");
    expect(r.chars.map((c) => c.ok)).toEqual([true, false]);
  });
  it("sentences: complete is great, missing the end is close, unrelated is retry", () => {
    const t = "私は毎朝六時に起きて、コーヒーを飲みます。";
    expect(judge([t], [t]).level).toBe("great");
    expect(judge([t], ["私は毎朝六時に起きてコーヒーを"]).level).toBe("close");
    expect(judge([t], ["私は毎朝六時に起きて"]).level).toBe("retry");
    expect(judge([t], ["今日はいい天気ですね"]).level).toBe("retry");
  });
  it("punctuation in the target is shown but never counted as a miss", () => {
    const r = judge(["私は、アンです。"], ["私はアンです"]);
    expect(r.level).toBe("great");
    expect(r.chars.every((c) => c.ok)).toBe(true);
  });
  it("silence or nothing to compare is a retry, not a crash", () => {
    expect(judge(["私"], []).level).toBe("retry");
    expect(judge(["私"], [{ text: "  " }]).level).toBe("retry");
    expect(judge([], ["私"]).level).toBe("retry");
  });

  it("sentences: words the recogniser writes in kana still count when the reading is known", () => {
    const markup = "私[わたし]は毎朝[まいあさ]六時[ろくじ]に起[お]きて、コーヒーを飲[の]みます。";
    const text = "私は毎朝六時に起きて、コーヒーを飲みます。";
    const units = unitsFromMarkup(markup);
    expect(judge([text], ["わたしは毎朝6時におきてコーヒーをのみます"]).level).not.toBe("great"); // plain comparison struggles
    const r = judge([text], ["わたしは毎朝6時におきてコーヒーをのみます"], { units });
    expect(r.level).toBe("great");
    expect(r.chars.map((c) => c.c).join("")).toBe(text);
    expect(r.chars.every((c) => c.ok)).toBe(true);
  });
  it("sentences with units still mark what was missed", () => {
    const units = unitsFromMarkup("私[わたし]はアンです。");
    const r = judge(["私はアンです。"], ["私はです"], { units });
    expect(r.chars.filter((c) => !c.ok).map((c) => c.c)).toEqual(["ア", "ン"]);
  });
});
