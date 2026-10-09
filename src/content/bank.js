// Small word bank used by generated sentences and by the "words in this lesson" lists.
// w = kanji part, k = its reading, ok = kana tail (see conjugation engine in lib/jp.js)

const P = (id, w, k, ok, en, be, was, third, extra = {}) => ({ id, pos: "person", w, k, ok, en, be, was, third, ...extra });
const N = (id, w, k, ok, en, oe, tags, extra = {}) => ({ id, pos: "noun", cls: "noun", w, k, ok, en, oe, the: "the " + en, tags, ...extra });
const V = (id, w, k, ok, cls, base, s, past, ing, obj, extra = {}) => ({ id, pos: "verb", w, k, ok, cls, en: { base, s, past, ing }, obj, ...extra });
const A = (id, w, k, ok, cls, en, sub) => ({ id, pos: cls === "nadj" ? "nadj" : "iadj", w, k, ok, cls, en, sub });

export const PEOPLE = [
  P("watashi", "私", "わたし", "", "I", "am", "was", false),
  P("anata", "", "", "あなた", "you", "are", "were", false),
  P("kare", "彼", "かれ", "", "he", "is", "was", true),
  P("kanojo", "彼女", "かのじょ", "", "she", "is", "was", true),
  P("tomodachi", "友達", "ともだち", "", "my friend", "is", "was", true, { role: "friend" }),
  P("sensei", "先生", "せんせい", "", "the teacher", "is", "was", true, { role: "teacher" }),
  P("tanaka", "田中", "たなか", "さん", "Tanaka", "is", "was", true),
];

export const NOUNS = [
  // roles
  N("gakusei", "学生", "がくせい", "", "student", "a student", ["role"]),
  N("isha", "医者", "いしゃ", "", "doctor", "a doctor", ["role"]),
  N("kaishain", "会社員", "かいしゃいん", "", "office worker", "an office worker", ["role"]),
  N("sensei-r", "先生", "せんせい", "", "teacher", "a teacher", ["role"]),
  // food and drink
  N("sakana", "魚", "さかな", "", "fish", "fish", ["food"]),
  N("niku", "肉", "にく", "", "meat", "meat", ["food"]),
  N("yasai", "野菜", "やさい", "", "vegetables", "vegetables", ["food"]),
  N("pan", "", "", "パン", "bread", "bread", ["food"]),
  N("ringo", "", "", "りんご", "apples", "apples", ["food"]),
  N("tamago", "卵", "たまご", "", "eggs", "eggs", ["food"]),
  N("sushi", "寿司", "すし", "", "sushi", "sushi", ["food"]),
  N("ramen", "", "", "ラーメン", "ramen", "ramen", ["food"]),
  N("gohan", "飯", "はん", "", "rice", "rice", ["food"], { pre: "ご" }),
  N("mizu", "水", "みず", "", "water", "water", ["drink"]),
  N("ocha", "茶", "ちゃ", "", "tea", "tea", ["drink"], { pre: "お" }),
  N("koohii", "", "", "コーヒー", "coffee", "coffee", ["drink"]),
  N("gyuunyuu", "牛乳", "ぎゅうにゅう", "", "milk", "milk", ["drink"]),
  // things
  N("hon", "本", "ほん", "", "book", "a book", ["read", "thing"]),
  N("shinbun", "新聞", "しんぶん", "", "newspaper", "a newspaper", ["read", "thing"]),
  N("tegami", "手紙", "てがみ", "", "letter", "a letter", ["read", "write", "thing"]),
  N("eiga", "映画", "えいが", "", "movie", "a movie", ["watch", "thing"]),
  N("ongaku", "音楽", "おんがく", "", "music", "music", ["listen", "thing"]),
  N("kuruma", "車", "くるま", "", "car", "a car", ["thing", "vehicle"]),
  N("inu", "犬", "いぬ", "", "dog", "dogs", ["animal"]),
  N("neko", "猫", "ねこ", "", "cat", "cats", ["animal"]),
  N("denwa", "電話", "でんわ", "", "phone", "a phone", ["thing"]),
  N("shukudai", "宿題", "しゅくだい", "", "homework", "homework", ["do"]),
  // places
  N("gakkou", "学校", "がっこう", "", "school", "school", ["place"], { to: "to school", at: "at school", the: "the school" }),
  N("ie", "家", "いえ", "", "house", "home", ["place"], { to: "home", at: "at home", the: "the house" }),
  N("eki", "駅", "えき", "", "station", "the station", ["place"], { to: "to the station", at: "at the station", the: "the station" }),
  N("mise", "店", "みせ", "", "store", "the store", ["place"], { to: "to the store", at: "at the store", the: "the store" }),
  N("toshokan", "図書館", "としょかん", "", "library", "the library", ["place"], { to: "to the library", at: "at the library", the: "the library" }),
  N("kaisha", "会社", "かいしゃ", "", "company", "the office", ["place"], { to: "to the office", at: "at the office", the: "the company" }),
  N("kouen", "公園", "こうえん", "", "park", "the park", ["place"], { to: "to the park", at: "at the park", the: "the park" }),
  N("nihon", "日本", "にほん", "", "Japan", "Japan", ["place"], { to: "to Japan", at: "in Japan", the: "Japan" }),
];

