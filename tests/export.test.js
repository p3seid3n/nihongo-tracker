import { describe, it, expect } from "vitest";
import initSqlJs from "sql.js";
import * as fflate from "fflate";
import { Store, memoryBackend } from "../src/lib/store.js";
import { buildAnkiCollection, packApkg, sha1, guidFor } from "../src/lib/exporter/anki.js";
import { parseCollection, parseApkg } from "../src/lib/importer/apkg.js";
import { prodId } from "../src/lib/ids.js";
import { REVIEW, LEARNING } from "../src/lib/fsrs.js";
import { DAY, MIN, dayIndex } from "../src/lib/time.js";

const NOW = new Date(2026, 9, 15, 15, 0, 0).getTime();

async function sample() {
  const s = new Store(memoryBackend(), { autosave: false });
  await s.load();
  s.updateSettings({ onboarded: true });
  s.addDeck({ id: "kai", name: "Kaishi 1.5k", kind: "vocab" }, {
    "kai.1": { f: "手伝う", r: "てつだう", m: "to help", o: 0, x: { sentF: "私[わたし]が 手伝[てつだ]いましょう。", sentE: "I will help you.", wa: "tetsudau.mp3", img: "help.webp" } },
    "kai.2": { f: "お茶", r: "おちゃ", m: "tea", o: 1, x: {} },
    "kai.3": { f: "学校", r: "がっこう", m: "school", o: 2, x: {} },
    "kai.4": { f: "手", r: "て", m: "hand", o: 3, x: {} },
    "kai.5": { f: "伝える", r: "つたえる", m: "to convey", o: 4, x: {} },
  });
  s.addDeck({ id: "rtk", name: "RRTK", kind: "kanji" }, { "rtk.1": { f: "一", m: "one", o: 0, x: { story: "a line" } } });
  s.prog.kai = {
    "kai.1": { st: REVIEW, s: 15.2, d: 5.1, due: NOW + 3 * DAY, last: NOW - 12 * DAY, reps: 4, lapses: 1, step: 0, ivl: 15, note: "te + tsudau" },
    [prodId("kai.1")]: { st: REVIEW, s: 6, d: 6, due: NOW + 2 * DAY, last: NOW - 4 * DAY, reps: 2, lapses: 0, step: 0, ivl: 6 },
    "kai.2": { st: LEARNING, s: 1.2, d: 6, due: NOW + 5 * MIN, last: NOW - 5 * MIN, reps: 1, lapses: 0, step: 1 },
  };
  s.prog.rtk = { "rtk.1": { st: REVIEW, s: 40, d: 3, due: NOW - DAY, last: NOW - 41 * DAY, reps: 5, lapses: 0, step: 0, ivl: 40, sus: 1 } };
  s.log["2026-10"] = [[NOW - 12 * DAY, "kai.1", 3, 4000, 2, 15], [NOW - 5 * MIN, "kai.2", 3, 3000, 0, 0], [NOW - 4 * DAY, "g.review", 3, 1000, 9, 0]];
  return s;
}

describe("Anki export", () => {
  it("writes a collection Anki can read, with scheduling and FSRS memory", async () => {
    const SQL = await initSqlJs();
    const s = await sample();
    const out = buildAnkiCollection(SQL, s, { now: NOW });
    expect(out.counts).toMatchObject({ notes: 6, cards: 7, reviews: 2, suspended: 1 });
    expect(out.media.sort()).toEqual(["help.webp", "tetsudau.mp3"]);
    const db = new SQL.Database(out.bytes);
    const q = (x) => db.exec(x)[0]?.values || [];
    const [crt] = q("select crt from col")[0];
    const cards = q("select c.ord, c.type, c.queue, c.due, c.ivl, c.reps, c.lapses, c.data, n.flds from cards c join notes n on n.id = c.nid order by c.id");
    const help = cards.find((r) => r[0] === 0 && String(r[8]).startsWith("手伝う"));
    expect(help.slice(1, 7)).toEqual([2, 2, dayIndex(NOW + 3 * DAY) - dayIndex(crt * 1000 + 4 * 3600e3), 15, 4, 1]);
    expect(JSON.parse(help[7])).toMatchObject({ s: 15.2, d: 5.1, dr: 0.9, lrt: Math.floor((NOW - 12 * DAY) / 1000) });
    const flds = String(help[8]).split("\x1f");
    expect(flds[2]).toBe("手[て] 伝[つだ]う"); // furigana per kanji, in Anki's format
    expect(flds[4]).toBe("私[わたし]が 手伝[てつだ]いましょう。");
    expect(flds[7]).toBe("te + tsudau");
    expect(flds[8]).toBe("[sound:tetsudau.mp3]");
    expect(flds[10]).toBe('<img src="help.webp">');
    expect(flds[11]).toBe("y");
    const recall = cards.find((r) => r[0] === 1);
    expect(recall.slice(1, 3)).toEqual([2, 2]);
    const tea = cards.find((r) => String(r[8]).startsWith("お茶"));
    expect(tea.slice(1, 3)).toEqual([1, 1]); // learning, due today
    expect(String(tea[8]).split("\x1f")[2]).toBe("お 茶[ちゃ]");
    const kanji = cards.find((r) => String(r[8]).startsWith("一"));
    expect(kanji[2]).toBe(-1); // suspended
    expect(q("select count(*) from revlog")[0][0]).toBe(2);
    const dconf = JSON.parse(q("select dconf from col")[0][0])["1700000000777"];
    expect(dconf.fsrsParams6).toHaveLength(21);
    expect(dconf.desiredRetention).toBe(0.9);
    expect(dconf.new.delays).toEqual([1, 10]);
  });

  it("round-trips through the importer", async () => {
    const SQL = await initSqlJs();
    const s = await sample();
    const { bytes } = buildAnkiCollection(SQL, s, { now: NOW });
    const parsed = parseCollection(SQL, bytes);
    const kai = parsed.decks.find((d) => d.name === "Kaishi 1.5k");
    expect(kai.count).toBe(5);
    const help = Object.values(kai.content).find((c) => c.f === "手伝う");
    expect(help).toMatchObject({ r: "てつだう", m: "to help" });
    const rec = Object.values(kai.prog).find((r) => r.s === 15.2);
    expect(rec).toMatchObject({ st: 2, d: 5.1, reps: 4, lapses: 1 });
    expect(dayIndex(rec.due)).toBe(dayIndex(NOW + 3 * DAY));
  });

  it("packs an .apkg with numbered media", async () => {
    const SQL = await initSqlJs();
    const s = await sample();
    const { bytes, media } = buildAnkiCollection(SQL, s, { now: NOW });
    const { blob, mediaCount } = await packApkg(fflate, bytes, media, async (n) => (n === "help.webp" ? new Uint8Array([1, 2, 3]) : null));
    expect(mediaCount).toBe(1);
    const files = fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(["0", "collection.anki2", "media"]);
    expect(JSON.parse(new TextDecoder().decode(files.media))).toEqual({ 0: "help.webp" });
    const parsed = await parseApkg(blob, async () => SQL);
    expect(parsed.decks.length).toBe(2);
  });

  it("has a working checksum and stable guids", () => {
    expect(sha1("abc")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(sha1("")).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(guidFor("kai.1")).toBe(guidFor("kai.1"));
    expect(guidFor("kai.1")).not.toBe(guidFor("kai.2"));
  });
});
