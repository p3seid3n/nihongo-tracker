// Built-in kana decks. Generated in code, so every device gets identical ids and cards.
const BASIC = "あ:a い:i う:u え:e お:o か:ka き:ki く:ku け:ke こ:ko さ:sa し:shi す:su せ:se そ:so た:ta ち:chi つ:tsu て:te と:to な:na に:ni ぬ:nu ね:ne の:no は:ha ひ:hi ふ:fu へ:he ほ:ho ま:ma み:mi む:mu め:me も:mo や:ya ゆ:yu よ:yo ら:ra り:ri る:ru れ:re ろ:ro わ:wa を:o ん:n";
const DAKU = "が:ga ぎ:gi ぐ:gu げ:ge ご:go ざ:za じ:ji ず:zu ぜ:ze ぞ:zo だ:da ぢ:ji づ:zu で:de ど:do ば:ba び:bi ぶ:bu べ:be ぼ:bo ぱ:pa ぴ:pi ぷ:pu ぺ:pe ぽ:po";
const COMBO = "きゃ:kya きゅ:kyu きょ:kyo しゃ:sha しゅ:shu しょ:sho ちゃ:cha ちゅ:chu ちょ:cho にゃ:nya にゅ:nyu にょ:nyo ひゃ:hya ひゅ:hyu ひょ:hyo みゃ:mya みゅ:myu みょ:myo りゃ:rya りゅ:ryu りょ:ryo ぎゃ:gya ぎゅ:gyu ぎょ:gyo じゃ:ja じゅ:ju じょ:jo びゃ:bya びゅ:byu びょ:byo ぴゃ:pya ぴゅ:pyu ぴょ:pyo";

const toKata = (s) =>
  [...s].map((ch) => {
    const c = ch.codePointAt(0);
    return c >= 0x3041 && c <= 0x3096 ? String.fromCodePoint(c + 0x60) : ch;
  }).join("");

function parse(str) {
  return str.split(" ").map((p) => {
    const [k, r] = p.split(":");
    return [k, r];
  });
}

export function kanaCards(script) {
  const out = {};
  let o = 0;
  const groups = [
    ["basic", BASIC],
    ["dakuten", DAKU],
    ["combo", COMBO],
  ];
  const prefix = script === "hira" ? "kana-hira" : "kana-kata";
  for (const [g, str] of groups) {
    for (const [k, r] of parse(str)) {
      const front = script === "hira" ? k : toKata(k);
      const id = `${prefix}.${o}`;
      out[id] = { f: front, r: r, m: r, x: { g }, o: o++ };
    }
  }
  return out;
}

export const KANA_DECKS = [
  { id: "kana-hira", name: "Hiragana", kind: "kana", builtin: true },
  { id: "kana-kata", name: "Katakana", kind: "kana", builtin: true },
];

export function kanaContent(deckId) {
  return kanaCards(deckId === "kana-hira" ? "hira" : "kata");
}
