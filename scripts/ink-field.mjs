// Simulates ink soaking into washi paper and stores the result as a small texture for the opening animation:
//   node scripts/ink-field.mjs        → public/ink/field.png
//
// The picture is 言 brushed onto paper plus a drop of vermilion ink (the sun). For every pixel the texture stores
//   R  when the brush ink reaches it (0 … SIM_MAX seconds of "ink time", 255 = never)
//   G  how much pigment arrives there (brush core ≈ 0.75–1, the bleed around it fades with distance)
//   B  when the vermilion drop reaches it
// Ink spreads through paper along its fibres, and the spread slows with the square root of time (Washburn's law):
// fast when the ink lands, then a slow crawl. That is what the shader turns into "rapid, then slow motion".
// The brush itself moves along KanjiVG's centre lines (© Ulrich Apel, CC BY-SA 3.0).
import fs from "node:fs";
import zlib from "node:zlib";
import { pathPoints } from "../src/lib/strokes.js";

// Shared with the shader (src/splash/renderer.js reads the same numbers through the Vite plugin).
// N: texture size, covering the square the icon shows. SIM_MAX: seconds of ink time stored in R and B.
// PAD, DROP_Y: where the 109-unit glyph sits in that square. SUN: the vermilion drop. STROKES: when each stroke is brushed.
const C = JSON.parse(fs.readFileSync(new URL("../src/splash/constants.json", import.meta.url), "utf8"));
const { N, SIM_MAX, PAD, DROP_Y, SUN, STROKES } = C;

// ---------- deterministic noise
let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const perm = new Uint8Array(512); { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
function noise2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y), a = perm[X] + Y, b = perm[X + 1] + Y;
  const l1 = grad(perm[a], x, y) + u * (grad(perm[b], x - 1, y) - grad(perm[a], x, y));
  const l2 = grad(perm[a + 1], x, y - 1) + u * (grad(perm[b + 1], x - 1, y - 1) - grad(perm[a + 1], x, y - 1));
  return l1 + v * (l2 - l1); // about -1 … 1
}
const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };

// ---------- paper: how easily ink travels through each pixel (fibres carry it further)
const speed = new Float32Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const blot = fbm(x / 70, y / 70, 4);           // sizing of the paper: blotchy absorbency
  const fine = fbm(x / 9 + 50, y / 9 + 50, 2);   // pulp grain
  speed[y * N + x] = Math.max(0.25, 0.9 + 0.55 * blot + 0.25 * fine);
}
// kozo fibres: long thin channels in every direction
for (let f = 0; f < 2600; f++) {
  let x = rand() * N, y = rand() * N, a = rand() * Math.PI * 2;
  const len = 10 + rand() * 46, boost = 1.5 + rand() * 1.6;
  for (let s = 0; s < len; s += 0.7) {
    a += (rand() - 0.5) * 0.12; x += Math.cos(a) * 0.7; y += Math.sin(a) * 0.7;
    const i = (Math.round(y) * N + Math.round(x));
    if (x >= 0 && y >= 0 && x < N && y < N) speed[i] = Math.max(speed[i], boost * (0.8 + 0.4 * rand()));
  }
}

// ---------- a min-heap keyed by arrival time
class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
  pop() { const k = this.k, v = this.v; const top = v[0], last = k.length - 1; const lk = k[last], lv = v[last]; k.pop(); v.pop(); if (last > 0) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= last) break; if (c + 1 < last && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return top; }
  get size() { return this.k.length; }
}

/**
 * Spread from seeds. Each pixel keeps the seed it was reached from, so the arrival time is
 * t(seed) + (fibre distance / v)²  — square-root spreading — and pigment fades with the distance travelled.
 */
