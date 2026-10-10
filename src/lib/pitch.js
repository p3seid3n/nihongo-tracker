// Pitch accent. Kaishi stores it as HTML (an overline over the high morae, a bar after the
// last high mora when the pitch drops). We keep only "reading/accent" per variant, where the
// accent number is the position of the last high mora before the drop (0 = no drop).

const SMALL = /[ゃゅょぁぃぅぇぉャュョァィゥェォヮゎ]/;

/** Split kana into morae: a small ゃ/ゅ/ょ joins the kana before it; ッ, ン and ー count as one each. */
export function morae(kana) {
  const out = [];
  for (const ch of [...String(kana || "")]) {
    if (SMALL.test(ch) && out.length) out[out.length - 1] += ch; else out.push(ch);
  }
  return out;
}

// Kaishi marks the nasal g (鼻濁音) as カ + a red ° (and キ, ク, ケ, コ alike): read it as ガ行.
const NASAL = { カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ" };

/**
 * Parse the Kaishi "Pitch Accent" field into [{ k: "ワタシ", a: 0 }].
 * The markup is nested spans: text inside an inline-block span has the overline (high); a span with a right border inside
 * it marks the step down after its last mora. Several readings are separated by "・".
 */
export function parsePitch(html) {
  const src = String(html || "");
  if (!src.trim()) return [];
  const tokens = src.match(/<[^>]*>|[^<]+/g) || [];
  const variants = [];
  let cur = { parts: [] };
  const push = () => { if (cur.parts.length) variants.push(cur); cur = { parts: [] }; };
  const stack = []; // open spans: { wrap, drop, start }
  const addText = (txt) => {
    const pieces = String(txt).replace(/&nbsp;/g, " ").split("・");
    const hi = stack.some((e) => e.wrap);
    pieces.forEach((piece, i) => {
      if (i > 0) push();
      let kana = "";
      for (const ch of piece) {
        if (ch === "°" || ch === "゜") {
          // the mark sits in its own span after the kana it belongs to
          if (kana) { const last = kana.slice(-1); if (NASAL[last]) kana = kana.slice(0, -1) + NASAL[last]; }
          else if (cur.parts.length) { const p = cur.parts[cur.parts.length - 1]; const last = p.kana.slice(-1); if (NASAL[last]) p.kana = p.kana.slice(0, -1) + NASAL[last]; }
          continue;
        }
        if (/[぀-ヿー]/.test(ch)) kana += ch;
      }
      if (kana) cur.parts.push({ kana, hi });
    });
  };
  for (const t of tokens) {
    if (t[0] !== "<") { addText(t); continue; }
    if (/^<\s*span\b/i.test(t)) {
      const e = { wrap: /display:\s*inline-block/i.test(t), drop: false, start: cur.parts.length, variant: variants.length };
      if (/border-right-width/i.test(t)) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].wrap) { stack[i].drop = true; break; } }
      if (!/\/\s*>$/.test(t)) stack.push(e);
    } else if (/^<\s*\/\s*span/i.test(t)) {
      const e = stack.pop();
      if (e && e.wrap && e.drop && cur.parts.length > e.start && e.variant === variants.length) cur.parts[cur.parts.length - 1].drop = true;
    }
  }
  push();
  const out = [];
  for (const v of variants) {
    const k = v.parts.map((p) => p.kana).join("");
    if (!k) continue;
    let pos = 0, accent = 0;
    for (const p of v.parts) {
      pos += morae(p.kana).length;
      if (p.hi && p.drop) accent = pos;
    }
    out.push({ k, a: accent });
  }
  // the same reading twice with the same accent is one variant
  return out.filter((v, i) => out.findIndex((w) => w.k === v.k && w.a === v.a) === i);
}

/** Compact string kept on the card: "ワタシ/0|ヒト/2". */
export const packPitch = (list) => list.map((v) => `${v.k}/${v.a}`).join("|");
export function unpackPitch(str) {
  if (!str) return [];
  return String(str).split("|").map((p) => {
    const i = p.lastIndexOf("/");
    const a = Number(p.slice(i + 1));
    return i > 0 && Number.isFinite(a) ? { k: p.slice(0, i), a } : null;
  }).filter(Boolean);
}

/** High/low for every mora: heiban L then H; atamadaka H then L; others L, H up to the drop, then L. */
export function pitchPattern(kana, accent) {
  const m = morae(kana);
  return m.map((mora, i) => {
    const n = i + 1;
    let high;
    if (accent === 0) high = n > 1;
    else if (accent === 1) high = n === 1;
    else high = n > 1 && n <= accent;
    return { mora, high, drop: accent > 0 && n === accent };
  });
}

/** Names like heiban / atamadaka / nakadaka / odaka. */
export function pitchType(kana, accent) {
  const n = morae(kana).length;
  if (accent === 0) return "heiban";
  if (accent === 1) return "atamadaka";
  if (accent === n) return "odaka";
  return "nakadaka";
}
