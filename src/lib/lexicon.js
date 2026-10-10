// A small lexicon built from your own decks and the grammar lessons. It splits Japanese sentences
// into words and tells which words and grammar points you have already learned, so exercises can
// stay inside what you know and put a short translation above anything that is new.
import { conjugate, plainOf, parseFuri, segsToMarkup, KANJI_RE, FORMS } from "./jp.js";
import { NEW } from "./fsrs.js";
import { ALL as BANK } from "../content/bank.js";
import { LESSONS, LESSON_BY_ID } from "../content/lessons.js";

// ---------------------------------------------------------------------------
// Grammar words: [surface, short translation, lesson that teaches it, kind]
const P = "particle", A = "aux", C = "conj";
export const GRAMMAR = [
  ["は", "topic marker", "u1-wa", P], ["が", "subject marker", "u1-ga", P], ["も", "also", "u1-wa", P],
  ["を", "object marker", "u1-wo", P], ["に", "to / at / in", "u1-ni-de", P], ["へ", "toward", "u1-ni-de", P],
  ["で", "at / by / with", "u1-ni-de", P], ["と", "and / with", "u1-noun-particles", P], ["や", "and (among others)", "u1-noun-particles", P],
  ["の", "of / 's", "u1-noun-particles", P], ["か", "question marker", "u2-question", P], ["ね", "right?", "u1-adverbs", P],
  ["よ", "you know", "u1-adverbs", P], ["から", "from / because", "u2-kara", P], ["まで", "until / up to", "u1-ni-de", P],
  ["より", "than", "u3-compare", P], ["だけ", "only", "u3-amount", P], ["しか", "nothing but", "u3-amount", P],
  ["ばかり", "only / just", "u3-amount", P], ["など", "and so on", "u1-noun-particles", P], ["ほど", "about as much as", "u3-amount", P],
  ["ぐらい", "about", "u3-amount", P], ["くらい", "about", "u3-amount", P], ["ごろ", "around (time)", "u2-numbers", P],
  ["では", "topic (as for)", "u1-wa", P], ["には", "to / in (topic)", "u1-ni-de", P], ["とは", "as for", "u1-wa", P],
  ["にも", "also to / in", "u1-ni-de", P], ["でも", "even / but", "u1-wa", P], ["とも", "and also", "u1-noun-particles", P],
  ["へは", "toward (topic)", "u1-ni-de", P], ["からは", "from (topic)", "u2-kara", P], ["までに", "by (time)", "u1-ni-de", P],
  ["って", "quoting", "u2-quote", P], ["ので", "because", "u2-kara", C], ["のに", "although", "u2-kara", C],
  ["けど", "but", "u2-kara", C], ["けれど", "but", "u2-kara", C], ["けれども", "but", "u2-kara", C], ["し", "and what's more", "u2-kara", C],
  ["ながら", "while", "u3-time", C], ["たり", "doing things like", "u2-te", C], ["ば", "if", "u2-cond", C],
  ["だ", "is", "u1-desu", A], ["です", "is", "u1-desu", A], ["だった", "was", "u1-past", A], ["でした", "was", "u1-past", A],
  ["じゃない", "is not", "u1-desu", A], ["ではない", "is not", "u1-desu", A], ["じゃありません", "is not", "u2-polite", A],
  ["ではありません", "is not", "u2-polite", A], ["じゃなかった", "was not", "u1-past", A], ["ではなかった", "was not", "u1-past", A],
  ["じゃありませんでした", "was not", "u2-polite", A], ["ではありませんでした", "was not", "u2-polite", A],
  ["でしょう", "probably", "u3-certainty", A], ["だろう", "probably", "u3-certainty", A], ["でしょ", "right? (casual)", "u3-certainty", A],
  ["ください", "please", "u2-request", A], ["なさい", "do it (command)", "u2-request", A], ["かもしれない", "might be", "u3-certainty", A],
  ["かもしれません", "might be", "u3-certainty", A], ["はず", "should be", "u3-certainty", A], ["つもり", "intend to", "u2-want", A],
  ["ましょう", "let's", "u2-polite", A], ["よう", "seems like", "u3-similar", A], ["ようだ", "seems like", "u3-similar", A],
  ["そう", "looks like", "u3-similar", A], ["らしい", "apparently", "u3-similar", A], ["みたい", "seems like", "u3-similar", A],
  ["ない", "not", "u1-neg", A], ["ません", "not (polite)", "u2-polite", A], ["ました", "did (polite)", "u2-polite", A], ["ます", "(polite verb ending)", "u2-polite", A],
  ["こと", "thing / fact", "u3-koto", A], ["もの", "thing", "u1-no", A], ["ところ", "place / moment", "u3-koto", A], ["わけ", "reason", "u3-wake", A],
  ["ため", "for the sake of", "u3-wake", A], ["ほう", "side / better", "u3-compare", A], ["ん", "(explanatory の)", "u1-no", A],
  ["お", "polite prefix", "u3-keigo", A], ["ご", "polite prefix", "u3-keigo", A], ["さん", "Mr. / Ms.", "u2-people", A], ["ちゃん", "(friendly name ending)", "u2-people", A],
  ["くん", "(boy's name ending)", "u2-people", A], ["たち", "(plural people)", "u2-people", A], ["ら", "(plural)", "u2-people", A],
  ["ここ", "here", "u1-wa", A], ["そこ", "there", "u1-wa", A], ["あそこ", "over there", "u1-wa", A],
  ["これ", "this", "u1-wa", A], ["それ", "that", "u1-wa", A], ["あれ", "that over there", "u1-wa", A],
  ["この", "this", "u1-wa", A], ["その", "that", "u1-wa", A], ["あの", "that over there", "u1-wa", A],
  ["どの", "which", "u2-question", A], ["どこ", "where", "u2-question", A], ["だれ", "who", "u2-question", A], ["誰", "who", "u2-question", A],
  ["なに", "what", "u2-question", A], ["何", "what", "u2-question", A], ["いつ", "when", "u2-question", A], ["どう", "how", "u2-question", A],
  ["なぜ", "why", "u2-question", A], ["どれ", "which one", "u2-question", A], ["いくつ", "how many", "u2-numbers", A], ["いくら", "how much", "u2-numbers", A],
  ["する", "do", "u1-verbs", A], ["した", "did", "u1-past", A], ["して", "do (te-form)", "u2-te", A], ["しない", "don't do", "u1-neg", A],
  ["します", "do (polite)", "u2-polite", A], ["しました", "did (polite)", "u2-polite", A], ["しません", "don't do (polite)", "u2-polite", A],
  ["している", "is doing", "u2-teiru", A], ["しています", "is doing (polite)", "u2-teiru", A], ["しよう", "let's do", "u2-want", A],
  ["できる", "can do", "u2-potential", A], ["できます", "can do (polite)", "u2-potential", A], ["できない", "cannot do", "u2-potential", A],
  ["来る", "to come", "u1-verbs", A], ["くる", "to come", "u1-verbs", A], ["来ない", "doesn't come", "u1-neg", A], ["来ます", "comes (polite)", "u2-polite", A],
  ["来た", "came", "u1-past", A], ["来て", "come (te-form)", "u2-te", A], ["来ました", "came (polite)", "u2-polite", A],
  ["ある", "to exist (things)", "u1-verbs", A], ["あります", "exists (polite)", "u2-polite", A], ["ありません", "doesn't exist (polite)", "u2-polite", A],
  ["あった", "existed", "u1-past", A], ["ありました", "existed (polite)", "u2-polite", A],
  ["いる", "to exist (people)", "u1-verbs", A], ["います", "exists (polite)", "u2-polite", A], ["いません", "doesn't exist (polite)", "u2-polite", A],
  ["いた", "existed", "u1-past", A], ["いました", "existed (polite)", "u2-polite", A], ["いない", "doesn't exist", "u1-neg", A],
  ["ありがとう", "thank you", "u2-polite", A], ["ありがとうございます", "thank you (polite)", "u2-polite", A], ["ございます", "(very polite 'is')", "u3-keigo", A],
  ["すみません", "excuse me / sorry", "u2-polite", A], ["ごめん", "sorry", "u2-casual", A], ["ごめんなさい", "sorry", "u2-casual", A],
  ["はい", "yes", "u1-wa", A], ["いいえ", "no", "u1-wa", A], ["ええ", "yes", "u1-wa", A], ["うん", "yeah", "u2-casual", A],
  ["そして", "and then", "u1-adverbs", C], ["しかし", "however", "u2-kara", C], ["だから", "so", "u2-kara", C], ["それから", "after that", "u1-adverbs", C],
  ["でも", "but", "u2-kara", C], ["また", "again", "u1-adverbs", C], ["もう", "already / more", "u1-adverbs", C], ["まだ", "still / not yet", "u1-adverbs", C],
  ["とても", "very", "u1-adverbs", C], ["あまり", "not very", "u1-adverbs", C], ["全然", "not at all", "u1-adverbs", C], ["ちょっと", "a little", "u1-adverbs", C],
  ["いつも", "always", "u1-adverbs", C], ["よく", "often / well", "u1-adverbs", C], ["たくさん", "many", "u1-adverbs", C], ["すぐ", "soon", "u1-adverbs", C],
  ["いい", "good", "u1-i-adj", A],
  ["な", "links a な-adjective to a noun", "u1-na-adj", A], ["わ", "(soft ending)", "u2-casual", P], ["ぞ", "(emphatic ending)", "u2-casual", P],
  ["ぜ", "(emphatic ending)", "u2-casual", P], ["さ", "(casual ending)", "u2-casual", P], ["かな", "I wonder", "u2-casual", P], ["かしら", "I wonder", "u2-casual", P],
  ["なあ", "(feeling ending)", "u2-casual", P], ["ねえ", "(feeling ending)", "u2-casual", P], ["てしまう", "end up doing", "u3-shimau", A],
  ["しまう", "end up doing", "u3-shimau", A], ["しまった", "ended up doing", "u3-shimau", A], ["しまって", "ended up (te-form)", "u3-shimau", A],
  ["しまいました", "ended up doing (polite)", "u3-shimau", A], ["しまいます", "end up doing (polite)", "u3-shimau", A], ["ちゃった", "ended up doing (casual)", "u3-shimau", A],
  ["きます", "comes (polite)", "u2-polite", A], ["きました", "came (polite)", "u2-polite", A], ["きません", "doesn't come (polite)", "u2-polite", A],
  ["きて", "come (te-form)", "u2-te", A], ["きた", "came", "u1-past", A], ["こない", "doesn't come", "u1-neg", A], ["こなかった", "didn't come", "u1-neg", A],
  ["できて", "can do (te-form)", "u2-potential", A], ["できた", "was able to", "u2-potential", A], ["できました", "was able to (polite)", "u2-potential", A],
  ["できません", "cannot do (polite)", "u2-potential", A], ["できなかった", "could not do", "u2-potential", A],
  ["くれる", "gives (to me)", "u2-give", A], ["くれた", "gave (to me)", "u2-give", A], ["くれて", "gave (te-form)", "u2-give", A], ["くれます", "gives (polite)", "u2-give", A],
  ["くれました", "gave (polite)", "u2-give", A], ["もらう", "receives", "u2-give", A], ["もらった", "received", "u2-give", A], ["もらって", "receive (te-form)", "u2-give", A],
  ["もらいます", "receives (polite)", "u2-give", A], ["あげる", "gives", "u2-give", A], ["あげた", "gave", "u2-give", A], ["あげて", "give (te-form)", "u2-give", A],
  ["あげます", "gives (polite)", "u2-give", A], ["なければ", "if you don't", "u2-must", A], ["なきゃ", "if you don't (casual)", "u2-must", A], ["なくて", "not, and", "u1-neg", A],
  ["ても", "even if", "u2-must", A], ["ては", "if you do", "u2-must", A], ["たら", "if / when", "u2-cond", A], ["なら", "if it's the case", "u2-cond", A],
  ["という", "called / that", "u2-quote", A], ["と思う", "think that", "u2-quote", A], ["と思います", "think that (polite)", "u2-quote", A], ["ずに", "without doing", "u3-without", A],
  ["ないで", "without doing", "u2-request", A], ["なくても", "even without", "u2-must", A],
  ["良い", "good", "u1-i-adj", A], ["良く", "well", "u1-i-adj", A], ["良かった", "was good / glad", "u1-i-adj", A], ["良くない", "not good", "u1-i-adj", A],
];

