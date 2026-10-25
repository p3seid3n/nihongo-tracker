// Liquid glass: surfaces that bend the light coming through them, like Apple's.
//
// Each glass element is treated as a slab of glass (refractive index 1.5) with a rounded, convex rim. For every
// pixel near the rim we work out the slope of the surface, refract a ray through it with Snell's law and record how
// far, and in which direction, the light is shifted. That field is drawn into a small image (red = x shift,
// green = y shift) and handed to an SVG filter: feDisplacementMap moves the pixels behind the element by that much.
// Red, green and blue are moved by slightly different amounts (glass bends blue light more), which gives the faint
// rainbow fringe on the rim. A second image holds the specular highlight: light from the top left catching the rim.
//
// The filter is applied through `backdrop-filter: url(#…)`, which only Chromium browsers (Chrome, Brave, Edge,
// Samsung Internet) can do. Elsewhere the glass falls back to frosted blur (see glass.css).

const SVGNS = "http://www.w3.org/2000/svg";
const N_GLASS = 1.5;

/** Is real refraction available? (Chromium with SVG filters in backdrop-filter.) */
export function supportsRefraction() {
  if (typeof window === "undefined" || typeof CSS === "undefined") return false;
  const brands = navigator.userAgentData?.brands?.map((b) => b.brand) || [];
  const chromium = brands.some((b) => /Chromium/.test(b)) || /Chrome\/\d+/.test(navigator.userAgent);
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return chromium && !iOS && CSS.supports("backdrop-filter", "url(#x)");
}

/** Height of the rim at x (0 = outer edge, 1 = where the flat top begins): a convex squircle. */
const height = (x) => Math.pow(1 - Math.pow(1 - x, 4), 0.25);

/**
 * How far light is shifted at each point across the rim, for `samples` steps, normalised so the largest shift is 1.
 * thickness/bezel sets how steep the rim is.
 */
export function refractionProfile(samples = 128, steepness = 1) {
  const out = new Float32Array(samples);
  let max = 0;
  for (let i = 0; i < samples; i++) {
    const x = (i + 0.5) / samples;
    const dx = 1e-3;
    const slope = (steepness * (height(Math.min(1, x + dx)) - height(Math.max(0, x - dx)))) / (2 * dx);
    const theta = Math.atan(slope); // the surface normal tilts by this much
    const thetaT = Math.asin(Math.sin(theta) / N_GLASS); // Snell: the ray inside the glass
    const shift = Math.tan(theta - thetaT) * (0.35 + 0.65 * height(x)); // how far it travels sideways through the slab
    out[i] = shift;
    if (shift > max) max = shift;
  }
  if (max > 0) for (let i = 0; i < samples; i++) out[i] /= max;
  return out;
}
const PROFILE = refractionProfile();

/** Signed distance to a rounded rectangle centred at 0 (negative inside) and the outward normal there.
 *  r is one radius, or [top-left, top-right, bottom-right, bottom-left] like CSS. */
function sdf(px, py, hw, hh, radii) {
  const r = typeof radii === "number" ? radii : radii[py < 0 ? (px < 0 ? 0 : 1) : (px < 0 ? 3 : 2)];
  const qx = Math.abs(px) - hw + r, qy = Math.abs(py) - hh + r;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const outside = Math.hypot(ox, oy);
  const d = outside + Math.min(Math.max(qx, qy), 0) - r;
  let nx, ny;
  if (qx > 0 && qy > 0) { nx = ox / outside; ny = oy / outside; }
  else if (qx > qy) { nx = 1; ny = 0; } else { nx = 0; ny = 1; }
  return { d, nx: nx * Math.sign(px || 1), ny: ny * Math.sign(py || 1) };
}

/**
 * The two images for an element of w×h CSS pixels with corner radius r.
 * Returns { map, spec } as data URLs (map: displacement, 128 = no shift), or null without a canvas.
 */
