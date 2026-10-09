import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { pathPoints, pathLength, resample, matchStroke, checkStroke } from "../src/lib/strokes.js";

const chars = [...fs.readFileSync("public/strokes/index.txt", "utf8")];
const strokesOf = (c) => JSON.parse(fs.readFileSync(`public/strokes/${Math.floor(chars.indexOf(c) / 96)}.json`, "utf8"))[c];
const models = (c) => strokesOf(c).map((d) => pathPoints(d));

// deterministic noise
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
/** A hand-drawn version of a stroke: fewer/more points, wobble, optional offset and scale. */
const draw = (pts, { noise = 1.6, dx = 0, dy = 0, scale = 1, n, reverse = false } = {}) => {
  const len = pathLength(pts);
  n = n || Math.min(18, Math.max(2, Math.round(len / 3)));
  noise = Math.min(noise, len * 0.1);
  let r = resample(pts, n);
  if (reverse) r = [...r].reverse();
  const c = [54.5, 54.5];
  return r.map((p) => [c[0] + (p[0] - c[0]) * scale + dx + (rnd() - 0.5) * 2 * noise, c[1] + (p[1] - c[1]) * scale + dy + (rnd() - 0.5) * 2 * noise]);
};

describe("path parsing", () => {
  it("flattens relative and absolute commands", () => {
    const p = pathPoints("M10,10 l10,0 v10 H0 z");
    expect(p[0]).toEqual([10, 10]);
    expect(p[1]).toEqual([20, 10]);
    expect(p[2]).toEqual([20, 20]);
    expect(p[3]).toEqual([0, 20]);
    expect(p[4]).toEqual([10, 10]);
  });
  it("samples cubic curves with the right length", () => {
    const p = pathPoints("M0,0 C0,10 10,10 10,0");
    expect(p.length).toBeGreaterThan(10);
    expect(pathLength(p)).toBeGreaterThan(14);
    expect(p[p.length - 1][0]).toBeCloseTo(10);
  });
  it("handles implicit repeats and smooth curves (KanjiVG style)", () => {
    const p = pathPoints("M31.75,24.75c0.74,1.5,1.49,2.25,1.49,4.25s-0.25,58,0,60");
    expect(p[0]).toEqual([31.75, 24.75]);
    expect(p[p.length - 1][0]).toBeCloseTo(33.24, 1);
    expect(p[p.length - 1][1]).toBeCloseTo(24.75 + 4.25 + 60, 1);
  });
  it("resample gives n evenly spaced points", () => {
    const r = resample([[0, 0], [100, 0]], 11);
    expect(r).toHaveLength(11);
    expect(r[5][0]).toBeCloseTo(50);
  });
});

describe("stroke matching on real kanji", () => {
  const sample = ["日", "言", "学", "語", "書", "水", "あ", "ン", "犬", "木", "習", "鬱"];
  it("every stroke of every sample char matches a wobbly copy of itself", () => {
    const bad = [];
    for (const c of sample) {
      const M = models(c);
      M.forEach((m, k) => {
        for (let trial = 0; trial < 6; trial++) {
          if (!checkStroke(draw(m), M, k).ok) bad.push(`${c}#${k + 1}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });
  it("rejects strokes drawn backwards", () => {
    let rejected = 0, total = 0;
    for (const c of ["日", "言", "学", "木", "水"]) {
      const M = models(c);
      M.forEach((m, k) => {
        if (pathLength(m) < 25) return; // dots can't be told apart by direction
        total++;
        if (!matchStroke(draw(m, { reverse: true }), m).ok) rejected++;
      });
    }
    expect(rejected / total).toBeGreaterThan(0.95);
  });
  it("reports when a later stroke is drawn first", () => {
    const M = models("日"); // 4 strokes: left, top+right, middle bar, bottom bar
    const r = checkStroke(draw(M[3]), M, 0);
    expect(r.ok).toBe(false);
    expect(r.order).toBe(3);
  });
  it("catches the bottom bar of 三 drawn first even though the shapes are alike", () => {
    const M = models("三");
    const r = checkStroke(draw(M[2]), M, 0);
    expect(r).toEqual({ ok: false, order: 2 });
    expect(checkStroke(draw(M[0]), M, 0).ok).toBe(true);
  });
  it("rejects a stroke drawn in the wrong place", () => {
    const M = models("日");
    expect(checkStroke(draw(M[2], { dy: -30 }), M, 2).ok).toBe(false);
  });
  it("rejects scribbles and tiny flicks", () => {
    const M = models("言");
    expect(checkStroke([[10, 10], [11, 11]], M, 1).ok).toBe(false);
    expect(checkStroke([[10, 90], [100, 20], [10, 20], [100, 90]], M, 1).ok).toBe(false);
  });
  it("tolerates a character drawn a bit smaller and shifted (memory mode)", () => {
    const bad = [];
    for (const c of ["日", "言", "学", "語"]) {
      const M = models(c);
      M.forEach((m, k) => { if (!checkStroke(draw(m, { scale: 0.85, dx: 4, dy: 3 }), M, k).ok) bad.push(`${c}#${k + 1}`); });
    }
    expect(bad).toEqual([]);
  });
  it("accepts a dot as a tap", () => {
    const M = models("言");
    const dot = M[0];
    const mid = dot[Math.floor(dot.length / 2)];
    expect(checkStroke([[mid[0] + 1, mid[1] - 1]], M, 0).ok).toBe(true);
  });
});
