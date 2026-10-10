import { unit1 } from "./unit1.js";
import { unit2 } from "./unit2.js";
import { unit3 } from "./unit3.js";
import { EXTRA_TABLES } from "./tables.js";

export const SOURCE = {
  name: "Tae Kim's Guide to Japanese Grammar",
  url: "https://guidetojapanese.org/learn/",
  license: "CC BY-NC-SA 3.0",
};

export const UNITS = [
  { id: "u1", title: "Foundations", blurb: "Sentences, particles, adjectives and verbs.", ref: "Chapters 2 and 3" },
  { id: "u2", title: "Everyday Japanese", blurb: "Polite speech, te-form, wants, conditionals and requests.", ref: "Chapter 4" },
  { id: "u3", title: "Special expressions", blurb: "Passive, honorifics, certainty, comparisons and more.", ref: "Chapter 5" },
];

// Where each lesson sits in Tae Kim's Guide, so the lesson can link to his own explanation.
const TAE_KIM = {
  "u1-writing": "writing", "u1-desu": "stateofbeing", "u1-wa": "particlesintro", "u1-ga": "particlesintro",
  "u1-na-adj": "adjectives", "u1-i-adj": "adjectives", "u1-verbs": "verbs", "u1-neg": "negativeverbs", "u1-past": "past_tense",
  "u1-wo": "verbparticles", "u1-ni-de": "verbparticles", "u1-trans": "in-transitive", "u1-relative": "clause",
  "u1-noun-particles": "nounparticles", "u1-no": "nounparticles", "u1-adverbs": "adverbs",
  "u2-polite": "polite", "u2-people": "people", "u2-question": "question", "u2-te": "compound", "u2-kara": "compound",
  "u2-teiru": "teform", "u2-potential": "potential", "u2-naru": "surunaru", "u2-cond": "conditionals", "u2-must": "must",
  "u2-want": "desire", "u2-quote": "define", "u2-try": "try", "u2-give": "favors", "u2-request": "requests",
  "u2-numbers": "numbers", "u2-casual": "slang",
  "u3-passive": "causepass", "u3-keigo": "honorific", "u3-shimau": "unintended", "u3-koto": "genericnouns",
  "u3-certainty": "certainty", "u3-amount": "amount", "u3-similar": "similarity", "u3-compare": "comparison",
  "u3-easy": "easyhard", "u3-without": "negativeverbs2", "u3-wake": "reasoning", "u3-time": "timeactions",
};
export const taeKimUrl = (lessonId) => (TAE_KIM[lessonId] ? `https://guidetojapanese.org/learn/grammar/${TAE_KIM[lessonId]}` : SOURCE.url);

/** Pages get `tables`: the table written into the lesson (if any) plus the reference tables from tables.js. */
const withTables = (l) => ({
  ...l,
  pages: (l.pages || []).map((p) => {
    const extra = (EXTRA_TABLES[l.id] && EXTRA_TABLES[l.id][p.h]) || [];
    const tables = [...(p.table ? [p.table] : []), ...extra];
    return tables.length ? { ...p, tables } : p;
  }),
});

export const LESSONS = [
  ...unit1.map((l) => ({ ...l, unit: "u1" })),
  ...unit2.map((l) => ({ ...l, unit: "u2" })),
  ...unit3.map((l) => ({ ...l, unit: "u3" })),
].map((l, i) => ({ ...withTables(l), index: i }));

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
export const lessonsOfUnit = (unitId) => LESSONS.filter((l) => l.unit === unitId);
