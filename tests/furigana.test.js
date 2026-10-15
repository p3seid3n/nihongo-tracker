import { describe, it, expect } from "vitest";
import { furiganaFor, readingsFromCards, cardFurigana, runs } from "../src/lib/furigana.js";

const known = readingsFromCards([
  { f: "手", r: "て" }, { f: "伝える", r: "つたえる" }, { f: "日", r: "ひ" }, { f: "本", r: "ほん" }, { f: "語", r: "ご" },
  { f: "学ぶ", r: "まなぶ" }, { f: "生きる", r: "いきる" }, { f: "x", r: "", x: { sentF: "学[がく]生[せい]です" } },
  { f: "人", r: "ひと" }, { f: "時", r: "とき" }, { f: "間", r: "あいだ" }, { f: "x", r: "", x: { sentF: "時[じ]間[かん]" } },
  { f: "一", r: "いち" }, { f: "回", r: "かい" }, { f: "学", r: "がく" }, { f: "校", r: "こう" },
]);

describe("furigana alignment", () => {
  it("splits words into kanji and kana runs", () => {
    expect(runs("手伝う")).toEqual([{ t: "手伝", kanji: true }, { t: "う", kanji: false }]);
  });
  it("matches okurigana", () => {
    expect(furiganaFor("食べる", "たべる")).toBe("食[た]べる");
    expect(furiganaFor("引き出し", "ひきだし")).toBe("引[ひ]き出[だ]し");
    expect(furiganaFor("お茶", "おちゃ")).toBe("お茶[ちゃ]");
    expect(furiganaFor("読み物", "よみもの")).toBe("読[よ]み物[もの]");
  });
  it("splits a run of kanji per kanji when their readings are known", () => {
    expect(furiganaFor("手伝う", "てつだう", known)).toBe("手[て]伝[つだ]う"); // つた → つだ (rendaku)
    expect(furiganaFor("学生", "がくせい", known)).toBe("学[がく]生[せい]");
    expect(furiganaFor("時間", "じかん", known)).toBe("時[じ]間[かん]");
    expect(furiganaFor("一回", "いっかい", known)).toBe("一[いっ]回[かい]"); // いち → いっ
    expect(furiganaFor("学校", "がっこう", known)).toBe("学[がっ]校[こう]"); // がく → がっ
    expect(furiganaFor("日本語", "にほんご", known)).toBe("日[に]本[ほん]語[ご]"); // one unknown reading (に) is allowed
  });
  it("keeps the whole run together when it can't be split", () => {
    expect(furiganaFor("今日", "きょう", known)).toBe("今日[きょう]");
    expect(furiganaFor("手伝う", "てつだう")).toBe("手伝[てつだ]う");
  });
  it("handles katakana readings, several readings and repeat marks", () => {
    expect(furiganaFor("食べる", "タベル")).toBe("食[た]べる");
    expect(furiganaFor("人々", "ひとびと", known)).toBe("人[ひと]々[びと]");
    expect(furiganaFor("私", "わたし、わたくし")).toBe("私[わたし]");
  });
  it("gives up on words whose reading doesn't fit", () => {
    expect(furiganaFor("食べる", "のむ")).toBeNull();
    expect(furiganaFor("たべる", "たべる")).toBeNull();
    expect(furiganaFor("", "a")).toBeNull();
  });
  it("prefers the deck's own per-kanji furigana", () => {
    expect(cardFurigana({ f: "私", r: "わたし", x: { wf: "私[わたし]" } }, known)).toBe("私[わたし]");
    expect(cardFurigana({ f: "手伝う", r: "てつだう", x: { wf: "手伝[てつだ]う" } }, known)).toBe("手[て]伝[つだ]う");
    expect(cardFurigana({ f: "あなた", r: "あなた", x: { wf: "あなた" } }, known)).toBeNull();
  });
});