// What each verb form needs: [lesson that teaches it, short label]
const FORM_INFO = {
  stem: ["u2-polite", "stem"], polite: ["u2-polite", "polite"], "polite-neg": ["u2-polite", "polite, not"], "polite-past": ["u2-polite", "polite, past"],
  "polite-past-neg": ["u2-polite", "polite, past, not"], neg: ["u1-neg", "not"], "past-neg": ["u1-neg", "past, not"], past: ["u1-past", "past"],
  te: ["u2-te", "te-form"], teiru: ["u2-teiru", "ongoing"], teinai: ["u2-teiru", "not ongoing"], teita: ["u2-teiru", "was ongoing"],
  tara: ["u2-cond", "if / when"], ba: ["u2-cond", "if"], potential: ["u2-potential", "can do"], volitional: ["u2-want", "let's / will"],
  tai: ["u2-want", "want to"], imperative: ["u2-request", "command"], passive: ["u3-passive", "passive"], causative: ["u3-passive", "make / let"],
  adv: ["u1-i-adj", "adverb"], "polite-vol": ["u2-polite", "let's (polite)"], naide: ["u2-request", "without doing"],
};
export const FORM_LABEL = (f) => (FORM_INFO[f] ? FORM_INFO[f][1] : FORMS[f] || f);

