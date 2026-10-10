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

const WRAP = /<span[^>]*display:\s*inline-block[^>]*>([\s\S]*?)<\/span>\s*<\/span>/gi;

/** Parse the Kaishi "Pitch Accent" field into [{ k: "ワタシ", a: 0 }]. */
export function parsePitch(html) {
  const src = String(html || "");
  if (!src.trim()) return [];
  const variants = [];
  let cur = { parts: [] };
  const push = () => { if (cur.parts.length) variants.push(cur); cur = { parts: [] }; };
  const addText = (txt, hi, drop) => {
    // plain text may hold the "・" separator between variants
    const pieces = String(txt).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").split("・");
    pieces.forEach((p, i) => {
      if (i > 0) push();
      const kana = p.replace(/[^぀-ヿー]/g, "");
      if (kana) cur.parts.push({ kana, hi, drop: !!drop && i === pieces.length - 1 });
    });
  };
  let last = 0;
  src.replace(WRAP, (m, inner, offset) => {
    addText(src.slice(last, offset), false, false);
    const text = (inner.match(/<span[^>]*>([^<]*)<\/span>/i) || [])[1] || "";
    const drop = /border-right-width/i.test(m);
    addText(text, true, drop);
    last = offset + m.length;
    return m;
  });
  addText(src.slice(last), false, false);
  push();
  const out = [];
  for (const v of variants) {
    const k = v.parts.map((p) => p.kana).join("");
    if (!k) continue;
    let pos = 0, accent = 0;
    for (const p of v.parts) {
      const n = morae(p.kana).length;
      pos += n;
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
