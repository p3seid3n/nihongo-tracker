import { unit1 } from "./unit1.js";
import { unit2 } from "./unit2.js";
import { unit3 } from "./unit3.js";

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

export const LESSONS = [
  ...unit1.map((l) => ({ ...l, unit: "u1" })),
  ...unit2.map((l) => ({ ...l, unit: "u2" })),
  ...unit3.map((l) => ({ ...l, unit: "u3" })),
].map((l, i) => ({ ...l, index: i }));

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
export const lessonsOfUnit = (unitId) => LESSONS.filter((l) => l.unit === unitId);
