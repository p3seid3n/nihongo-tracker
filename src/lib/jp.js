// Japanese text helpers: furigana markup, kanji sets, and a conjugation engine.
//
// Markup: kanji followed by its reading in brackets, e.g. 食[た]べる, 学生[がくせい].
// Sentences are written as tokens separated by "|": 私[わたし]|は|学生[がくせい]|です

export const KANJI_RE = /[一-鿿㐀-䶿々〆]/;
export const hasKanji = (s) => KANJI_RE.test(s);
export const kanjiOf = (s) => [...s].filter((c) => KANJI_RE.test(c));

/** "食[た]べる" -> [{t:"食", r:"た"}, {t:"べる"}] */
export function parseFuri(markup) {
  const segs = [];
  let i = 0;
  const s = String(markup);
  let plain = "";
  const flush = () => { if (plain) { segs.push({ t: plain }); plain = ""; } };
  while (i < s.length) {
    const ch = s[i];
    if (ch === "[") {
      const j = s.indexOf("]", i);
      if (j < 0) { plain += s.slice(i); break; }
      const reading = s.slice(i + 1, j);
      // attach to the kanji run immediately before the bracket
      let k = plain.length;
      while (k > 0 && KANJI_RE.test(plain[k - 1])) k--;
      const base = plain.slice(k);
      const before = plain.slice(0, k);
      plain = before;
      flush();
      if (base) segs.push({ t: base, r: reading }); else segs.push({ t: "", r: reading });
      i = j + 1;
    } else { plain += ch; i++; }
  }
  flush();
  return segs.filter((x) => x.t || x.r);
}

/** Plain surface text of markup. */
export const plainOf = (markup) => String(markup).replace(/\[[^\]]*\]/g, "");
/** Pure kana reading of markup. */
export function readingOf(markup) {
  return parseFuri(markup).map((s) => (s.r != null ? s.r : s.t)).join("");
}

export function parseSentence(markup) {
  const raw = String(markup).split("|");
  if (raw[0] && raw[0].startsWith("=")) raw[0] = raw[0].slice(1);
  return raw.map((t) => {
    let blank = false;
    if (t.endsWith("*")) { blank = true; t = t.slice(0, -1); }
    return { m: t, text: plainOf(t), blank };
  });
}
export const sentenceText = (markup) => parseSentence(markup).map((t) => t.text).join("");

// ---------------------------------------------------------------------------
// Conjugation. A word is { w, k, ok, cls } where
//   w  = kanji part ("食")        k = its reading ("た")      ok = the kana tail ("べる")
//   cls: ru | u | suru | kuru | iku | aru | iadj | ii | nadj | noun
// For nouns / na-adjectives w+ok is the whole word (ok normally "").

const U_ROWS = {
  う: ["わ", "い", "え", "お", "っ"], く: ["か", "き", "け", "こ", "い"], ぐ: ["が", "ぎ", "げ", "ご", "い"],
  す: ["さ", "し", "せ", "そ", "し"], つ: ["た", "ち", "て", "と", "っ"], ぬ: ["な", "に", "ね", "の", "ん"],
  ぶ: ["ば", "び", "べ", "ぼ", "ん"], む: ["ま", "み", "め", "も", "ん"], る: ["ら", "り", "れ", "ろ", "っ"],
};
// index: 0 a-row, 1 i-row, 2 e-row, 3 o-row, 4 euphonic base for te/ta
const TE = { う: "って", つ: "って", る: "って", く: "いて", ぐ: "いで", す: "して", ぬ: "んで", ぶ: "んで", む: "んで" };
const TA = { う: "った", つ: "った", る: "った", く: "いた", ぐ: "いだ", す: "した", ぬ: "んだ", ぶ: "んだ", む: "んだ" };

export const FORMS = {
  dict: "dictionary form",
  stem: "ます-stem",
  polite: "polite (〜ます)",
  "polite-neg": "polite negative (〜ません)",
  "polite-past": "polite past (〜ました)",
  "polite-past-neg": "polite past negative (〜ませんでした)",
  neg: "negative (〜ない)",
  past: "past (〜た)",
  "past-neg": "past negative (〜なかった)",
  te: "te-form (〜て)",
  ba: "ば-conditional",
  tara: "たら-conditional",
  potential: "potential (can do)",
  volitional: "volitional (let's)",
  imperative: "command",
  tai: "want to (〜たい)",
  passive: "passive",
  causative: "causative",
  adv: "adverb (〜く)",
  mod: "before a noun",
  teiru: "〜ている form",
  teinai: "〜ていない form",
  teita: "〜ていた form",
  naide: "〜ないで form",
};

