import { describe, it, expect } from "vitest";
import { zipSync } from "fflate";
import { parseMediaList, soundOf, planAudio, extractAudio, isZstd, mimeOf } from "../src/lib/importer/media.js";

// tiny protobuf writer
const varint = (n) => { const out = []; while (n > 127) { out.push((n & 127) | 128); n = Math.floor(n / 128); } out.push(n); return out; };
const lenField = (field, bytes) => [...varint((field << 3) | 2), ...varint(bytes.length), ...bytes];
const entry = (name, size) => {
  const nameB = [...new TextEncoder().encode(name)];
  const inner = [...lenField(1, nameB), ...varint((2 << 3) | 0), ...varint(size), ...lenField(3, [1, 2, 3])];
  return lenField(1, inner);
};
const media = (list) => new Uint8Array(list.flatMap(([n, s]) => entry(n, s)));

describe("media list", () => {
  it("reads the protobuf list used by modern packages", () => {
    const l = parseMediaList(media([["私_ワタシ.mp3", 12000], ["a.webp", 5], ["JLPT_0001.mp3", 70000]]));
    expect(l).toEqual([{ name: "私_ワタシ.mp3", size: 12000 }, { name: "a.webp", size: 5 }, { name: "JLPT_0001.mp3", size: 70000 }]);
  });
  it("reads the JSON map of older packages", () => {
    const l = parseMediaList(new TextEncoder().encode('{"0":"a.mp3","2":"b.ogg"}'));
    expect(l[0].name).toBe("a.mp3");
    expect(l[1]).toBeUndefined();
    expect(l[2].name).toBe("b.ogg");
  });
  it("empty or missing is fine", () => {
    expect(parseMediaList(new Uint8Array())).toEqual([]);
    expect(parseMediaList(null)).toEqual([]);
  });
  it("finds sound references and mime types", () => {
    expect(soundOf("[sound:私_ワタシ━_0_NHK-2016.mp3]")).toBe("私_ワタシ━_0_NHK-2016.mp3");
    expect(soundOf("<b>no audio</b>")).toBe("");
    expect(mimeOf("x.OGG")).toBe("audio/ogg");
    expect(mimeOf("x.mp3")).toBe("audio/mpeg");
    expect(isZstd(new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0]))).toBe(true);
    expect(isZstd(new Uint8Array([1, 2, 3, 4, 5]))).toBe(false);
  });
});

describe("planAudio", () => {
  it("lists only the clips the chosen cards use, with their zip entry numbers", () => {
    const list = parseMediaList(media([["w1.mp3", 10], ["pic.webp", 99], ["s1.mp3", 20], ["unused.mp3", 30]]));
    const decks = [{ content: { a: { x: { wa: "w1.mp3", sa: "s1.mp3" } }, b: { x: {} }, c: { x: { wa: "missing.mp3" } } } }];
    const p = planAudio(decks, list);
    expect(p.files).toEqual([{ index: 0, name: "w1.mp3", size: 10 }, { index: 2, name: "s1.mp3", size: 20 }]);
    expect(p.bytes).toBe(30);
  });
});

describe("extractAudio", () => {
  it("pulls the wanted entries out of a zip (plain legacy files) and stores them", async () => {
    const bytes = zipSync({ "0": new Uint8Array([1, 2, 3]), "1": new Uint8Array([9, 9]), "2": new Uint8Array([4, 5, 6, 7]), media: new Uint8Array([1]) }, { level: 0 });
    const file = new Blob([bytes]);
    const got = {};
    const r = await extractAudio(file, [{ index: 0, name: "a.mp3", size: 3 }, { index: 2, name: "c.ogg", size: 4 }], async (name, data, mime) => { got[name] = { data: [...data], mime }; });
    expect(r).toEqual({ stored: 2, failed: 0 });
    expect(got["a.mp3"]).toEqual({ data: [1, 2, 3], mime: "audio/mpeg" });
    expect(got["c.ogg"]).toEqual({ data: [4, 5, 6, 7], mime: "audio/ogg" });
  });
  it("counts a clip that cannot be stored as failed and keeps going", async () => {
    const bytes = zipSync({ "0": new Uint8Array([1]), "1": new Uint8Array([2]) }, { level: 0 });
    const r = await extractAudio(new Blob([bytes]), [{ index: 0, name: "a.mp3", size: 1 }, { index: 1, name: "b.mp3", size: 1 }], async (name) => { if (name === "a.mp3") throw new Error("quota"); });
    expect(r).toEqual({ stored: 1, failed: 1 });
  });
});
