// Romaji -> hiragana for typed answers. Works while you type: an unfinished syllable
// ("k", "sh", "ny") stays as typed until the next letter completes it.
const T = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  sa: "さ", si: "し", shi: "し", su: "す", se: "せ", so: "そ",
  ta: "た", ti: "ち", chi: "ち", tu: "つ", tsu: "つ", te: "て", to: "と",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", hu: "ふ", fu: "ふ", he: "へ", ho: "ほ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wi: "うぃ", we: "うぇ", wo: "を",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  za: "ざ", zi: "じ", ji: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", sya: "しゃ", syu: "しゅ", syo: "しょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", zya: "じゃ", zyu: "じゅ", zyo: "じょ", jya: "じゃ", jyu: "じゅ", jyo: "じょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  tsa: "つぁ", tsi: "つぃ", tse: "つぇ", tso: "つぉ",
  she: "しぇ", che: "ちぇ", je: "じぇ", thi: "てぃ", dhi: "でぃ", twu: "とぅ", dwu: "どぅ",
  va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
  xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ", la: "ぁ", li: "ぃ", lu: "ぅ", le: "ぇ", lo: "ぉ",
  xya: "ゃ", xyu: "ゅ", xyo: "ょ", lya: "ゃ", lyu: "ゅ", lyo: "ょ", xtu: "っ", xtsu: "っ", ltu: "っ", ltsu: "っ",
};
const MAXLEN = 4;
const VOWELS = "aiueo";

/**
 * Convert romaji in `input` to hiragana. Kana, kanji and punctuation pass through.
 * With `final`, a trailing n becomes ん; while typing it stays as typed.
 * With `punct`, . , ! ? become 。 、 ！ ？ (for writing whole sentences).
 */
const PUNCT = { ".": "。", ",": "、", "!": "！", "?": "？" };
export function toKana(input, { final = false, punct = false } = {}) {
  const s = String(input ?? "");
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const lower = ch.toLowerCase();
    if (!/[a-z'\-]/i.test(ch)) { out += punct && PUNCT[ch] ? PUNCT[ch] : ch; i++; continue; }
    if (ch === "-") { out += "ー"; i++; continue; }
    if (ch === "'") { i++; continue; } // n' separator, no output of its own
    const kata = false;
    const rest = s.slice(i).toLowerCase();
    // doubled consonant -> small tsu (not for n)
    if (rest.length >= 2 && rest[0] === rest[1] && /[bcdfghjklmpqrstvwxyz]/.test(rest[0])) {
      out += kata ? "ッ" : "っ"; i++; continue;
    }
    // n: ん unless it begins na/ni/nu/ne/no/nya...
    if (rest[0] === "n") {
      const nxt = rest[1];
      if (nxt === undefined) { out += final ? "ん" : "n"; i++; continue; } // still typing
      if (nxt === "'" ) { out += kata ? "ン" : "ん"; i += 2; continue; }
      if (nxt === "n") { out += kata ? "ン" : "ん"; i += 2; continue; }
      if (!VOWELS.includes(nxt) && nxt !== "y") { out += kata ? "ン" : "ん"; i++; continue; }
    }
    let hit = null;
    for (let len = Math.min(MAXLEN, rest.length); len >= 1; len--) {
      const k = rest.slice(0, len);
      if (T[k]) { hit = [k, T[k]]; break; }
    }
    if (hit) {
      const kana = kata ? toKatakana(hit[1]) : hit[1];
      out += kana; i += hit[0].length; continue;
    }
    // unfinished or invalid: keep as typed
    out += ch; i++;
  }
  return out;
}

export function toKatakana(s) {
  return [...String(s)].map((c) => {
    const n = c.codePointAt(0);
    return n >= 0x3041 && n <= 0x3096 ? String.fromCodePoint(n + 0x60) : c;
  }).join("");
}

export function toHiragana(s) {
  return [...String(s)].map((c) => {
    const n = c.codePointAt(0);
    return n >= 0x30a1 && n <= 0x30f6 ? String.fromCodePoint(n - 0x60) : c;
  }).join("");
}