/** Returns segments [{t,r?}] for the conjugated word, or null if the form does not apply. */
export function conjugate(word, form) {
  if (form === "teiru" || form === "teinai" || form === "teita") {
    const te = conjugate(word, "te");
    if (!te) return null;
    return [...te, { t: { teiru: "いる", teinai: "いない", teita: "いた" }[form] }];
  }
  if (form === "naide") {
    const ng = conjugate(word, "neg");
    if (!ng) return null;
    return [...ng, { t: "で" }];
  }
  const { w = "", k = "", ok = "", cls } = word;
  const head = (tail) => {
    const segs = [];
    if (word.pre) segs.push({ t: word.pre });
    if (w) segs.push({ t: w, r: k });
    if (tail) segs.push({ t: tail });
    return segs;
  };
  const last = ok.slice(-1);
  const base = ok.slice(0, -1);

  if (cls === "kuru") {
    const kanji = w || "来";
    const mk = (r, tail) => [{ t: kanji, r }, { t: tail }].filter((x) => x.t);
    const table = {
      dict: mk("く", "る"), stem: mk("き", ""), polite: mk("き", "ます"), "polite-neg": mk("き", "ません"),
      "polite-past": mk("き", "ました"), "polite-past-neg": mk("き", "ませんでした"),
      neg: mk("こ", "ない"), past: mk("き", "た"), "past-neg": mk("こ", "なかった"), te: mk("き", "て"),
      ba: mk("く", "れば"), tara: mk("き", "たら"), potential: mk("こ", "られる"), volitional: mk("こ", "よう"),
      imperative: mk("こ", "い"), tai: mk("き", "たい"), passive: mk("こ", "られる"), causative: mk("こ", "させる"),
    };
    return table[form] || null;
  }
  if (cls === "suru") {
    const t = {
      dict: "する", stem: "し", polite: "します", "polite-neg": "しません", "polite-past": "しました",
      "polite-past-neg": "しませんでした", neg: "しない", past: "した", "past-neg": "しなかった", te: "して",
      ba: "すれば", tara: "したら", potential: "できる", volitional: "しよう", imperative: "しろ", tai: "したい",
      passive: "される", causative: "させる",
    }[form];
    return t == null ? null : head(t);
  }
  if (cls === "ru") {
    const t = {
      dict: ok, stem: base, polite: base + "ます", "polite-neg": base + "ません", "polite-past": base + "ました",
      "polite-past-neg": base + "ませんでした", neg: base + "ない", past: base + "た", "past-neg": base + "なかった",
      te: base + "て", ba: base + "れば", tara: base + "たら", potential: base + "られる", volitional: base + "よう",
      imperative: base + "ろ", tai: base + "たい", passive: base + "られる", causative: base + "させる",
    }[form];
    return t == null ? null : head(t);
  }
  if (cls === "u" || cls === "iku" || cls === "aru") {
    const row = U_ROWS[last];
    if (!row) return null;
    let te = base + TE[last], ta = base + TA[last];
    if (cls === "iku") { te = base + "って"; ta = base + "った"; }
    let neg = base + row[0] + "ない";
    if (cls === "aru") neg = "ない"; // ある -> ない (irregular)
    const a = base + row[0];
    const t = {
      dict: ok, stem: base + row[1], polite: base + row[1] + "ます", "polite-neg": base + row[1] + "ません",
      "polite-past": base + row[1] + "ました", "polite-past-neg": base + row[1] + "ませんでした",
      neg, past: ta, "past-neg": cls === "aru" ? "なかった" : base + row[0] + "なかった", te,
      ba: base + row[2] + "ば", tara: ta + "ら", potential: base + row[2] + "る",
      volitional: base + row[3] + "う", imperative: base + row[2], tai: base + row[1] + "たい",
      passive: a + "れる", causative: a + "せる",
    }[form];
    if (t == null) return null;
    return head(t);
  }
  if (cls === "iadj" || cls === "ii") {
    // ii (いい) is irregular: conjugates like よい
    const stemK = cls === "ii" ? "よ" : base; // base = ok minus final い
    const t = {
      dict: ok, mod: ok, neg: stemK + "くない", past: stemK + "かった", "past-neg": stemK + "くなかった",
      te: stemK + "くて", adv: stemK + "く", ba: stemK + "ければ", tara: stemK + "かったら",
      polite: ok + "です", "polite-neg": stemK + "くないです", "polite-past": stemK + "かったです",
      "polite-past-neg": stemK + "くなかったです",
    }[form];
    if (t == null) return null;
    if (cls === "ii" && form !== "dict" && form !== "mod" && form !== "polite") {
      // いい -> 良[よ]い written with kanji only in some forms; keep kana for safety
      return [{ t }];
    }
    return head(t);
  }
  if (cls === "nadj" || cls === "noun") {
    const t = {
      dict: ok + "だ", polite: ok + "です", neg: ok + "じゃない", past: ok + "だった", "past-neg": ok + "じゃなかった",
      te: ok + "で", "polite-neg": ok + "じゃありません", "polite-past": ok + "でした",
      "polite-past-neg": ok + "じゃありませんでした", mod: ok + (cls === "nadj" ? "な" : "の"), adv: ok + "に",
      ba: ok + "なら", tara: ok + "だったら",
    }[form];
    if (t == null) return null;
    return head(t);
  }
  return null;
}

export function segsToMarkup(segs) {
  return segs.map((s) => (s.r != null && s.t ? `${s.t}[${s.r}]` : s.t)).join("");
}
export const conjMarkup = (word, form) => {
  const segs = conjugate(word, form);
  return segs ? segsToMarkup(segs) : null;
};
export const conjText = (word, form) => {
  const m = conjMarkup(word, form);
  return m == null ? null : plainOf(m);
};

const END_PUNCT = ["？", "！", "。", "?", "!"];
/** Splits trailing sentence punctuation off a token list. */
export function endPunct(tokens) {
  const t = tokens.slice();
  if (t[0] && t[0].startsWith("=")) { t[0] = t[0].slice(1); return { tokens: t, end: "" }; } // "=" marks a phrase (no 。)
  let end = null;
  while (t.length && END_PUNCT.includes(t[t.length - 1])) end = t.pop();
  return { tokens: t, end };
}
/** Default ending: ？ after a か question, otherwise 。 */
export function defaultEnd(tokens) {
  const last = tokens[tokens.length - 1] || "";
  return plainOf(last).endsWith("か") && /(か|ですか|ますか|たか|ませんか)$/.test(plainOf(last)) ? "？" : "。";
}