const VERB_FORMS = ["stem", "polite", "polite-neg", "polite-past", "polite-past-neg", "neg", "past", "past-neg", "te", "tara", "ba", "potential",
  "volitional", "imperative", "tai", "passive", "causative", "teiru", "teinai", "teita", "naide"];
const ADJ_FORMS = ["neg", "past", "past-neg", "te", "adv", "ba", "tara", "polite", "polite-neg", "polite-past", "polite-past-neg"];

// Verbs ending in る whose stem ends in an い/え sound but that are still う-verbs
const RU_LOOKALIKES = new Set(["帰る", "入る", "走る", "要る", "切る", "知る", "参る", "減る", "限る", "喋る", "握る", "散る", "蹴る", "滑る", "焦る", "照る", "練る", "しゃべる", "かえる", "はいる", "はしる", "いる", "きる", "しる", "へる", "かぎる", "ちる", "ける", "すべる", "あせる", "てる", "ねる"]);
const E_I_ROW = "いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ";

const isKata = (c) => /[゠-ヿー]/.test(c);
const isDigit = (c) => /[0-9０-９]/.test(c);
const NUMERAL_KANJI = "〇一二三四五六七八九十百千万";
const PUNCT = /[。、！？!?「」『』（）()・…～〜，．,.\s"'“”’‘:：;；\-－—]/;

/** A short gloss from a dictionary meaning ("I (polite, general)" → "I"). */
export function shortGloss(m, max = 26) {
  let s = String(m || "").replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  s = s.split(/[;,]/)[0].trim() || String(m || "").trim();
  if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  return s;
}

/** Possible verb classes for a dictionary-form verb (る verbs can be ambiguous). */
function verbClasses(f) {
  const last = f.slice(-1), prev = f.slice(-2, -1);
  if (f === "行く" || f === "いく") return ["iku"];
  if (f === "ある") return ["aru"];
  if (last !== "る") return ["u"];
  if (RU_LOOKALIKES.has(f)) return ["u"];
  if (KANJI_RE.test(prev)) return ["ru", "u"]; // 見る (ru) or 乗る (u): generate both, a wrong guess only adds unused spellings
  return E_I_ROW.includes(prev) ? ["ru"] : ["u"];
}

/** Split a dictionary word into the {w,k,ok,cls} shapes the conjugation engine uses. */
export function wordShape(f, r, meaning) {
  if (!f) return [];
  const isVerbMeaning = /^to\b/i.test(meaning || "");
  if (f === "する") return [{ w: "", k: "", ok: "する", cls: "suru" }];
  if (f === "来る" || f === "くる") return [{ w: "来", k: "", ok: "る", cls: "kuru" }];
  const idx = [...f].map((c, i) => (KANJI_RE.test(c) ? i : -1)).filter((i) => i >= 0);
  const chars = [...f];
  if (f.endsWith("する") && f.length > 2 && isVerbMeaning) {
    return [{ w: f.slice(0, -2), k: r && r.endsWith("する") ? r.slice(0, -2) : "", ok: "する", cls: "suru" }];
  }
  const split = () => {
    if (!idx.length) return { w: "", k: "", ok: f };
    const lastK = idx[idx.length - 1];
    const w = chars.slice(0, lastK + 1).join("");
    const ok = chars.slice(lastK + 1).join("");
    if (!ok || !r || !r.endsWith(ok) || [...r].length <= [...ok].length) return null;
    return { w, k: r.slice(0, r.length - ok.length), ok };
  };
  if (isVerbMeaning && "うくぐすつぬぶむる".includes(f.slice(-1))) {
    const sp = split();
    return sp ? verbClasses(f).map((cls) => ({ ...sp, cls })) : [];
  }
  if (!isVerbMeaning && f.endsWith("い") && chars.length >= 2) {
    const sp = split();
    return sp ? [{ ...sp, cls: f === "いい" ? "ii" : "iadj" }] : [];
  }
  return [];
}

const addTo = (map, key, cand) => {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(cand); else map.set(key, [cand]);
};

/**
 * Build the lexicon from the store.
 * learned: cards you have started. Everything else in your decks is known but still new.
 */
export function buildLexicon(store, now = Date.now(), { extra = [] } = {}) {
  const surf = new Map(); // surface -> candidates
  const entries = [];
  const kanjiMap = new Map();
  let maxLen = 1;

  const lessonDone = (id) => !id || !!store.lessons?.[id]?.done;

  // kanji (keywords and stories)
  for (const deck of store.deckList()) {
    if (deck.kind !== "kanji") continue;
    const content = store.content[deck.id] || {};
    const prog = store.prog[deck.id] || {};
    for (const [id, c] of Object.entries(content)) {
      if (!c.f || [...c.f].length !== 1) continue;
      const r = prog[id];
      const cur = kanjiMap.get(c.f);
      const learned = !!r && r.st !== NEW && !r.sus;
      if (!cur || (learned && !cur.learned)) kanjiMap.set(c.f, { ch: c.f, kw: c.m || "", story: (c.x && c.x.story) || "", learned, cardId: id, deckId: deck.id });
    }
  }

  const register = (surface, cand) => {
    addTo(surf, surface, cand);
    if ([...surface].length > maxLen) maxLen = [...surface].length;
  };

  // inflected forms, casual contractions and derived verbs of a dictionary word (shared by decks and reader words)
  const addInflections = (e, c) => {
    for (const shape of wordShape(c.f, c.r, c.m)) {
      const forms = shape.cls === "iadj" || shape.cls === "ii" ? ADJ_FORMS : VERB_FORMS;
      for (const form of forms) {
        const segs = conjugate(shape, form);
        if (!segs) continue;
        const text = segs.map((s) => s.t).join("");
        if (!text || text === c.f) continue;
        register(text, { type: "word", entry: e, form, cost: 1.05 });
      }
      // casual contractions of 〜ている, and derived verbs (potential, passive, causative) with their own forms
      if (shape.cls !== "iadj" && shape.cls !== "ii") {
        const te = conjugate(shape, "te");
        if (te) {
          const t = te.map((x) => x.t).join("");
          for (const [suffix, form] of [["る", "teiru"], ["た", "teita"], ["ない", "teinai"]]) register(t + suffix, { type: "word", entry: e, form, cost: 1.15 });
        }
        if (shape.cls !== "kuru") {
          for (const derived of ["potential", "passive", "causative", "tai"]) {
            const dsegs = conjugate(shape, derived);
            if (!dsegs) continue;
            const text = dsegs.map((x) => x.t).join("");
            const head = (shape.pre || "") + (shape.w || "");
            if (!text.startsWith(head)) continue;
            // 〜たい behaves like an い-adjective (買いたかった), the others like a る-verb
            const shape2 = { pre: shape.pre, w: shape.w, k: shape.k, ok: text.slice(head.length), cls: derived === "tai" ? "iadj" : "ru" };
            for (const form of derived === "tai" ? ADJ_FORMS : VERB_FORMS) {
              if (form === "stem") continue;
              const segs2 = conjugate(shape2, form);
              if (!segs2) continue;
              register(segs2.map((x) => x.t).join(""), { type: "word", entry: e, form: derived, cost: 1.2 });
            }
          }
        }
      }
      // the same forms written in kana (many sentences spell 来て, 良く or 置き in kana)
      if (shape.w && c.r && shape.cls !== "suru" && shape.cls !== "kuru") {
        const kana = { w: "", k: "", ok: c.r, cls: shape.cls };
        for (const form of forms) {
          if (form === "stem") continue;
          const segs = conjugate(kana, form);
          const text = segs ? segs.map((x) => x.t).join("") : "";
          if (text.length >= 2 && text !== c.r) register(text, { type: "word", entry: e, form, cost: 1.45 });
        }
      }
      if (shape.cls !== "iadj" && shape.cls !== "ii") {
        const stem = conjugate(shape, "stem");
        if (stem) { const t = stem.map((s) => s.t).join("") + "ましょう"; register(t, { type: "word", entry: e, form: "polite-vol", cost: 1.05 }); }
      }
    }
  };

  // vocabulary decks
  for (const deck of store.deckList()) {
    if (deck.kind !== "vocab") continue;
    const content = store.content[deck.id] || {};
    const prog = store.prog[deck.id] || {};
    for (const [id, c] of Object.entries(content)) {
      if (!c.f) continue;
      const r = prog[id];
      const learned = !!r && r.st !== NEW && !r.sus && deck.enabled !== false;
      const e = { type: "word", f: c.f, r: c.r || "", m: c.m || "", gloss: shortGloss(c.m), learned, cardId: id, deckId: deck.id, order: c.o ?? 0, card: c, deckEnabled: deck.enabled !== false };
      entries.push(e);
      register(c.f, { type: "word", entry: e, cost: 1 });
      if (c.r && c.r !== c.f && KANJI_RE.test(c.f) && [...c.r].length >= 2) register(c.r, { type: "word", entry: e, cost: 1.4, alias: true });
      addInflections(e, c);
    }
  }

  // lesson vocabulary bank (shown when your decks do not have the word)
  const doneVocab = new Set();
  for (const l of LESSONS) if (store.lessons?.[l.id]?.done) for (const id of l.vocab || []) doneVocab.add(id);
  for (const w of BANK) {
    if (w.pos === "time" || !w.w && !w.ok) continue;
    const f = `${w.pre || ""}${w.w || ""}${w.ok || ""}`;
    const r = `${w.pre || ""}${w.k || ""}${w.ok || ""}`;
    const en = typeof w.en === "object" ? w.en.base : w.en;
    const e = { type: "word", f, r, m: en || "", gloss: shortGloss(en), learned: doneVocab.has(w.id), bank: true, order: 99999, card: null };
    // only when your decks do not already cover it
    if (!surf.has(f)) {
      register(f, { type: "word", entry: e, cost: 1.2 });
      // typed in kana (writing practice): がくせい finds 学生
      if (r && r !== f && KANJI_RE.test(f) && [...r].length >= 2 && !surf.has(r)) register(r, { type: "word", entry: e, cost: 1.5, alias: true });
    }
  }

  // extra words (the reader's own vocabulary): explained like deck words, never counted as learned unless a deck or lesson says so
  for (const w of extra) {
    const existing = (surf.get(w.f) || []).find((x) => x.type === "word" && !x.form && !x.alias);
    if (existing && !existing.entry.bank && !existing.entry.extra) continue; // a deck word: already complete
    let e = existing ? existing.entry : null;
    if (!e) {
      e = { type: "word", f: w.f, r: w.r, m: w.m, gloss: shortGloss(w.m), learned: false, extra: true, order: 99998, card: null };
      register(w.f, { type: "word", entry: e, cost: 1.2 });
      if (w.r && w.r !== w.f && KANJI_RE.test(w.f) && [...w.r].length >= 2) register(w.r, { type: "word", entry: e, cost: 1.4, alias: true });
    }
    addInflections(e, { f: w.f, r: w.r, m: w.m });
  }

  // grammar
  for (const [s, g, l, kind] of GRAMMAR) {
    const lesson = LESSON_BY_ID[l];
    register(s, { type: "grammar", g: { s, gloss: g, lesson: l, kind, lessonTitle: lesson ? lesson.title : "" }, cost: 1.1 });
  }

  const lex = { surf, entries, kanjiMap, maxLen: Math.min(maxLen, 12), lessonDone, now, store };
  return lex;
}

/** Positions inside a multi-character furigana segment must never be cut. */
function allowedCuts(chars, segs) {
  const ok = new Array(chars.length + 1).fill(true);
  let p = 0;
  for (const s of segs) {
    const len = [...s.t].length;
    if (s.r != null && len > 1) for (let i = 1; i < len; i++) ok[p + i] = false;
    p += len;
  }
  return ok;
}

/**
 * Split text into tokens. `segs` (from furigana markup) makes sure readings stay with their word.
 * Token: { text, a, b, type: word|grammar|num|punct|foreign|unknown, entry, form, g, known, gloss, formNote }
 */
export function tokenize(text, lex, segs) {
  const chars = [...text];
  const n = chars.length;
  const cut = allowedCuts(chars, segs || []);
  const best = new Array(n + 1).fill(null);
  best[0] = { cost: 0, prev: -1, tok: null };
  const upd = (j, cost, i, tok) => {
    if (!best[j] || cost < best[j].cost - 1e-9) best[j] = { cost, prev: i, tok };
  };
  for (let i = 0; i < n; i++) {
    const cur = best[i];
    if (!cur || !cut[i]) continue;
    const c = chars[i];
    // punctuation / spaces
    if (PUNCT.test(c)) { upd(i + 1, cur.cost + 0.01, i, { type: "punct" }); continue; }
    // numbers
    if (isDigit(c)) { let j = i; while (j < n && isDigit(chars[j])) j++; if (cut[j]) upd(j, cur.cost + 1, i, { type: "num" }); }
    if (NUMERAL_KANJI.includes(c)) { let j = i; while (j < n && NUMERAL_KANJI.includes(chars[j])) j++; if (cut[j]) upd(j, cur.cost + 1.02, i, { type: "num" }); }
    // katakana runs (names and loanwords)
    if (isKata(c) && c !== "ー") { let j = i; while (j < n && isKata(chars[j])) j++; if (cut[j]) upd(j, cur.cost + 1.5 + (j - i > 1 ? 0 : 1.5), i, { type: "foreign" }); }
    if (/[A-Za-zＡ-Ｚａ-ｚ]/.test(c)) { let j = i; while (j < n && /[A-Za-zＡ-Ｚａ-ｚ]/.test(chars[j])) j++; if (cut[j]) upd(j, cur.cost + 1, i, { type: "foreign" }); }
    // dictionary
    const maxL = Math.min(lex.maxLen, n - i);
    for (let L = 1; L <= maxL; L++) {
      const j = i + L;
      if (!cut[j]) continue;
      const cands = lex.surf.get(chars.slice(i, j).join(""));
      if (!cands) continue;
      let pen = 0;
      // many tiny tokens in a row are usually a bad split
      if (L === 1 && cur.tok && cur.tok.cand && cur.tok.cand.type === "grammar" && cur.tok.len === 1) pen = 0.6;
      for (const cand of cands) upd(j, cur.cost + cand.cost + pen - (L > 1 ? 0.02 * L : 0), i, { type: cand.type, cand, len: L });
    }
    // unknown: consume to the next allowed cut
    let j = i + 1;
    while (j < n && !cut[j]) j++;
    const kanji = KANJI_RE.test(c);
    upd(j, cur.cost + (j - i) * (kanji ? 6 : 4), i, { type: "unknown" });
  }
  // walk back
  const toks = [];
  let j = n;
  if (!best[n]) return null;
  while (j > 0) {
    const b = best[j];
    toks.push({ a: b.prev, b: j, ...b.tok, cand: b.tok.cand });
    j = b.prev;
  }
  toks.reverse();
  // merge neighbouring unknowns and finish tokens
  const out = [];
  for (const t of toks) {
    const prev = out[out.length - 1];
    if (t.type === "unknown" && prev && prev.type === "unknown") { prev.b = t.b; continue; }
    out.push({ ...t });
  }
  // two neighbouring kanji words that are not a word together are usually a compound we do not have (着物 → 着 + 物)
  // (unless the furigana puts a boundary right there: 毎朝[まいあさ]六時[ろくじ] is two words the author wrote apart)
  const apart = new Set();
  if (segs) {
    let pos = 0;
    segs.forEach((sg, i) => {
      pos += [...sg.t].length;
      const next = segs[i + 1];
      if (next && sg.r != null && sg.r !== "" && next.r != null && next.r !== "") apart.add(pos);
    });
  }
  for (let k = 0; k + 1 < out.length; k++) {
    const a = out[k], b = out[k + 1];
    if (a.type === "word" && b.type === "word" && KANJI_RE.test(chars[a.b - 1]) && KANJI_RE.test(chars[b.a]) && !apart.has(a.b)) { a.type = "unknown"; a.cand = null; b.type = "unknown"; b.cand = null; }
  }
  for (let k = out.length - 1; k > 0; k--) {
    if (out[k].type === "unknown" && out[k - 1].type === "unknown") { out[k - 1].b = out[k].b; out.splice(k, 1); }
  }
  const lessonDone = lex.lessonDone;
  for (const t of out) {
    t.text = chars.slice(t.a, t.b).join("");
    const cand = t.cand;
    delete t.cand; delete t.len;
    if (t.type === "word") {
      const e = cand.entry;
      t.entry = e;
      t.form = cand.form || null;
      const wordKnown = e.learned;
      const formKnown = !t.form || lessonDone(FORM_INFO[t.form] && FORM_INFO[t.form][0]);
      t.known = wordKnown && formKnown;
      const parts = [];
      if (!wordKnown) parts.push(e.gloss);
      if (!formKnown) parts.push(FORM_LABEL(t.form));
      t.gloss = parts.join(" · ");
    } else if (t.type === "grammar") {
      t.g = cand.g;
      t.known = lessonDone(cand.g.lesson);
      t.gloss = t.known ? "" : cand.g.gloss;
    } else {
      t.known = true;
      t.gloss = "";
    }
  }
  return out;
}

/** Everything the popup shows for a token. */
export function tokenInfo(tok, lex) {
  if (tok.type === "grammar") {
    return { kind: "grammar", text: tok.text, reading: "", meaning: tok.g.gloss, lesson: tok.g.lessonTitle || "", parts: [], mnemonic: "", note: "" };
  }
  if (tok.type !== "word") return null;
  const e = tok.entry;
  const parts = [];
  const seen = new Set();
  for (const ch of [...e.f]) {
    if (!KANJI_RE.test(ch) || seen.has(ch)) continue;
    seen.add(ch);
    const k = lex.kanjiMap.get(ch);
    if (k) parts.push({ ch, kw: k.kw, learned: k.learned, story: k.story });
  }
  // the story of the kanji you know least
  const weakest = parts.find((p) => !p.learned && p.story) || parts.find((p) => p.story) || null;
  let mnemonic = "";
  if (weakest) mnemonic = shortStory(weakest.story);
  const note = e.card && e.card.x && e.card.x.notes ? shortStory(e.card.x.notes, 200) : "";
  return {
    kind: "word", text: tok.text, base: e.f !== tok.text ? e.f : "", reading: e.r, meaning: e.m, form: tok.form ? FORM_LABEL(tok.form) : "",
    parts, mnemonic, mnemonicFor: weakest ? weakest.ch : "", note, learned: e.learned,
    audio: e.card && e.card.x && e.card.x.wa ? e.card.x.wa : "",
  };
}

export function shortStory(s, max = 230) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return stop > 80 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

/** Prepare a sentence from your cards: text, readings and tokens with markup per token. */
export function analyzeSentence(card, lex) {
  const markup = String((card.x && (card.x.sentF || card.x.sent)) || "").replace(/ +/g, "");
  if (!markup) return null;
  const segs = parseFuri(markup);
  const text = segs.map((s) => s.t).join("");
  if (!text) return null;
  const toks = tokenize(text, lex, segs);
  if (!toks) return null;
  // markup per token
  const flat = [];
  for (const s of segs) {
    const cs = [...s.t];
    if (s.r != null && cs.length > 0) flat.push({ t: s.t, r: s.r, len: cs.length });
    else for (const c of cs) flat.push({ t: c, len: 1 });
  }
  let pos = 0;
  const starts = [];
  for (const f of flat) { starts.push(pos); pos += f.len; }
  for (const t of toks) {
    const parts = [];
    flat.forEach((f, i) => { if (starts[i] >= t.a && starts[i] + f.len <= t.b) parts.push(f.r != null ? { t: f.t, r: f.r } : { t: f.t }); });
    // merge adjacent plain parts for tidy markup
    const merged = [];
    for (const p of parts) {
      const last = merged[merged.length - 1];
      if (last && last.r == null && p.r == null) last.t += p.t; else merged.push({ ...p });
    }
    t.m = segsToMarkup(merged);
  }
  return { text, markup, tokens: toks };
}

/** How a sentence fits what you know: unknown tokens (no way to explain them) and glossed ones. */
export function fit(tokens) {
  let unknown = 0, glossed = 0, content = 0;
  for (const t of tokens) {
    if (t.type === "unknown") unknown++;
    else if (t.type !== "punct") { content++; if (t.gloss) glossed++; }
  }
  return { unknown, glossed, content };
}

export { plainOf };
