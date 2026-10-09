// Sentence generators: build fresh practice sentences from the word bank, so exercises
// vary and favour words that need practice.
import { PEOPLE, NOUNS, VERBS, ADJECTIVES, TIMES, BY_ID, markup } from "./bank.js";
import { conjMarkup } from "../lib/jp.js";

const FORM_KEYS = {
  polite: { aff: "polite", neg: "polite-neg", past: "polite-past", pastneg: "polite-past-neg" },
  plain: { aff: "dict", neg: "neg", past: "past", pastneg: "past-neg" },
};
const ALL_FORMS = ["aff", "neg", "past", "pastneg"];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr, weight) {
  if (!arr.length) return null;
  if (!weight) return arr[Math.floor(rng() * arr.length)];
  const ws = arr.map((x) => Math.max(0.01, weight(x)));
  let r = rng() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}
export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sentence = (s) => cap(s.replace(/\s+/g, " ").trim()) + ".";
const isPlural = (bare) => /s$/.test(bare) && !/ss$/.test(bare);

function beEn(P, form) {
  const be = P.be, was = P.was;
  return { aff: be, neg: be + " not", past: was, pastneg: was + " not" }[form];
}

function verbEn(P, V, form, future) {
  const b = V.en;
  if (future) return form === "neg" ? `will not ${b.base}` : `will ${b.base}`;
  const third = P.third;
  switch (form) {
    case "aff": return third ? b.s : b.base;
    case "neg": return third ? `does not ${b.base}` : `do not ${b.base}`;
    case "past": return b.past;
    case "pastneg": return `did not ${b.base}`;
  }
}

function pickForm(rng, forms) { return forms[Math.floor(rng() * forms.length)]; }