export function buildMaps(w, h, radii, { bezel = 22, light = [-0.55, -0.83], scale = 1 } = {}) {
  if (typeof document === "undefined") return null;
  // the map is smooth, so it can be drawn at a lower resolution and stretched
  const k = Math.min(1, 420 / Math.max(w, h)) * scale;
  const W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k));
  const list = (typeof radii === "number" ? [radii, radii, radii, radii] : radii).map((r) => Math.min(r, w / 2, h / 2) * k);
  const R = list;
  const B = Math.max(2, Math.min(bezel * k, Math.min(W, H) / 2));
  const mc = document.createElement("canvas"); mc.width = W; mc.height = H;
  const sc = document.createElement("canvas"); sc.width = W; sc.height = H;
  const m = mc.getContext("2d"), s = sc.getContext("2d");
  if (!m || !s) return null;
  const mi = m.createImageData(W, H), si = s.createImageData(W, H);
  const md = mi.data, sd = si.data;
  const hw = W / 2, hh = H / 2;
  const [lx, ly] = light;
  const P = PROFILE.length;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const { d, nx, ny } = sdf(x + 0.5 - hw, y + 0.5 - hh, hw, hh, R);
      const inset = -d; // distance in from the edge
      let dx = 0, dy = 0, spec = 0;
      if (inset >= 0 && inset < B) {
        const t = inset / B;
        const mag = PROFILE[Math.min(P - 1, Math.floor(t * P))];
        // light is pulled in from towards the centre: the rim magnifies and bends what is behind it
        dx = -nx * mag; dy = -ny * mag;
        // the rim catches the light where it faces it, and a softer echo on the opposite side
        const facing = -(nx * lx + ny * ly);
        const rim = Math.pow(1 - t, 3);
        spec = rim * (Math.max(0, facing) ** 2 * 0.95 + Math.max(0, -facing) ** 3 * 0.35);
        if (t < 0.12) spec = Math.max(spec, (1 - t / 0.12) * 0.18); // a thin bright edge all round
      }
      md[o] = 128 + Math.round(dx * 127); md[o + 1] = 128 + Math.round(dy * 127); md[o + 2] = 128; md[o + 3] = 255;
      sd[o] = 255; sd[o + 1] = 255; sd[o + 2] = 255; sd[o + 3] = Math.round(Math.min(1, spec) * 255);
    }
  }
  m.putImageData(mi, 0, 0); s.putImageData(si, 0, 0);
  return { map: mc.toDataURL("image/png"), spec: sc.toDataURL("image/png"), W, H };
}

// ---------------------------------------------------------------------------
// the engine: watches the page for glass elements and keeps a filter per element in step with its size

let svg = null;
let running = false;
let seq = 0;
const items = new Map(); // element -> { id, filter, w, h, r, opts, timer }
let ro = null, mo = null;
let rules = []; // [{ sel, opts }]

function ensureSvg() {
  if (svg) return svg;
  svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;left:-9px;top:-9px";
  svg.appendChild(document.createElementNS(SVGNS, "defs"));
  document.body.appendChild(svg);
  return svg;
}

const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (parent) parent.appendChild(n);
  return n;
};

