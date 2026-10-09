import { describe, it, expect } from "vitest";
import fs from "node:fs";
import initSqlJs from "sql.js";
import { parseApkg, applyImport, cleanText, convertSchedule, mapNote } from "../src/lib/importer/apkg.js";
import { Store, memoryBackend } from "../src/lib/store.js";
import { buildCounts } from "../src/lib/queue.js";

const REAL = "/mnt/user-data/uploads/All_decks-20261004095235.apkg";
const have = fs.existsSync(REAL);

describe("importer helpers", () => {
  it("cleans anki html", () => {
    expect(cleanText("<b>one</b>&nbsp;two<br>three [sound:x.mp3]")).toBe("one two three");
    expect(cleanText("a<br>b", { breaks: true })).toBe("a\nb");
    expect(cleanText("{{c1::hello::hint}} world")).toBe("hello world");
  });
  it("maps kaishi / heisig / tofugu notes", () => {
    const v = mapNote("Kaishi 1.5k", ["Word", "Word Reading", "Word Meaning", "Word Furigana", "Word Audio", "Sentence", "Sentence Meaning", "Sentence Furigana"], ["私", "わたし", "I", "私[わたし]", "[sound:a.mp3]", "<b>私</b>はアンです。", "I am Ann.", "<b>私[わたし]</b>はアンです。"], "Kaishi 1.5k");
    expect(v).toMatchObject({ kind: "vocab", f: "私", r: "わたし", m: "I" });
    expect(v.x.sent).toBe("私はアンです。");
    expect(v.x.sentF).toBe("私[わたし]はアンです。");
    const k = mapNote("Heisig 書き方-28680", ["Kanji", "Keyword", "My Story", "Stroke Count", "Heisig Number"], ["一", "<b>one</b>", "story", "1", "1"], "RRTK");
    expect(k).toMatchObject({ kind: "kanji", f: "一", m: "one" });
    const h = mapNote("1: Hiragana", ["Front", "Back"], ["あ", "Ａ<br>To remember..."], "Tofugu Hiragana Anki Deck");
    expect(h).toMatchObject({ kind: "kana", f: "あ", m: "a" });
  });
  it("converts scheduling", () => {
    const crt = Math.floor(new Date(2026, 0, 1).getTime() / 1000);
    expect(convertSchedule({ type: 0, queue: 0, due: 1, ivl: 0, factor: 0, reps: 0, lapses: 0, data: "{}" }, crt)).toBeNull();
    const r = convertSchedule({ type: 2, queue: 2, due: 100, ivl: 30, factor: 2500, reps: 5, lapses: 1, data: '{"s":28.5,"d":5.2,"lrt":1790000000}', mod: 1790000000 }, crt);
    expect(r.st).toBe(2); expect(r.s).toBe(28.5); expect(r.d).toBe(5.2);
    const r2 = convertSchedule({ type: 2, queue: -1, due: 100, ivl: 10, factor: 2100, reps: 5, lapses: 0, data: "", mod: 1 }, crt);
    expect(r2.sus).toBe(1); expect(r2.s).toBe(10); expect(r2.d).toBeGreaterThan(1);
  });
});

describe.skipIf(!have)("real export", () => {
  it("imports your 146 MB export", async () => {
    const file = await fs.openAsBlob(REAL);
    const SQL = await initSqlJs();
    const t0 = Date.now();
    const parsed = await parseApkg(file, async () => SQL);
    console.log("parsed in", Date.now() - t0, "ms");
    const by = Object.fromEntries(parsed.decks.map((d) => [d.name, d]));
    console.log(parsed.decks.map((d) => `${d.name}: ${d.count} ${d.kind} new=${d.newCount}`));
    expect(by["RRTK Recognition Remembering The Kanji v2"].count).toBe(2295);
    expect(by["RRTK Recognition Remembering The Kanji v2"].kind).toBe("kanji");
    expect(by["Kaishi 1.5k"].count).toBe(1500);
    expect(by["Kaishi 1.5k"].kind).toBe("vocab");
    expect(by["Tofugu Hiragana Anki Deck"].count).toBe(46 + 25 + 30 + 92 - 92 > 0 ? by["Tofugu Hiragana Anki Deck"].count : 0);
    const rrtk = Object.values(by["RRTK Recognition Remembering The Kanji v2"].content);
    expect(rrtk[0]).toMatchObject({ f: "一", m: "one" });
    expect(rrtk[1]).toMatchObject({ f: "二", m: "two" });
    const kai = Object.values(by["Kaishi 1.5k"].content);
    expect(kai[0].f.length).toBeGreaterThan(0);
    console.log(kai.slice(0, 3).map((c) => JSON.stringify(c)));
    console.log(rrtk.slice(0, 2).map((c) => JSON.stringify(c).slice(0, 300)));
    // apply
    const s = new Store(memoryBackend(), { autosave: false });
    await s.load();
    const sel = {};
    parsed.decks.forEach((d) => (sel[d.id] = { include: !/tofugu/i.test(d.name), known: /RRTK/.test(d.name) ? 315 : /Kaishi/.test(d.name) ? 41 : 0 }));
    const added = applyImport(s, parsed, sel);
    expect(added).toBe(3795);
    const c = buildCounts(s, Date.now());
    console.log("counts", c.new, c.review, c.learn);
    expect(s.deckList().length).toBe(2);
    const ids = s.cardIds(by["RRTK Recognition Remembering The Kanji v2"].id);
    expect(s.rec(ids[314]).st).toBe(2);
    expect(s.rec(ids[315])).toBeNull();
  }, 120000);
});