// Each generator: (ctx, style, forms) -> { render(form) } where render returns {tokens, en, words}
const G = {
  "wa-desu"(ctx, style, forms) {
    const { rng, weight } = ctx;
    const P = pick(rng, PEOPLE, (p) => weight(p.id));
    const roles = NOUNS.filter((n) => n.tags.includes("role") && !(P.role && P.role === n.en));
    const R = pick(rng, roles, (n) => weight(n.id));
    const cop = { polite: { aff: "です", neg: "じゃありません", past: "でした", pastneg: "じゃありませんでした" }, plain: { aff: "だ", neg: "じゃない", past: "だった", pastneg: "じゃなかった" } }[style];
    return {
      forms,
      render: (form) => ({
        tokens: [markup(P), "は", markup(R), cop[form]],
        en: sentence(`${P.en} ${beEn(P, form)} ${R.oe}`),
        words: [P.id, R.id],
      }),
    };
  },

  "adj-desu"(ctx, style, forms) {
    const { rng, weight } = ctx;
    const okAdj = (a, n) => a.sub.some((t) => n.tags.includes(t)) && (!ctx.only || (ctx.only === "i" ? a.cls !== "nadj" : a.cls === "nadj"));
    const subjects = NOUNS.filter((n) => !n.tags.includes("role") && !n.tags.includes("do") && ADJECTIVES.some((a) => okAdj(a, n)));
    const S = pick(rng, subjects, (n) => weight(n.id));
    const A = pick(rng, ADJECTIVES.filter((a) => okAdj(a, S)), (a) => weight(a.id));
    const plural = isPlural(S.en);
    const be = (form) => (plural ? { aff: "are", neg: "are not", past: "were", pastneg: "were not" } : { aff: "is", neg: "is not", past: "was", pastneg: "was not" })[form];
    return {
      forms,
      render: (form) => {
        const key = FORM_KEYS[style][form];
        let adjM;
        if (A.cls === "nadj" && style === "plain") adjM = markup(A) + { aff: "だ", neg: "じゃない", past: "だった", pastneg: "じゃなかった" }[form];
        else adjM = conjMarkup(A, key);
        return {
          tokens: [markup(S), "は", adjM],
          en: sentence(`${S.the} ${be(form)} ${A.en}`),
          words: [S.id, A.id],
        };
      },
    };
  },

  like(ctx, style, forms) {
    const { rng, weight } = ctx;
    const P = pick(rng, PEOPLE, (p) => weight(p.id));
    const objs = NOUNS.filter((n) => ["food", "drink", "animal", "listen"].some((t) => n.tags.includes(t)));
    const O = pick(rng, objs, (n) => weight(n.id));
    const adj = pick(rng, ADJECTIVES.filter((a) => a.id === "suki" || a.id === "kirai"), (a) => (a.id === "suki" ? 2 : 1));
    const verb = adj.id === "suki" ? "like" : "dislike";
    return {
      forms,
      render: (form) => {
        const en = {
          aff: P.third ? `${verb}s` : verb,
          neg: P.third ? `does not ${verb}` : `do not ${verb}`,
          past: `${verb}d`,
          pastneg: `did not ${verb}`,
        }[form];
        const adjM = style === "plain"
          ? markup(adj) + { aff: "だ", neg: "じゃない", past: "だった", pastneg: "じゃなかった" }[form]
          : conjMarkup(adj, FORM_KEYS.polite[form]);
        return { tokens: [markup(P), "は", markup(O), "が", adjM], en: sentence(`${P.en} ${en} ${O.oe}`), words: [P.id, O.id, adj.id] };
      },
    };
  },

  "obj-verb"(ctx, style, forms) {
    const { rng, weight } = ctx;
    const P = pick(rng, PEOPLE, (p) => weight(p.id));
    const verbs = VERBS.filter((v) => v.obj.length);
    const V = pick(rng, verbs, (v) => weight(v.id));
    const objs = NOUNS.filter((n) => n.tags.some((t) => V.obj.includes(t)) && !n.tags.includes("role"));
    const O = pick(rng, objs, (n) => weight(n.id));
    const useTime = rng() < 0.5;
    const T = useTime ? pick(rng, TIMES) : null;
    const fs = T ? (T.tense === "past" ? ["past", "pastneg"] : ["aff", "neg"]) : forms;
    return {
      forms: fs,
      render: (form) => {
        const key = FORM_KEYS[style][form];
        const future = T && T.tense === "future";
        const toks = [markup(P), "は"];
        if (T) toks.push(markup(T));
        toks.push(markup(O), "を", conjMarkup(V, key));
        const en = `${P.en} ${verbEn(P, V, form, future)} ${O.oe}${T ? " " + T.en : ""}`;
        return { tokens: toks, en: sentence(en), words: [P.id, O.id, V.id] };
      },
    };
  },

  "go-to"(ctx, style, forms) {
    const { rng, weight } = ctx;
    const P = pick(rng, PEOPLE, (p) => weight(p.id));
    const V = pick(rng, VERBS.filter((v) => v.motion), (v) => weight(v.id));
    const places = NOUNS.filter((n) => n.tags.includes("place") && n.to);
    const L = pick(rng, places, (n) => weight(n.id));
    const part = V.id === "kaeru" ? pick(rng, ["に", "へ"]) : pick(rng, ["に", "へ"]);
    return {
      forms,
      render: (form) => {
        const key = FORM_KEYS[style][form];
        const en = `${P.en} ${verbEn(P, V, form, false)} ${L.to}`;
        return { tokens: [markup(P), "は", markup(L), part, conjMarkup(V, key)], en: sentence(en), words: [P.id, L.id, V.id] };
      },
    };
  },

  "at-place"(ctx, style, forms) {
    const { rng, weight } = ctx;
    const P = pick(rng, PEOPLE, (p) => weight(p.id));
    const V = pick(rng, VERBS.filter((v) => v.obj.length && v.id !== "kau"), (v) => weight(v.id));
    const objs = NOUNS.filter((n) => n.tags.some((t) => V.obj.includes(t)) && !n.tags.includes("role"));
    const O = pick(rng, objs, (n) => weight(n.id));
    const L = pick(rng, NOUNS.filter((n) => n.tags.includes("place") && n.at), (n) => weight(n.id));
    return {
      forms,
      render: (form) => {
        const key = FORM_KEYS[style][form];
        return {
          tokens: [markup(P), "は", markup(L), "で", markup(O), "を", conjMarkup(V, key)],
          en: sentence(`${P.en} ${verbEn(P, V, form, false)} ${O.oe} ${L.at}`),
          words: [P.id, L.id, O.id, V.id],
        };
      },
    };
  },

  exist(ctx, style, forms) {
    const { rng, weight } = ctx;
    const animate = rng() < 0.4;
    const Obj = pick(rng, NOUNS.filter((n) => (animate ? n.tags.includes("animal") : n.tags.some((t) => ["thing", "food", "drink"].includes(t)) && !n.tags.includes("role"))), (n) => weight(n.id));
    const L = pick(rng, NOUNS.filter((n) => n.tags.includes("place") && n.at), (n) => weight(n.id));
    const V = BY_ID[animate ? "iru" : "aru"];
    const bare = Obj.oe.replace(/^(a|an) /, "");
    const plural = isPlural(bare);
    return {
      forms: forms.filter((f) => f === "aff" || f === "neg" || f === "past" || f === "pastneg"),
      render: (form) => {
        const key = FORM_KEYS[style][form];
        const be = plural ? (form === "past" || form === "pastneg" ? "were" : "are") : (form === "past" || form === "pastneg" ? "was" : "is");
        const neg = form === "neg" || form === "pastneg";
        const en = `there ${be} ${neg ? "no " + bare : Obj.oe} ${L.at}`;
        return { tokens: [markup(L), "に", markup(Obj), "が", conjMarkup(V, key)], en: sentence(en), words: [L.id, Obj.id, V.id] };
      },
    };
  },
};

export const GENERATOR_NAMES = Object.keys(G);

/**
 * spec: "obj-verb:polite:aff,neg"  (style defaults to polite, forms to all four)
 * Returns { tokens, en, words, others: [english of the same sentence in other forms] }
 */
export function generate(spec, ctx) {
  const [name, styleIn = "polite", formsIn, only] = spec.split(":");
  const gen = G[name];
  if (!gen) throw new Error("Unknown generator " + spec);
  const style = styleIn === "plain" ? "plain" : "polite";
  const allowed = formsIn ? formsIn.split(",") : ALL_FORMS;
  const made = gen({ ...ctx, only: only || null }, style, allowed);
  const pool = made.forms.length ? made.forms.filter((f) => allowed.includes(f) || made.forms === allowed) : allowed;
  const forms = pool.length ? pool : made.forms;
  const form = pickForm(ctx.rng, forms);
  const main = made.render(form);
  const others = ALL_FORMS.filter((f) => f !== form).map((f) => made.render(f).en);
  return { ...main, form, others, spec };
}
