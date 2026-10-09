import { describe, it, expect } from "vitest";
import { parseFuri, plainOf, readingOf, conjText, conjMarkup, parseSentence } from "../src/lib/jp.js";

const eat = { w: "食", k: "た", ok: "べる", cls: "ru" };
const drink = { w: "飲", k: "の", ok: "む", cls: "u" };
const go = { w: "行", k: "い", ok: "く", cls: "iku" };
const buy = { w: "買", k: "か", ok: "う", cls: "u" };
const speak = { w: "話", k: "はな", ok: "す", cls: "u" };
const swim = { w: "泳", k: "およ", ok: "ぐ", cls: "u" };
const die = { w: "死", k: "し", ok: "ぬ", cls: "u" };
const play = { w: "遊", k: "あそ", ok: "ぶ", cls: "u" };
const wait = { w: "待", k: "ま", ok: "つ", cls: "u" };
const go_home = { w: "帰", k: "かえ", ok: "る", cls: "u" };
const aru = { w: "", k: "", ok: "ある", cls: "aru" };
const study = { w: "勉強", k: "べんきょう", ok: "する", cls: "suru" };
const come = { w: "来", k: "く", ok: "る", cls: "kuru" };
const big = { w: "大", k: "おお", ok: "きい", cls: "iadj" };
const good = { w: "", k: "", ok: "いい", cls: "ii" };
const quiet = { w: "静", k: "しず", ok: "か", cls: "nadj" };

describe("markup", () => {
  it("parses furigana", () => {
    expect(parseFuri("食[た]べる")).toEqual([{ t: "食", r: "た" }, { t: "べる" }]);
    expect(plainOf("取[と]り出[だ]す")).toBe("取り出す");
    expect(readingOf("お金[かね]")).toBe("おかね");
    expect(parseSentence("私[わたし]|は*|学生[がくせい]|です")[1]).toMatchObject({ text: "は", blank: true });
  });
});

describe("conjugation", () => {
  const cases = [
    [eat, { polite: "食べます", neg: "食べない", past: "食べた", te: "食べて", "past-neg": "食べなかった", potential: "食べられる", volitional: "食べよう", ba: "食べれば", tai: "食べたい", imperative: "食べろ", "polite-past-neg": "食べませんでした", causative: "食べさせる", passive: "食べられる" }],
    [drink, { polite: "飲みます", neg: "飲まない", past: "飲んだ", te: "飲んで", potential: "飲める", volitional: "飲もう", ba: "飲めば", tai: "飲みたい", tara: "飲んだら", imperative: "飲め", passive: "飲まれる", causative: "飲ませる" }],
    [go, { te: "行って", past: "行った", neg: "行かない", polite: "行きます" }],
    [buy, { neg: "買わない", te: "買って", volitional: "買おう", potential: "買える" }],
    [speak, { te: "話して", past: "話した", neg: "話さない" }],
    [swim, { te: "泳いで", past: "泳いだ", neg: "泳がない" }],
    [die, { te: "死んで", neg: "死なない" }],
    [play, { te: "遊んで", neg: "遊ばない" }],
    [wait, { te: "待って", neg: "待たない", polite: "待ちます" }],
    [go_home, { te: "帰って", neg: "帰らない", polite: "帰ります" }],
    [aru, { neg: "ない", "past-neg": "なかった", polite: "あります", te: "あって", past: "あった" }],
    [study, { polite: "勉強します", neg: "勉強しない", te: "勉強して", past: "勉強した", potential: "勉強できる" }],
    [come, { polite: "来ます", neg: "来ない", te: "来て", volitional: "来よう", imperative: "来い" }],
    [big, { neg: "大きくない", past: "大きかった", "past-neg": "大きくなかった", te: "大きくて", adv: "大きく", polite: "大きいです" }],
    [good, { neg: "よくない", past: "よかった", dict: "いい", adv: "よく" }],
    [quiet, { dict: "静かだ", neg: "静かじゃない", past: "静かだった", "past-neg": "静かじゃなかった", mod: "静かな", te: "静かで", adv: "静かに", polite: "静かです" }],
  ];
  for (const [word, forms] of cases) {
    for (const [form, expected] of Object.entries(forms)) {
      it(`${word.w}${word.ok} ${form} -> ${expected}`, () => expect(conjText(word, form)).toBe(expected));
    }
  }
  it("keeps readings correct for 来る", () => {
    expect(conjMarkup(come, "neg")).toBe("来[こ]ない");
    expect(conjMarkup(come, "polite")).toBe("来[き]ます");
    expect(conjMarkup(eat, "past")).toBe("食[た]べた");
  });
});

describe("compound forms", () => {
  it("teiru / naide", () => {
    expect(conjText(eat, "teiru")).toBe("食べている");
    expect(conjText(drink, "teita")).toBe("飲んでいた");
    expect(conjText(drink, "teinai")).toBe("飲んでいない");
    expect(conjText(drink, "naide")).toBe("飲まないで");
  });
});