function spread({ seedT, seedLoad, v, keepLoad, n = N, sp = speed, max = SIM_MAX * 1.05 }) {
  const N = n, speed = sp;
  const T = new Float32Array(N * N).fill(Infinity);
  const D = new Float32Array(N * N);
  const T0 = new Float32Array(N * N);
  const L0 = new Float32Array(N * N);
  const done = new Uint8Array(N * N);
  const h = new Heap();
  for (let i = 0; i < N * N; i++) if (seedT[i] < Infinity) { T[i] = seedT[i]; T0[i] = seedT[i]; L0[i] = seedLoad ? seedLoad[i] : 1; h.push(seedT[i], i); }
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (h.size) {
    const i = h.pop();
    if (done[i]) continue; done[i] = 1;
    if (T[i] > max) continue;
    const x = i % N, y = (i / N) | 0;
    for (const [dx, dy, len] of nb) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
      const j = Y * N + X; if (done[j]) continue;
      const d = D[i] + len / (0.5 * (speed[i] + speed[j]));
      const vv = v * (keepLoad ? (0.6 + 0.4 * L0[i]) : 1); // a wetter brush pushes ink further
      const t = T0[i] + (d / vv) * (d / vv);
      if (t < T[j]) { T[j] = t; D[j] = d; T0[j] = T0[i]; L0[j] = L0[i]; h.push(t, j); }
    }
  }
  return { T, D, L0 };
}

// ---------- the brush
// Each stroke is laid down as a thin wet line that follows the brush; from there the ink swells outwards through the
// paper to the brush's full width (fast) and a little beyond it (slowly, as a feathered fringe).
const glyph = JSON.parse(fs.readFileSync(new URL("../src/ink/glyph.js", import.meta.url), "utf8").replace(/^[\s\S]*?INK_GLYPH = /, "").replace(/;\s*$/, ""));
const k = (N * (1 - 2 * PAD)) / 109, ox = N * PAD, oy = N * PAD + N * DROP_Y;
const W = 7.6;                                  // brush width in glyph units
const coreL = new Float32Array(N * N);          // pigment in the brush mark itself (0 = not part of it)
const coreBits = new Uint8Array(N * N);         // which strokes' marks cover the pixel (one bit per stroke)
const strokeSeeds = [];                         // per stroke: seed times (Infinity = no seed)
function stampDisk(cx, cy, r, fn) {
  for (let yy = Math.floor(cy - r - 1); yy <= cy + r + 1; yy++) for (let xx = Math.floor(cx - r - 1); xx <= cx + r + 1; xx++) {
    if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
    const dx = xx - cx, dy = yy - cy; if (dx * dx + dy * dy > r * r) continue;
    fn(yy * N + xx, dx, dy);
  }
}
glyph.centre.forEach((d, si) => {
  const seedT = new Float32Array(N * N).fill(Infinity);
  const pts = pathPoints(d, 40).map(([x, y]) => [ox + x * k, oy + y * k]);
  const seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const { s: start, d: dur } = STROKES[si];
  const long = L > 26 * k;
  const bristleSeed = si * 17.3;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const l = seg[i - 1]; const tx = (bx - ax) / (l || 1), ty = (by - ay) / (l || 1);
    for (let q = 0; q < l; q += 0.35) {
      const u = (acc + q) / L;
      const px = ax + tx * q, py = ay + ty * q;
      // pen pressure: lands, swells, lifts
      const land = 0.72 + 0.28 * Math.min(1, u / 0.08);
      const lift = 1 - (long ? 0.5 : 0.3) * Math.pow(Math.max(0, (u - 0.7) / 0.3), 1.5);
      const r = (W * k / 2) * land * lift * (1 + 0.08 * Math.sin(u * Math.PI));
      // the brush moves fast mid-stroke and slower where it lands and lifts
      const t = start + dur * (u + (0.5 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI));
      const ink = 1 - 0.3 * u; // the brush runs drier along the stroke
      stampDisk(px, py, 1.3, (j) => { if (t < seedT[j]) seedT[j] = t; });
      stampDisk(px, py, r, (j, dx, dy) => {
        const lat = (dx * -ty + dy * tx) / r; // -1 … 1 across the brush
        // dry brush (kasure): towards the end of long strokes some bristles stop leaving ink
        const bristle = 0.5 + 0.5 * noise2(lat * 3.2 + bristleSeed, 0.5);
        const dry = long ? Math.max(0, (u - 0.62) / 0.38) * 0.8 : Math.max(0, (u - 0.8) / 0.2) * 0.35;
        const load = bristle < dry ? 0.1 : Math.min(1, (0.8 + 0.2 * bristle) * ink * (1 - 0.1 * Math.abs(lat)) + 0.06);
        coreBits[j] |= 1 << si;
        if (load > coreL[j]) coreL[j] = load;
      });
    }
    acc += l;
  }
  // spatter: a few droplets flicked off the ends of the long horizontal and the 口's corner stroke
  if (long && (si === 1 || si === 5)) {
    const [ex, ey] = pts[pts.length - 1], [px2, py2] = pts[pts.length - 4];
    const dx = ex - px2, dy = ey - py2, m = Math.hypot(dx, dy) || 1;
    for (let n = 0; n < 4; n++) {
      const dist = (6 + rand() * 14) * k, a = (rand() - 0.5) * 0.9;
      const cx = ex + (dx / m * Math.cos(a) - dy / m * Math.sin(a)) * dist, cy = ey + (dy / m * Math.cos(a) + dx / m * Math.sin(a)) * dist;
      const rr = (0.5 + rand() * 1.1) * k * 0.5, t = start + dur + 0.015 + n * 0.01;
      stampDisk(cx, cy, 1, (j) => { seedT[j] = Math.min(seedT[j], t); });
      stampDisk(cx, cy, rr, (j) => { coreBits[j] |= 1 << si; if (coreL[j] < 0.9) coreL[j] = 0.9; });
    }
  }
  strokeSeeds.push(seedT);
});

