import { describe, it, expect } from "vitest";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const K = JSON.parse(read("src/splash/constants.json"));
const scope = {};
new Function(read("src/splash/renderer.js") + "\nreturn kotobaInk;")()(scope);
const { inkTime } = scope.KotobaInk;
const splash = read("src/splash/splash.js");
const num = (name) => Number(splash.match(new RegExp(`${name} = ([\\d.]+)`))[1]);

const pngSize = (p) => { const b = fs.readFileSync(new URL("../" + p, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

describe("opening animation timing", () => {
  const SLOW = num("SLOW"), KNEE = num("KNEE");
  it("runs at full speed when the ink lands, then in slow motion", () => {
    expect(inkTime(0, SLOW, KNEE)).toBe(0);
    const speed = (t) => (inkTime(t + 0.001, SLOW, KNEE) - inkTime(t, SLOW, KNEE)) / 0.001;
    expect(speed(0)).toBeCloseTo(1, 2);
    expect(speed(2)).toBeLessThan(SLOW + 0.03);
    for (let t = 0; t < 3; t += 0.05) expect(speed(t)).toBeGreaterThan(0);
  });
  it("finishes the brushwork before handing over to the app", () => {
    const last = K.STROKES[K.STROKES.length - 1];
    const handover = inkTime(num("MIN_MS") / 1000, SLOW, KNEE);
    expect(last.s + last.d).toBeLessThan(handover);
    expect(handover).toBeLessThan(K.SIM_MAX);
  });
  it("renders the icon at the moment of hand-over", () => {
    const icons = read("scripts/make-icons.mjs");
    const expr = icons.match(/const ICON_SIM = (.+);/)[1];
    const iconSim = new Function(`return ${expr}`)();
    expect(iconSim).toBeCloseTo(inkTime(num("MIN_MS") / 1000, num("SLOW"), num("KNEE")), 6);
  });
  it("brushes the strokes in order", () => {
    for (let i = 1; i < K.STROKES.length; i++) expect(K.STROKES[i].s).toBeGreaterThanOrEqual(K.STROKES[i - 1].s + K.STROKES[i - 1].d - 0.02);
  });
});

describe("ink textures", () => {
  it("match the sizes the shader expects", () => {
    expect(pngSize("public/ink/field.png")).toEqual([K.N, K.N]);
    expect(pngSize("public/ink/flood.png")).toEqual([K.FLOOD.n, K.FLOOD.n]);
  });
  it("are small enough for a first start on mobile data", () => {
    const kb = (p) => fs.statSync(new URL("../" + p, import.meta.url)).size / 1024;
    expect(kb("public/ink/field.png") + kb("public/ink/flood.png")).toBeLessThan(260);
  });
  it("are inlined by the build, not left as placeholders", () => {
    const cfg = read("vite.config.js");
    for (const ph of ["__INK_CONSTANTS__", "__INK_FIELD__", "__INK_FLOOD__"]) expect(cfg).toContain(ph);
    expect(read("index.html")).toMatch(/splash:style/);
    expect(read("index.html")).toMatch(/splash:body/);
  });
});