export const TIMES = [
  { id: "kyou", w: "今日", k: "きょう", ok: "", en: "today", tense: "present" },
  { id: "kinou", w: "昨日", k: "きのう", ok: "", en: "yesterday", tense: "past" },
  { id: "mainichi", w: "毎日", k: "まいにち", ok: "", en: "every day", tense: "present" },
  { id: "ashita", w: "明日", k: "あした", ok: "", en: "tomorrow", tense: "future" },
];

export const VERBS = [
  V("taberu", "食", "た", "べる", "ru", "eat", "eats", "ate", "eating", ["food"]),
  V("nomu", "飲", "の", "む", "u", "drink", "drinks", "drank", "drinking", ["drink"]),
  V("miru", "見", "み", "る", "ru", "watch", "watches", "watched", "watching", ["watch"]),
  V("yomu", "読", "よ", "む", "u", "read", "reads", "read", "reading", ["read"]),
  V("kau", "買", "か", "う", "u", "buy", "buys", "bought", "buying", ["food", "drink", "thing", "read"]),
  V("kiku", "聞", "き", "く", "u", "listen to", "listens to", "listened to", "listening to", ["listen"]),
  V("kaku", "書", "か", "く", "u", "write", "writes", "wrote", "writing", ["write"]),
  V("tsukuru", "作", "つく", "る", "u", "make", "makes", "made", "making", ["food"]),
  V("iku", "行", "い", "く", "iku", "go", "goes", "went", "going", [], { motion: true }),
  V("kuru", "来", "く", "る", "kuru", "come", "comes", "came", "coming", [], { motion: true }),
  V("kaeru", "帰", "かえ", "る", "u", "go back", "goes back", "went back", "going back", [], { motion: true }),
  V("okiru", "起", "お", "きる", "ru", "wake up", "wakes up", "woke up", "waking up", [], { intr: true }),
  V("neru", "寝", "ね", "る", "ru", "sleep", "sleeps", "slept", "sleeping", [], { intr: true }),
  V("matsu", "待", "ま", "つ", "u", "wait", "waits", "waited", "waiting", [], { intr: true }),
  V("hanasu", "話", "はな", "す", "u", "talk", "talks", "talked", "talking", [], { intr: true }),
  V("benkyou", "勉強", "べんきょう", "する", "suru", "study", "studies", "studied", "studying", [], { intr: true }),
  V("aru", "", "", "ある", "aru", "exist", "exists", "existed", "existing", [], { exist: "inanimate" }),
  V("iru", "", "", "いる", "ru", "exist", "exists", "existed", "existing", [], { exist: "animate" }),
];

export const ADJECTIVES = [
  A("ookii", "大", "おお", "きい", "iadj", "big", ["thing", "place", "animal"]),
  A("chiisai", "小", "ちい", "さい", "iadj", "small", ["thing", "place", "animal"]),
  A("takai", "高", "たか", "い", "iadj", "expensive", ["thing", "food", "vehicle"]),
  A("yasui", "安", "やす", "い", "iadj", "cheap", ["thing", "food", "vehicle"]),
  A("atarashii", "新", "あたら", "しい", "iadj", "new", ["thing", "vehicle"]),
  A("furui", "古", "ふる", "い", "iadj", "old", ["thing", "vehicle", "place"]),
  A("oishii", "美味", "おい", "しい", "iadj", "delicious", ["food", "drink"]),
  A("omoshiroi", "面白", "おもしろ", "い", "iadj", "interesting", ["thing", "watch", "read"]),
  A("tanoshii", "楽", "たの", "しい", "iadj", "fun", ["place", "watch"]),
  A("muzukashii", "難", "むずか", "しい", "iadj", "difficult", ["thing", "read"]),
  A("ii", "", "", "いい", "ii", "good", ["thing", "food", "drink", "place", "watch", "read"]),
  A("shizuka", "静", "しず", "か", "nadj", "quiet", ["place"]),
  A("kirei", "", "", "きれい", "nadj", "pretty", ["place", "thing"]),
  A("suki", "好", "す", "き", "nadj", "likable", []),
  A("kirai", "嫌", "きら", "い", "nadj", "disliked", []),
  A("yuumei", "有名", "ゆうめい", "", "nadj", "famous", ["place", "watch", "read"]),
  A("benri", "便利", "べんり", "", "nadj", "convenient", ["thing", "place", "vehicle"]),
  A("kantan", "簡単", "かんたん", "", "nadj", "easy", ["thing", "read", "do"]),
];

export const ALL = [...PEOPLE, ...NOUNS, ...VERBS, ...ADJECTIVES, ...TIMES.map((t) => ({ ...t, pos: "time" }))];
export const BY_ID = Object.fromEntries(ALL.map((x) => [x.id, x]));

/** Written form and reading of a bank word in dictionary form. */
export function surface(word) { return `${word.pre || ""}${word.w || ""}${word.ok || ""}`; }
export function reading(word) { return `${word.pre || ""}${word.k || ""}${word.ok || ""}`; }
export function markup(word) { return `${word.pre || ""}${word.w ? `${word.w}[${word.k}]` : ""}${word.ok || ""}`; }