// one spread per stroke, so ink never runs into a stroke before the brush has painted it
const arrive = new Float32Array(N * N).fill(Infinity);
strokeSeeds.forEach((seedT, si) => {
  const r = spread({ seedT, v: C.BLEED_V });
  for (let i = 0; i < N * N; i++) {
    if (coreBits[i] && !(coreBits[i] & (1 << si))) continue; // only another stroke's mark: that stroke decides when it is inked
    if (r.T[i] < arrive[i]) arrive[i] = r.T[i];
  }
});
// pigment outside the brush mark: falls off with the distance to the mark, carried further along fibres
const edt = new Float32Array(N * N).fill(1e9);
for (let i = 0; i < N * N; i++) if (coreL[i] > 0.3) edt[i] = 0;
for (let pass = 0; pass < 2; pass++) { // chamfer distance, forward then backward
  const ys = pass ? [N - 1, -1, -1] : [0, N, 1];
  for (let y = ys[0]; y !== ys[1]; y += ys[2]) for (let xi = 0; xi < N; xi++) {
    const x = pass ? N - 1 - xi : xi, i = y * N + x;
    for (const [dx, dy, c] of pass ? [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]] : [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]]) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
      const v = edt[Y * N + X] + c; if (v < edt[i]) edt[i] = v;
    }
  }
}
const Lp = C.PIGMENT_FADE * k;
const load = new Float32Array(N * N);
for (let i = 0; i < N * N; i++) {
  if (coreL[i] > 0) { load[i] = coreL[i]; continue; }
  // a quick fall-off: crisp marks with a short fibrous fringe (fibres carry pigment a little further)
  const fibre = Math.min(1.6, Math.max(0.3, (speed[i] - 0.4) / 1.1));
  load[i] = 0.45 * Math.exp(-Math.pow(edt[i] / (Lp * (0.6 + 0.4 * fibre)), 1.7));
}
const g = { T: arrive };
// sun: one big drop of vermilion; the shader keeps its final edge round, this field gives its arrival times
const sunT = new Float32Array(N * N).fill(Infinity);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - SUN.x * N, y - SUN.y * N) < SUN.seedR * N) sunT[y * N + x] = SUN.t0;
const SUN_V = ((SUN.r - SUN.seedR) * N) / Math.sqrt(SUN.grow);
const s = spread({ seedT: sunT, v: SUN_V });

