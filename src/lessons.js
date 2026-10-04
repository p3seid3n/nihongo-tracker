export const UNITS = [
  {
    id: "u1", title: "Basic Grammar", jp: "基礎文法",
    lessons: [
      { id: "state", jp: "だ", en: "State of being", url: "https://guidetojapanese.org/learn/grammar/stateofbeing",
        explain: "Japanese declares what something is without a verb like \"is\". だ attaches to a noun to state a fact; です is the polite form.",
        templates: ["{V}だ。", "これは{V}だ。", "{V}です。"] },
      { id: "particles1", jp: "は・も・が", en: "Intro particles", url: "https://guidetojapanese.org/learn/grammar/particlesintro",
        explain: "は marks the topic — what the sentence is about. も means \"also\". が identifies which thing does something.",
        templates: ["{V}は好きだ。", "{V}も好きだ。", "{V}が好きだ。"] },
      { id: "adjectives", jp: "形容詞", en: "Adjectives", url: "https://guidetojapanese.org/learn/grammar/adjectives",
        explain: "い-adjectives conjugate on their own (早い → 早くない). な-adjectives attach to nouns with な.",
        templates: ["{V}は大きい。", "とても{V}だ。"] },
      { id: "verbs", jp: "動詞", en: "Verb basics", url: "https://guidetojapanese.org/learn/grammar/verbs",
        explain: "Verbs split into ru-verbs and u-verbs. A verb alone is a complete sentence.",
        templates: ["{V}を食べる。", "{V}を見る。"] },
      { id: "negverbs", jp: "否定", en: "Negative verbs", url: "https://guidetojapanese.org/learn/grammar/negativeverbs",
        explain: "Ru-verbs: drop る, add ない. U-verbs: shift the final sound to あ-row + ない.",
        templates: ["{V}を食べない。", "{V}じゃない。"] },
      { id: "past", jp: "過去形", en: "Past tense", url: "https://guidetojapanese.org/learn/grammar/past_tense",
        explain: "た replaces る (ru-verbs) or follows sound-based rules (u-verbs).",
        templates: ["{V}を食べた。", "{V}だった。"] },
      { id: "verbparticles", jp: "を・に・で", en: "Verb particles", url: "https://guidetojapanese.org/learn/grammar/verbparticles",
        explain: "を marks the direct object. に marks a target/destination. で marks where an action happens.",
        templates: ["{V}を買う。", "{V}に行く。"] },
      { id: "nounparticles", jp: "の", en: "Noun particles", url: "https://guidetojapanese.org/learn/grammar/nounparticles",
        explain: "の links two nouns: X の Y means \"Y of X\".",
        templates: ["これは{V}の本だ。"] },
    ],
  },
  {
    id: "u2", title: "Essential Grammar", jp: "必須文法",
    lessons: [
      { id: "polite", jp: "です・ます", en: "Polite form", url: "https://guidetojapanese.org/learn/grammar/polite",
        explain: "ます attaches to the verb stem for polite speech; です does the same job for nouns/adjectives.",
        templates: ["{V}を食べます。", "{V}です。"] },
      { id: "question", jp: "か", en: "Questions", url: "https://guidetojapanese.org/learn/grammar/question",
        explain: "か turns a statement into a question in polite speech. Casual speech often just uses rising intonation.",
        templates: ["{V}ですか？", "{V}を食べますか？"] },
      { id: "teform", jp: "〜ている", en: "Ongoing actions", url: "https://guidetojapanese.org/learn/grammar/teform",
        explain: "The て-form plus いる describes an action in progress or a resulting state.",
        templates: ["{V}を食べている。"] },
      { id: "potential", jp: "可能形", en: "Potential form", url: "https://guidetojapanese.org/learn/grammar/potential",
        explain: "Describes being able to do something — う-verbs shift to the え-row + る.",
        templates: ["{V}が食べられる。"] },
      { id: "desire", jp: "たい", en: "Desire", url: "https://guidetojapanese.org/learn/grammar/desire",
        explain: "Verb stem + たい expresses wanting to do something.",
        templates: ["{V}が食べたい。"] },
      { id: "givereceive", jp: "あげる・くれる", en: "Giving & receiving", url: "https://guidetojapanese.org/learn/grammar/favors",
        explain: "Japanese verbs for giving/receiving encode social direction — who's giving to whom.",
        templates: ["{V}をあげる。", "{V}をくれた。"] },
      { id: "numbers", jp: "数字", en: "Numbers & counting", url: "https://guidetojapanese.org/learn/grammar/numbers",
        explain: "Counters attach to numbers depending on what's being counted.",
        templates: [] },
      { id: "casual", jp: "砕けた話し方", en: "Casual speech", url: "https://guidetojapanese.org/learn/grammar/casual",
        explain: "Dropping particles, contracting sounds, and using plain form — how people actually talk.",
        templates: ["{V}食べた？"] },
    ],
  },
  {
    id: "u3", title: "Special Expressions", jp: "特殊表現",
    lessons: [
      { id: "honorific", jp: "敬語", en: "Honorifics", url: "https://guidetojapanese.org/learn/grammar/honorific",
        explain: "Respectful and humble speech forms used for superiors, customers, and formal settings.",
        templates: [] },
      { id: "causative", jp: "使役・受身", en: "Causative & passive", url: "https://guidetojapanese.org/learn/grammar/causepass",
        explain: "Causative: making someone do something. Passive: something being done to you.",
        templates: ["{V}を食べさせる。"] },
      { id: "amounts", jp: "だけ・しか", en: "Amounts & extents", url: "https://guidetojapanese.org/learn/grammar/amount",
        explain: "だけ = only (positive). しか...ない = only (used with a negative verb).",
        templates: ["{V}だけ食べた。"] },
    ],
  },
];

export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons);

export function fillTemplate(template, masteredWords) {
  if (!template.includes("{V}")) return template;
  if (masteredWords.length === 0) return null;
  const word = masteredWords[Math.floor(Math.random() * masteredWords.length)];
  return template.replace("{V}", word.front);
}