/** One filter: displacement per colour channel (dispersion), recombined, with a touch of blur and saturation. */
function makeFilter(id, opts) {
  const f = el("filter", { id, x: 0, y: 0, width: 1, height: 1, filterUnits: "objectBoundingBox", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" });
  el("feImage", { result: "map", x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: "none" }, f);
  const src = opts.frost ? (el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: opts.frost, result: "src" }, f), "src") : "SourceGraphic";
  const chans = [["r", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", 1], ["g", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", 1 + opts.dispersion], ["b", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", 1 + opts.dispersion * 2]];
  for (const [c, matrix, k] of chans) {
    el("feDisplacementMap", { in: src, in2: "map", scale: opts.strength * 2 * k, xChannelSelector: "R", yChannelSelector: "G", result: `d${c}` }, f);
    el("feColorMatrix", { in: `d${c}`, type: "matrix", values: matrix, result: `c${c}` }, f);
  }
  el("feComposite", { in: "cr", in2: "cg", operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0, result: "rg" }, f);
  el("feComposite", { in: "rg", in2: "cb", operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0, result: "rgb" }, f);
  el("feColorMatrix", { in: "rgb", type: "saturate", values: opts.saturate }, f);
  return f;
}

function radiusOf(node, w, h) {
  const cs = getComputedStyle(node);
  return [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v) => Math.min(parseFloat(v) || 0, w / 2, h / 2));
}

function update(node) {
  const it = items.get(node);
  if (!it) return;
  const w = Math.round(node.offsetWidth), h = Math.round(node.offsetHeight);
  if (w < 4 || h < 4) return;
  const r = radiusOf(node, w, h);
  const img = it.filter.querySelector("feImage");
  img.setAttribute("width", w); img.setAttribute("height", h);
  const rKey = r.map(Math.round).join(",");
  if (Math.abs(w - it.w) < 2 && Math.abs(h - it.h) < 2 && rKey === it.r && it.drawn) return;
  // while something is still resizing (a sheet being dragged), stretch the old map and redraw once it settles
  clearTimeout(it.timer);
  const draw = () => {
    const maps = buildMaps(w, h, r, it.opts);
    if (!maps || !items.has(node)) return;
    img.setAttribute("href", maps.map);
    node.style.setProperty("--lg-spec", `url("${maps.spec}")`);
    it.w = w; it.h = h; it.r = rKey; it.drawn = true;
  };
  if (!it.drawn) draw(); else it.timer = setTimeout(draw, 140);
}

function attach(node, opts) {
  if (items.has(node)) return;
  const id = `lg-${++seq}`;
  const o = { bezel: 22, strength: 14, dispersion: 0.06, frost: 0, saturate: 1.6, ...opts };
  const filter = makeFilter(id, o);
  ensureSvg().firstChild.appendChild(filter);
  items.set(node, { id, filter, w: 0, h: 0, r: "", opts: o, drawn: false, timer: 0 });
  // CSS filters can run before the refraction (pre: a frost, so text on big sheets stays readable) and after it
  const value = `${o.pre || ""} url(#${id}) ${o.post || "brightness(1.04)"}`.trim();
  node.style.setProperty("backdrop-filter", value);
  node.style.setProperty("-webkit-backdrop-filter", value);
  node.classList.add("lg");
  ro.observe(node);
  update(node);
}

function detach(node) {
  const it = items.get(node);
  if (!it) return;
  clearTimeout(it.timer);
  it.filter.remove();
  items.delete(node);
  ro?.unobserve(node);
  node.style.removeProperty("backdrop-filter");
  node.style.removeProperty("-webkit-backdrop-filter");
  node.style.removeProperty("--lg-spec");
  node.classList.remove("lg");
}

function scan(root) {
  if (!(root instanceof Element)) return;
  for (const { sel, opts } of rules) {
    if (root.matches(sel)) attach(root, opts);
    root.querySelectorAll(sel).forEach((n) => attach(n, opts));
  }
}

/** Start refracting every element matching the rules ([{ sel, opts }]). Returns false when unsupported. */
export function startLiquidGlass(r) {
  if (!supportsRefraction()) return false;
  rules = r;
  if (running) { scan(document.body); return true; }
  running = true;
  ro = new ResizeObserver((entries) => { for (const e of entries) update(e.target); });
  mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => scan(n));
      m.removedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        for (const node of [...items.keys()]) if (n === node || n.contains(node)) detach(node);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  scan(document.body);
  return true;
}

export function stopLiquidGlass() {
  if (!running) return;
  running = false;
  mo?.disconnect(); ro?.disconnect(); mo = ro = null;
  for (const node of [...items.keys()]) detach(node);
  svg?.remove(); svg = null;
}

/** For tests: how many elements are refracting right now. */
export const liquidCount = () => items.size;