// ---------- write the texture
const enc = (t) => (t === Infinity || t > SIM_MAX ? 255 : Math.min(254, Math.round((t / SIM_MAX) * 254)));
const px = Buffer.alloc(N * N * 3);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const i = y * N + x, o = i * 3;
    px[o] = enc(g.T[i]);
    px[o + 1] = Math.round(Math.max(0, Math.min(1, load[i])) * 255);
    px[o + 2] = enc(s.T[i]);
  }
}
// PNG row filters (whichever makes the row smallest), so the smooth fields compress well
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
function filterRows(px, w, h, bpp) {
  const stride = w * bpp, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    let best = null, bestSum = Infinity, bestF = 0;
    for (let f = 0; f < 5; f++) {
      const row = Buffer.alloc(stride); let sum = 0;
      for (let x = 0; x < stride; x++) {
        const v = px[y * stride + x], a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
        const r = (v - [0, a, b, (a + b) >> 1, paeth(a, b, c)][f]) & 255;
        row[x] = r; sum += r < 128 ? r : 256 - r;
      }
      if (sum < bestSum) { bestSum = sum; best = row; bestF = f; }
    }
    raw[y * (stride + 1)] = bestF; best.copy(raw, y * (stride + 1) + 1);
  }
  return raw;
}
const raw = filterRows(px, N, N, 3);
function png(w, h, data, colorType = 2) {
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k2 = 0; k2 < 8; k2++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const tb = Buffer.concat([Buffer.from(type), body]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(tb)); return Buffer.concat([len, tb, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(data, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
fs.mkdirSync(new URL("../public/ink/", import.meta.url), { recursive: true });
const out = png(N, N, raw);
fs.writeFileSync(new URL("../public/ink/field.png", import.meta.url), out);
console.log(`public/ink/field.png ${Math.round(out.length / 1024)} KB`);

// ---------- the exit: ink floods out of the strokes until it covers the page
// A coarser grid covering FLOOD.span × the picture square, centred on it. Grey = when the flood arrives (0 … 1).
const M = C.FLOOD.n, span = C.FLOOD.span;
const fspeed = new Float32Array(M * M);
for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) fspeed[y * M + x] = Math.max(0.3, 0.85 + 0.6 * fbm(x / 26 + 90, y / 26 + 90, 4) + 0.2 * fbm(x / 4, y / 4, 2));
for (let f = 0; f < 1800; f++) {
  let x = rand() * M, y = rand() * M, a = rand() * Math.PI * 2;
  const len = 5 + rand() * 22, boost = 1.6 + rand() * 1.8;
  for (let q = 0; q < len; q += 0.6) {
    a += (rand() - 0.5) * 0.15; x += Math.cos(a) * 0.6; y += Math.sin(a) * 0.6;
    if (x >= 0 && y >= 0 && x < M && y < M) { const i = Math.round(y) * M + Math.round(x); if (i >= 0 && i < M * M) fspeed[i] = Math.max(fspeed[i], boost); }
  }
}
const fseed = new Float32Array(M * M).fill(Infinity);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (load[y * N + x] < 0.5) continue;
  const X = Math.round(((x / N - 0.5) / span + 0.5) * M), Y = Math.round(((y / N - 0.5) / span + 0.5) * M);
  if (X >= 0 && Y >= 0 && X < M && Y < M) fseed[Y * M + X] = 0;
}
const fl = spread({ seedT: fseed, v: 1, n: M, sp: fspeed, max: Infinity });
let fmax = 0; for (let i = 0; i < M * M; i++) if (fl.T[i] < Infinity && fl.T[i] > fmax) fmax = fl.T[i];
const fpx = Buffer.alloc(M * M);
for (let i = 0; i < M * M; i++) fpx[i] = Math.round(Math.min(1, fl.T[i] / fmax) * 255);
const fout = png(M, M, filterRows(fpx, M, M, 1), 0);
fs.writeFileSync(new URL("../public/ink/flood.png", import.meta.url), fout);
console.log(`public/ink/flood.png ${Math.round(fout.length / 1024)} KB`);
