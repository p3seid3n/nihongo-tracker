// Unit 1: Foundations. Order and topics follow Tae Kim's Guide to Japanese Grammar,
// chapters 2 and 3 (guidetojapanese.org). Explanations and sentences are written for this app.
// Example format: [japanese with furigana markup (tokens split by |), English, optional note]
// A leading "=" marks a phrase (no full stop). A trailing * on a token marks a blank (cloze).

export const unit1 = [
  {
    id: "u1-writing", ref: "2.1", title: "How Japanese is written", jp: "ひらがな・カタカナ・漢字",
    blurb: "Three scripts, three jobs.",
    pages: [
      {
        h: "Three scripts in one sentence",
        p: [
          "Japanese mixes three writing systems. **Hiragana** writes grammar: particles and word endings. **Katakana** writes foreign words and emphasis. **Kanji** carries meaning: most nouns, verb stems and adjective stems.",
          "In a normal sentence you will see all three together. Learning to spot which is which already tells you a lot about the sentence.",
        ],
        ex: [
          ["私[わたし]|は|コーヒー|を|飲[の]みます", "I drink coffee.", "私 and 飲 are kanji, は・を・みます are hiragana, コーヒー is katakana."],
          ["友達[ともだち]|は|学校[がっこう]|へ|行[い]きます", "My friend goes to school."],
        ],
      },
      {
        h: "Why furigana matters here",
        p: [
          "Small hiragana above kanji are called **furigana**. This app shows them for kanji you have not learned yet and hides them for kanji you know. You can change that in Settings.",
          "Some kanji have several readings: 日本 is **にほん**, but 日 alone can be **ひ**. Learn kanji inside words, not alone.",
        ],
        ex: [["日本[にほん]|の|音楽[おんがく]", "Japanese music"]],
      },
    ],
    quiz: [
      ["Which script is used for foreign loanwords such as コーヒー?", "Katakana", "Hiragana", "Kanji", "~Katakana is used for words borrowed from other languages."],
      ["Which script writes grammar words like は and を?", "Hiragana", "Katakana", "Kanji", "~Particles and endings are written in hiragana."],
      ["What carries the core meaning of words like 学校[がっこう] (school)?", "Kanji", "Hiragana", "Katakana", "~Kanji carry the meaning of most nouns."],
      ["What are furigana?", "Small kana written above kanji to show the reading", "A type of verb ending", "A kind of particle", "~Furigana show you how to read a kanji."],
    ],
    vocab: [],
  },

  {
    id: "u1-desu", ref: "3.2", title: "Saying what something is", jp: "だ・です",
    blurb: "A is B: the most basic sentence.",
    pages: [
      {
        h: "Nouns and だ",
        p: [
          "To say that A is B, put B after A and finish with **だ**. Japanese has no word like English “is/am/are” that changes by person: だ stays the same for I, you, he and they.",
          "**です** is the polite version of だ. You will hear です everywhere when people speak to someone they don't know well. Both mean the same thing here.",
        ],
        ex: [
          ["私[わたし]|は|学生[がくせい]|だ", "I am a student."],
          ["彼[かれ]|は|医者[いしゃ]|だ", "He is a doctor."],
          ["田中[たなか]さん|は|先生[せんせい]|です", "Tanaka is a teacher."],
        ],
      },
      {
        h: "Negative and past",
        p: [
          "To say “is not”, swap だ for **じゃない**. For the past, use **だった**. The two stack: **じゃなかった** means “was not”.",
          "Polite forms: です → じゃありません (is not), でした (was), じゃありませんでした (was not).",
        ],
        table: {
          head: ["", "Plain", "Polite"],
          rows: [
            ["is", "学生[がくせい]だ", "学生[がくせい]です"],
            ["is not", "学生[がくせい]​じゃない", "学生[がくせい]​じゃ​ありません"],
            ["was", "学生[がくせい]だった", "学生[がくせい]でした"],
            ["was not", "学生[がくせい]​じゃなかった", "学生[がくせい]​じゃ​ありません​でした"],
          ],
        },
        ex: [
          ["私[わたし]|は|学生[がくせい]|じゃない", "I am not a student."],
          ["彼女[かのじょ]|は|先生[せんせい]|だった", "She was a teacher."],
          ["友達[ともだち]|は|医者[いしゃ]|じゃなかった", "My friend was not a doctor."],
          ["彼[かれ]|は|会社員[かいしゃいん]|でした", "He was an office worker."],
        ],
      },
    ],
    cloze: [
      ["私[わたし]|は|学生[がくせい]|だった*", "I was a student.", "Past tense of だ", "だ,じゃない,だった,じゃなかった"],
      ["彼[かれ]|は|医者[いしゃ]|じゃない*", "He is not a doctor.", "Negative: じゃない", "だ,じゃない,だった,じゃなかった"],
      ["彼女[かのじょ]|は|先生[せんせい]|じゃなかった*", "She was not a teacher.", "Negative + past: じゃなかった", "だ,じゃない,だった,じゃなかった"],
      ["私[わたし]|は|会社員[かいしゃいん]|じゃありません*", "I am not an office worker.", "Polite negative", "です,でした,じゃありません,じゃありませんでした"],
    ],
    spot: [
      ["私[わたし]は学生[がくせい]じゃない", "私[わたし]は学生[がくせい]ない", "~Negative of だ is じゃない. ない alone can't follow a noun."],
      ["彼[かれ]は医者[いしゃ]だった", "彼[かれ]は医者[いしゃ]じゃった", "~Past of だ is だった."],
    ],
    gens: ["wa-desu:plain:aff,neg,past,pastneg", "wa-desu:polite:aff,neg,past,pastneg"],
    vocab: ["watashi", "kare", "kanojo", "tomodachi", "gakusei", "isha", "kaishain", "sensei-r"],
    pool: ["だ", "じゃない", "だった", "じゃなかった"],
  },

  {
    id: "u1-wa", ref: "3.3", title: "The topic marker は", jp: "は・も",
    blurb: "“As for …” and “also”.",
    pages: [
      {
        h: "は sets the topic",
        p: [
          "Particles are small words that stick to the end of a word and tell you its role. **は** (written は, pronounced “wa”) marks the **topic**: what the sentence is about. Think “as for …”.",
          "Everything after the topic is a comment about it. Japanese sentences are mostly: topic は comment.",
        ],
        ex: [
          ["私[わたし]|は|学生[がくせい]|です", "I am a student."],
          ["田中[たなか]さん|は|医者[いしゃ]|です", "Tanaka is a doctor."],
          ["友達[ともだち]|は|先生[せんせい]|じゃない", "My friend is not a teacher."],
        ],
      },
      {
        h: "も means “also”",
        p: [
          "To say the same thing is true for another topic, replace は with **も**. It adds the idea of “too / also”, and in a negative sentence “either”.",
        ],
        ex: [
          ["田中[たなか]さん|も|学生[がくせい]|です", "Tanaka is also a student."],
          ["彼女[かのじょ]|も|医者[いしゃ]|じゃありません", "She is not a doctor either."],
        ],
      },
      {
        h: "Dropping the topic",
        p: [
          "When the topic is obvious from context, Japanese leaves it out. A sentence like 学生です can mean “I am a student” or “She is a student”, depending on what was just talked about.",
        ],
        ex: [["学生[がくせい]|です", "(I/he/she) is a student.", "The topic is understood from context."]],
      },
    ],
    cloze: [
      ["私[わたし]|は*|学生[がくせい]|です", "As for me, I am a student.", "は marks the topic.", "は,も,が,を"],
      ["田中[たなか]さん|も*|学生[がくせい]|です", "Tanaka is a student too.", "も = also; it replaces は.", "は,も,が,を"],
      ["彼女[かのじょ]|は*|医者[いしゃ]|じゃない", "She is not a doctor.", "The topic of the sentence takes は.", "は,も,に,で"],
    ],
    spot: [["私[わたし]は学生[がくせい]です", "私[わたし]を学生[がくせい]です", "私[わたし]に学生[がくせい]です", "~は marks the topic; を and に have other jobs."]],
    gens: ["wa-desu:polite:aff,neg"],
    vocab: ["watashi", "tomodachi", "tanaka"],
    pool: ["は", "も", "が", "を", "に"],
  },

  {
    id: "u1-ga", ref: "3.3.4", title: "The identifier が", jp: "が",
    blurb: "Pointing out “which one”.",
    pages: [
      {
        h: "が answers a silent question",
        p: [
          "**が** identifies something. It picks one thing out of many and says “this is the one”. A good way to think of it: が always answers a question, spoken or not.",
          "That is why question words like 誰 (who) and 何 (what) always take が, never は. The topic has to be something known; a question word is exactly what is unknown.",
        ],
        ex: [
          ["誰[だれ]|が|学生[がくせい]|ですか", "Who is the student?"],
          ["田中[たなか]さん|が|学生[がくせい]|です", "Tanaka is the student.", "The answer to “who?”"],
        ],
      },
      {
        h: "は or が?",
        p: [
          "は: “Speaking of X, …”. X is already on the table. が: “X is the one that …”. X is new information or the answer.",
          "Both sentences below translate the same way into English, but they answer different questions.",
        ],
        ex: [
          ["私[わたし]|は|学生[がくせい]|です", "As for me, I am a student."],
          ["私[わたし]|が|学生[がくせい]|です", "I am the one who is a student.", "Answers “Who is the student?”"],
        ],
      },
      {
        h: "が with likes and wants",
        p: ["Some words, like 好き (likable), mark the thing liked with が, not を. “I like dogs” is literally “as for me, dogs are likable”."],
        ex: [["私[わたし]|は|犬[いぬ]|が|好[す]き|です", "I like dogs."]],
      },
    ],
    cloze: [
      ["誰[だれ]|が*|学生[がくせい]|ですか", "Who is the student?", "Question words take が.", "は,が,も,を"],
      ["田中[たなか]さん|が*|学生[がくせい]|です", "Tanaka is the student.", "Answering “who?” uses が.", "は,が,も,を"],
      ["私[わたし]|は|猫[ねこ]|が*|好[す]き|です", "I like cats.", "The thing you like takes が.", "は,が,を,に"],
    ],
    quiz: [["Which particle follows the question word 誰[だれ] (who) when it is the thing being asked about?", "が", "は", "を", "~Question words are never the topic, so they take が."]],
    gens: ["like:polite:aff,neg"],
    vocab: ["inu", "neko", "suki"],
    pool: ["は", "が", "も", "を", "に"],
  },

  {
    id: "u1-na-adj", ref: "3.4.2", title: "Na-adjectives", jp: "な形容詞",
    blurb: "Adjectives that behave like nouns.",
    pages: [
      {
        h: "Adjectives that work like nouns",
        p: [
          "Japanese has two kinds of adjectives. **Na-adjectives** act like nouns: 静か (quiet), きれい (pretty, clean), 親切 (kind), 好き (likable). They take だ/です and conjugate exactly like the nouns you already know.",
        ],
        ex: [
          ["友達[ともだち]|は|親切[しんせつ]|だ", "My friend is kind."],
          ["この|町[まち]|は|静[しず]か|です", "This town is quiet."],
          ["東京[とうきょう]|は|有名[ゆうめい]|です", "Tokyo is famous."],
        ],
      },
      {
        h: "Before a noun: add な",
        p: ["To describe a noun directly, put **な** between the adjective and the noun. That's where the name comes from."],
        ex: [
          ["=静[しず]か|な|人[ひと]", "a quiet person"],
          ["=きれい|な|部屋[へや]", "a clean room"],
          ["=親切[しんせつ]|な|友達[ともだち]", "a kind friend"],
        ],
      },
      {
        h: "Conjugation is the same as nouns",
        p: ["だ → じゃない (not) → だった (was) → じゃなかった (was not), just as before."],
        table: { head: ["", "Plain"], rows: [["is", "好[す]きだ"], ["is not", "好[す]きじゃない"], ["was", "好[す]きだった"], ["was not", "好[す]きじゃなかった"]] },
        ex: [
          ["彼[かれ]|は|野菜[やさい]|が|好[す]き|じゃない", "He doesn't like vegetables."],
          ["昨日[きのう]|は|静[しず]か|だった", "Yesterday was quiet."],
        ],
      },
    ],
    cloze: [
      ["=静[しず]か|な*|人[ひと]", "a quiet person", "Na-adjective + な + noun", "な,の,に,で"],
      ["=きれい|な*|部屋[へや]", "a clean room", "Na-adjective + な + noun", "な,の,に,で"],
      ["この|町[まち]|は|静[しず]か|じゃない*", "This town is not quiet.", "Negative: じゃない", "だ,じゃない,だった,じゃなかった"],
    ],
    conj: [{ pos: "nadj", form: "neg", n: 1 }, { pos: "nadj", form: "past", n: 1 }, { pos: "nadj", form: "mod", n: 1 }],
    gens: ["adj-desu:plain:aff,neg,past,pastneg:na", "like:plain:aff,neg,past"],
    vocab: ["shizuka", "kirei", "yuumei", "benri", "kantan", "suki", "kirai"],
    pool: ["だ", "じゃない", "だった", "な", "の"],
  },

  {
    id: "u1-i-adj", ref: "3.4.3", title: "I-adjectives", jp: "い形容詞",
    blurb: "Adjectives that end in い and conjugate themselves.",
    pages: [
      {
        h: "I-adjectives end in い",
        p: [
          "I-adjectives such as 大きい (big), 高い (expensive), 美味しい (delicious) end in い. In plain speech they are already a full sentence: 大きい means “is big”. No だ needed.",
          "In polite speech add です: 大きいです.",
        ],
        ex: [
          ["この|車[くるま]|は|大[おお]きい", "This car is big."],
          ["魚[さかな]|は|美味[おい]しい", "Fish is delicious."],
          ["=大[おお]きい|犬[いぬ]", "a big dog"],
        ],
      },
      {
        h: "Conjugating by changing い",
        p: ["Drop the final い and add an ending: **くない** (not), **かった** (was), **くなかった** (was not)."],
        table: {
          head: ["", "Plain"],
          rows: [["is", "大[おお]きい"], ["is not", "大[おお]きくない"], ["was", "大[おお]きかった"], ["was not", "大[おお]きくなかった"]],
        },
        ex: [
          ["この|本[ほん]|は|面白[おもしろ]くない", "This book is not interesting."],
          ["映画[えいが]|は|面白[おもしろ]かった", "The movie was interesting."],
          ["昨日[きのう]|は|忙[いそが]しくなかった", "Yesterday I wasn't busy."],
        ],
      },
      {
        h: "いい is irregular",
        p: [
          "いい (good) conjugates as if it were **よい**: よくない, よかった, よくなかった. Same for anything built on it, like かっこいい (cool).",
          "Watch out: きれい and 嫌い end in い but are na-adjectives. 嫌いじゃない, not 嫌くない.",
        ],
        ex: [
          ["天気[てんき]|は|よくない", "The weather is not good."],
          ["昨日[きのう]|は|よかった", "Yesterday was good."],
          ["彼[かれ]|は|かっこよかった", "He was cool."],
        ],
      },
    ],
    cloze: [
      ["この|本[ほん]|は|面白[おもしろ]くない*", "This book is not interesting.", "い → くない", "面白[おもしろ]い,面白[おもしろ]くない,面白[おもしろ]かった,面白[おもしろ]くなかった"],
      ["映画[えいが]|は|面白[おもしろ]かった*", "The movie was interesting.", "い → かった", "面白[おもしろ]い,面白[おもしろ]くない,面白[おもしろ]かった,面白[おもしろ]くなかった"],
      ["天気[てんき]|は|よくない*", "The weather is not good.", "いい → よくない", "いくない,よくない,いかった,よかった"],
    ],
    spot: [
      ["大[おお]きくない", "大[おお]きいじゃない", "~i-adjectives don't use じゃない; change い to くない."],
      ["昨日[きのう]は忙[いそが]しかった", "昨日[きのう]は忙[いそが]しいだった", "~Past of an i-adjective: drop い, add かった."],
    ],
    conj: [{ pos: "iadj", form: "neg", n: 2 }, { pos: "iadj", form: "past", n: 1 }, { pos: "iadj", form: "past-neg", n: 1 }],
    gens: ["adj-desu:plain:aff,neg,past,pastneg:i", "adj-desu:polite:aff,neg,past,pastneg:i"],
    vocab: ["ookii", "chiisai", "takai", "yasui", "atarashii", "furui", "oishii", "omoshiroi", "ii"],
    pool: ["く", "かった", "くない", "い"],
  },

  {
    id: "u1-verbs", ref: "3.5", title: "Verb basics", jp: "る動詞・う動詞",
    blurb: "Two verb families and where verbs go.",
    pages: [
      {
        h: "Verbs come last",
        p: [
          "In a Japanese sentence the verb comes at the **end**. Dictionary form ends in an う-row sound (る, う, く, ぐ, す, つ, ぬ, ぶ, む) and doubles as the plain present/future: 食べる is both “eat” and “will eat”.",
        ],
        ex: [
          ["私[わたし]|は|毎日[まいにち]|魚[さかな]|を|食[た]べる", "I eat fish every day."],
          ["彼[かれ]|は|本[ほん]|を|読[よ]む", "He reads a book."],
          ["友達[ともだち]|は|学校[がっこう]|へ|行[い]く", "My friend goes to school."],
        ],
      },
      {
        h: "Ru-verbs and u-verbs",
        p: [
          "**Ru-verbs** end in る with an い- or え-sound before it: 食べる, 見る, 起きる, 寝る. To conjugate, drop る.",
          "**U-verbs** are everything else: 飲む, 書く, 話す, 買う, 待つ. To conjugate, change the last sound.",
          "A few verbs end in -iru/-eru but are still u-verbs and must be memorised: 帰る (go home), 入る (enter), 知る (know), 走る (run), 切る (cut). Irregular: **する** (do) and **来る** (come).",
        ],
        ex: [["私[わたし]|は|家[いえ]|へ|帰[かえ]る", "I go home.", "帰る looks like a ru-verb but is an u-verb."]],
      },
      {
        h: "ある and いる",
        p: ["Both mean “exist”. Use **いる** (a ru-verb) for living things: people and animals. Use **ある** (an u-verb) for everything else."],
        ex: [
          ["犬[いぬ]|が|いる", "There is a dog."],
          ["本[ほん]|が|ある", "There is a book."],
        ],
      },
    ],
    quiz: [
      ["Which of these is a ru-verb?", "食[た]べる", "飲[の]む", "話[はな]す", "書[か]く", "~Ru-verbs end in る after an え- or い-sound: 食べる."],
      ["Which verb ends in る but is an u-verb?", "帰[かえ]る", "食[た]べる", "見[み]る", "寝[ね]る", "~帰る (to go home) is a famous exception."],
      ["Which verb would you use for “there is a cat”?", "いる", "ある", "~猫 is a living thing, so いる."],
      ["Where does the verb go in a Japanese sentence?", "At the end", "Right after the subject", "Before the object", "~Japanese is verb-final."],
    ],
    gens: ["obj-verb:plain:aff", "exist:plain:aff"],
    vocab: ["taberu", "nomu", "miru", "yomu", "kau", "iku", "kuru", "aru", "iru"],
  },

  {
    id: "u1-neg", ref: "3.6", title: "Negative verbs", jp: "〜ない",
    blurb: "Saying you don't do something.",
    pages: [
      {
        h: "Ru-verbs: drop る, add ない",
        p: ["食べる → 食べ**ない**. 見る → 見**ない**. Nothing else changes."],
        ex: [
          ["私[わたし]|は|魚[さかな]|を|食[た]べない", "I don't eat fish."],
          ["彼女[かのじょ]|は|テレビ|を|見[み]ない", "She doesn't watch TV."],
        ],
      },
      {
        h: "U-verbs: the last sound moves to the あ-row",
        p: ["飲む → 飲ま**ない**. 書く → 書か**ない**. 話す → 話さ**ない**. The one irregular case is verbs ending in **う**: they use **わ**, not あ: 買う → 買**わ**ない."],
        table: {
          head: ["Ending", "Example", "Negative"],
          rows: [["う", "買[か]う", "買[か]わない"], ["く", "書[か]く", "書[か]かない"], ["す", "話[はな]す", "話[はな]さない"], ["む", "飲[の]む", "飲[の]まない"], ["る", "帰[かえ]る", "帰[かえ]らない"]],
        },
        ex: [
          ["彼[かれ]|は|水[みず]|を|飲[の]まない", "He doesn't drink water."],
          ["友達[ともだち]|は|学校[がっこう]|へ|行[い]かない", "My friend doesn't go to school."],
          ["私[わたし]|は|何[なに]も|買[か]わない", "I don't buy anything."],
        ],
      },
      {
        h: "Irregulars",
        p: ["する → **しない**. 来る → **来ない** (こない). ある → **ない**: “there isn't” is simply ない, with no ある left."],
        ex: [
          ["明日[あした]|は|来[こ]ない", "(He/she) isn't coming tomorrow."],
          ["本[ほん]|は|ない", "There is no book."],
          ["宿題[しゅくだい]|を|しない", "I don't do my homework."],
        ],
      },
    ],
    cloze: [
      ["私[わたし]|は|魚[さかな]|を|食[た]べない*", "I don't eat fish.", "Ru-verb: drop る, add ない", "食[た]べない,食[た]べるない,食[た]べらない,食[た]べなる"],
      ["彼[かれ]|は|水[みず]|を|飲[の]まない*", "He doesn't drink water.", "U-verb: む → ま + ない", "飲[の]まない,飲[の]みない,飲[の]むない,飲[の]もない"],
    ],
    conj: [{ pos: "verbRu", form: "neg", n: 2 }, { pos: "verbU", form: "neg", n: 3 }, { pos: "verb", form: "neg", n: 1 }],
    gens: ["obj-verb:plain:neg,aff", "go-to:plain:neg,aff"],
    spot: [
      ["彼[かれ]は水[みず]を飲[の]まない", "彼[かれ]は水[みず]を飲[の]みない", "~U-verbs change the last sound to the あ-row: 飲む → 飲まない."],
      ["私[わたし]は何[なに]も買[か]わない", "私[わたし]は何[なに]も買[か]あない", "~う-verbs use わ: 買わない."],
    ],
    vocab: ["taberu", "nomu", "miru", "kau", "iku", "kuru"],
  },

  {
    id: "u1-past", ref: "3.7", title: "Past tense", jp: "〜た",
    blurb: "What you did.",
    pages: [
      {
        h: "Ru-verbs: drop る, add た",
        p: ["食べる → 食べ**た**. 見る → 見**た**."],
        ex: [["昨日[きのう]|私[わたし]|は|映画[えいが]|を|見[み]た", "Yesterday I watched a movie."]],
      },
      {
        h: "U-verbs: the ending decides",
        p: ["The last sound changes in a pattern you can learn as a group:"],
        table: {
          head: ["Ending", "Becomes", "Example"],
          rows: [
            ["う・つ・る", "った", "買[か]う → 買[か]った"],
            ["む・ぶ・ぬ", "んだ", "飲[の]む → 飲[の]んだ"],
            ["く", "いた", "書[か]く → 書[か]いた"],
            ["ぐ", "いだ", "泳[およ]ぐ → 泳[およ]いだ"],
            ["す", "した", "話[はな]す → 話[はな]した"],
          ],
        },
        ex: [
          ["彼[かれ]|は|水[みず]|を|飲[の]んだ", "He drank water."],
          ["私[わたし]|は|手紙[てがみ]|を|書[か]いた", "I wrote a letter."],
          ["友達[ともだち]|は|図書館[としょかん]|へ|行[い]った", "My friend went to the library.", "行く is an exception: 行った, not 行いた."],
        ],
      },
      {
        h: "Negative past and irregulars",
        p: ["Take the negative (…ない) and change the ない to **なかった**. する → した. 来る → 来た (きた)."],
        ex: [
          ["私[わたし]|は|宿題[しゅくだい]|を|しなかった", "I didn't do my homework."],
          ["彼女[かのじょ]|は|来[こ]なかった", "She didn't come."],
          ["彼女[かのじょ]|は|来[き]た", "She came."],
        ],
      },
    ],
    conj: [{ pos: "verbRu", form: "past", n: 1 }, { pos: "verbU", form: "past", n: 3 }, { pos: "verb", form: "past-neg", n: 2 }],
    gens: ["obj-verb:plain:past,pastneg", "go-to:plain:past,pastneg", "at-place:plain:past"],
    spot: [
      ["彼[かれ]は水[みず]を飲[の]んだ", "彼[かれ]は水[みず]を飲[の]った", "~む-verbs end in んだ in the past."],
      ["友達[ともだち]は学校[がっこう]へ行[い]った", "友達[ともだち]は学校[がっこう]へ行[い]いた", "~行く is the one く-verb that doesn't use いた."],
    ],
    vocab: ["taberu", "nomu", "miru", "kaku", "iku", "hanasu", "matsu"],
  },

  {
    id: "u1-wo", ref: "3.8.1", title: "The object marker を", jp: "を",
    blurb: "Marking what the action is done to.",
    pages: [
      {
        h: "を marks the direct object",
        p: [
          "**を** (pronounced “o”) marks the thing a verb acts on: what you eat, read, watch, buy. Put it directly after the object.",
          "Only transitive verbs (ones that act on something) take を.",
        ],
        ex: [
          ["私[わたし]|は|パン|を|食[た]べる", "I eat bread."],
          ["彼[かれ]|は|新聞[しんぶん]|を|読[よ]む", "He reads the newspaper."],
          ["田中[たなか]さん|は|映画[えいが]|を|見[み]た", "Tanaka watched a movie."],
        ],
      },
      {
        h: "Objects can come first",
        p: [
          "The verb must be last, but the other parts can move around because the particles tell you who is who. The usual order is: topic, time, place, object, verb.",
          "When you drop the topic and the object is obvious, you can also drop を in casual speech. Keep it for now.",
        ],
        ex: [
          ["私[わたし]|は|毎日[まいにち]|コーヒー|を|飲[の]む", "I drink coffee every day."],
          ["コーヒー|を|私[わたし]|は|毎日[まいにち]|飲[の]む", "I drink coffee every day.", "Same meaning, object moved to the front for emphasis."],
        ],
      },
    ],
    cloze: [
      ["私[わたし]|は|パン|を*|食[た]べる", "I eat bread.", "を marks what is eaten.", "は,が,を,に"],
      ["彼[かれ]|は|新聞[しんぶん]|を*|読[よ]む", "He reads the newspaper.", "を marks what is read.", "は,が,を,で"],
      ["友達[ともだち]|は|手紙[てがみ]|を*|書[か]いた", "My friend wrote a letter.", "を marks what is written.", "は,が,を,に"],
    ],
    gens: ["obj-verb:plain:aff,neg,past,pastneg", "obj-verb:polite:aff,neg,past,pastneg"],
    vocab: ["pan", "sakana", "niku", "hon", "shinbun", "tegami", "eiga", "ongaku"],
    pool: ["は", "が", "を", "に", "で"],
  },

  {
    id: "u1-ni-de", ref: "3.8.2", title: "Where and when: に・へ・で", jp: "に・へ・で",
    blurb: "Targets, directions and places of action.",
    pages: [
      {
        h: "に: target, time and existence",
        p: [
          "**に** marks a target: the place you go to, the person you meet, the time something happens, or the place where something exists.",
        ],
        ex: [
          ["私[わたし]|は|七時[しちじ]|に|起[お]きる", "I wake up at seven."],
          ["友達[ともだち]|に|会[あ]う", "I meet a friend."],
          ["学校[がっこう]|に|行[い]く", "I go to school."],
          ["公園[こうえん]|に|犬[いぬ]|が|いる", "There is a dog in the park."],
        ],
      },
      {
        h: "へ: direction",
        p: ["**へ** (pronounced “e” here) means “toward”. With verbs of motion it can replace に for places: 学校へ行く."],
        ex: [["私[わたし]|は|日本[にほん]|へ|行[い]く", "I'm going to Japan."]],
      },
      {
        h: "で: where an action happens, and how",
        p: [
          "**で** marks the setting of an action: the place where it takes place, or the tool or means used.",
          "Compare: 図書館に本がある (a book **exists** at the library, に) vs 図書館で本を読む (I **read** at the library, で).",
        ],
        ex: [
          ["図書館[としょかん]|で|本[ほん]|を|読[よ]む", "I read a book at the library."],
          ["バス|で|行[い]く", "I go by bus."],
          ["箸[はし]|で|食[た]べる", "I eat with chopsticks."],
        ],
      },
    ],
    cloze: [
      ["図書館[としょかん]|で*|本[ほん]|を|読[よ]む", "I read a book at the library.", "Place where an action happens takes で.", "に,で,へ,を"],
      ["図書館[としょかん]|に*|本[ほん]|が|ある", "There is a book in the library.", "Existence takes に.", "に,で,へ,を"],
      ["私[わたし]|は|七時[しちじ]|に*|起[お]きる", "I wake up at seven.", "A specific time takes に.", "に,で,へ,を"],
      ["バス|で*|行[い]く", "I go by bus.", "Means of transport takes で.", "に,で,を,と"],
    ],
    spot: [["図書館[としょかん]で本[ほん]を読[よ]む", "図書館[としょかん]に本[ほん]を読[よ]む", "~Actions happen at a place with で."]],
    gens: ["go-to:plain", "at-place:plain", "exist:plain"],
    vocab: ["gakkou", "eki", "mise", "toshokan", "kouen", "ie", "nihon", "kaisha"],
    pool: ["に", "で", "へ", "を", "が"],
  },

  {
    id: "u1-trans", ref: "3.9", title: "Transitive and intransitive verbs", jp: "他動詞・自動詞",
    blurb: "Verbs that act on things, and verbs that just happen.",
    pages: [
      {
        h: "Two verbs for one event",
        p: [
          "English often uses the same verb for “I open the door” and “the door opens”. Japanese uses two different verbs: a **transitive** one (somebody does it) and an **intransitive** one (it happens by itself).",
          "The particle tells you which: transitive verbs take **を**, intransitive verbs usually take **が** for the thing that changes.",
        ],
        table: {
          head: ["Meaning", "Transitive (を)", "Intransitive (が)"],
          rows: [["open", "開[あ]ける", "開[あ]く"], ["close", "閉[し]める", "閉[し]まる"], ["turn on", "つける", "つく"], ["turn off", "消[け]す", "消[き]える"]],
        },
        ex: [
          ["ドア|を|開[あ]ける", "I open the door."],
          ["ドア|が|開[あ]く", "The door opens."],
          ["電気[でんき]|を|つける", "I turn on the light."],
          ["電気[でんき]|が|つく", "The light comes on."],
          ["窓[まど]|を|閉[し]める", "I close the window."],
          ["窓[まど]|が|閉[し]まる", "The window closes."],
        ],
      },
    ],
    cloze: [
      ["ドア|を*|開[あ]ける", "I open the door.", "Transitive: someone acts on the door.", "を,が,に,は"],
      ["ドア|が*|開[あ]く", "The door opens.", "Intransitive: it happens by itself.", "を,が,に,は"],
      ["電気[でんき]|が*|つく", "The light comes on.", "Intransitive: the light changes by itself.", "を,が,に,は"],
    ],
    quiz: [["Which particle goes with a transitive verb like 開[あ]ける?", "を", "が", "に", "~Transitive verbs act on a direct object: ドアを開ける."]],
    vocab: [],
  },

  {
    id: "u1-relative", ref: "3.10", title: "Describing nouns with verbs", jp: "連体修飾",
    blurb: "“The book I bought yesterday.”",
    pages: [
      {
        h: "Put the description before the noun",
        p: [
          "In English you add a relative clause after the noun: “the book **that I bought**”. In Japanese the whole clause goes **in front** of the noun, in plain form. No “that” or “which” is needed.",
        ],
        ex: [
          ["=魚[さかな]|を|食[た]べる|人[ひと]", "a person who eats fish"],
          ["=昨日[きのう]|買[か]った|本[ほん]", "the book I bought yesterday"],
          ["=友達[ともだち]|が|書[か]いた|手紙[てがみ]", "the letter my friend wrote"],
        ],
      },
      {
        h: "Whole sentences with clauses",
        p: ["The clause plus the noun form one big noun phrase, which fills a slot in the main sentence like any other noun."],
        ex: [
          ["昨日[きのう]|買[か]った|本[ほん]|は|面白[おもしろ]い", "The book I bought yesterday is interesting."],
          ["私[わたし]|は|友達[ともだち]|が|書[か]いた|手紙[てがみ]|を|読[よ]んだ", "I read the letter my friend wrote."],
        ],
      },
      {
        h: "Sentence order",
        p: ["The verb ends the sentence; the rest is flexible, because particles label each piece. A natural default: **time, topic, place, object, verb.**"],
        ex: [["私[わたし]|は|昨日[きのう]|図書館[としょかん]|で|本[ほん]|を|読[よ]んだ", "Yesterday I read a book at the library."]],
      },
    ],
    quiz: [["Where does the description go in 昨日[きのう]買[か]った本[ほん]?", "Before the noun 本[ほん]", "After the noun 本[ほん]", "In the middle of 本[ほん]", "~Japanese relative clauses always come before the noun they describe."]],
    gens: ["obj-verb:plain:past"],
    vocab: [],
  },

  {
    id: "u1-noun-particles", ref: "3.11", title: "と, や and の", jp: "と・や・の",
    blurb: "Linking nouns: and, with, of.",
    pages: [
      {
        h: "と: and, and with",
        p: ["**と** joins nouns completely: A と B means exactly A and B. It also means “with” a companion."],
        ex: [
          ["私[わたし]|と|友達[ともだち]|は|学生[がくせい]|です", "My friend and I are students."],
          ["友達[ともだち]|と|映画[えいが]|を|見[み]る", "I watch a movie with a friend."],
        ],
      },
      {
        h: "や: and so on",
        p: ["**や** lists examples and implies there is more: A や B (and others). **とか** is a casual version."],
        ex: [["りんご|や|パン|を|買[か]った", "I bought apples, bread and such."]],
      },
      {
        h: "の: of",
        p: ["**の** links two nouns, the first describing the second: possession, type or origin. It can also stand in for a noun you've already mentioned."],
        ex: [
          ["=私[わたし]|の|本[ほん]", "my book"],
          ["=日本語[にほんご]|の|先生[せんせい]", "a Japanese teacher"],
          ["これ|は|田中[たなか]さん|の|です", "This is Tanaka's."],
        ],
      },
    ],
    cloze: [
      ["私[わたし]|と*|友達[ともだち]|は|学生[がくせい]|です", "My friend and I are students.", "と = and (complete list)", "と,や,の,も"],
      ["りんご|や*|パン|を|買[か]った", "I bought apples, bread and such.", "や = and so on", "と,や,の,に"],
      ["=私[わたし]|の*|本[ほん]", "my book", "の links owner and thing", "と,や,の,を"],
      ["友達[ともだち]|と*|映画[えいが]|を|見[み]る", "I watch a movie with a friend.", "と also means “with”", "と,や,の,に"],
    ],
    gens: ["obj-verb:polite"],
    vocab: [],
    pool: ["と", "や", "の", "も", "に"],
  },

  {
    id: "u1-no", ref: "3.11.5", title: "の and んです as explanation", jp: "の・んです",
    blurb: "Explaining and asking gently.",
    pages: [
      {
        h: "の turns a sentence into an explanation",
        p: [
          "Adding **の** (casual) or **んです** (polite) to the end of a sentence gives it an explanatory tone: “it's that …”. In questions it softly asks for the reason.",
          "Attach it to the plain form of the sentence. After nouns and na-adjectives use **な**: 学生**な**んです.",
        ],
        ex: [
          ["どうして|行[い]かない|の", "Why aren't you going?"],
          ["明日[あした]|は|忙[いそが]しい|んです", "It's that I'm busy tomorrow."],
          ["彼[かれ]|は|学生[がくせい]|な|んです", "He is a student, you see."],
          ["何[なに]|を|食[た]べる|の", "What are you going to eat?"],
        ],
      },
    ],
    cloze: [
      ["どうして|行[い]かない|の*", "Why aren't you going?", "の at the end asks for an explanation.", "の,よ,ね,か"],
      ["彼[かれ]|は|学生[がくせい]|な*|んです", "He is a student, you see.", "Noun + な + んです", "な,だ,の,で"],
    ],
    vocab: [],
  },

  {
    id: "u1-adverbs", ref: "3.12", title: "Adverbs, ね and よ", jp: "副詞・ね・よ",
    blurb: "How things happen, and checking in.",
    pages: [
      {
        h: "Turning adjectives into adverbs",
        p: ["I-adjective: replace い with **く**. Na-adjective: add **に**. Some adverbs, such as とても (very) and ゆっくり (slowly), are already adverbs."],
        ex: [
          ["=早[はや]く|起[お]きる", "wake up early"],
          ["=静[しず]かに|話[はな]す", "speak quietly"],
          ["これ|は|とても|美味[おい]しい", "This is very delicious."],
          ["=ゆっくり|食[た]べる", "eat slowly"],
        ],
      },
      {
        h: "ね and よ",
        p: [
          "Two small words at the end of a sentence do a lot of social work. **ね** seeks agreement: “…, right?” **よ** adds information the listener may not know: “…, I tell you!”. Together, **よね**: “…, don't you think?”",
        ],
        ex: [
          ["いい|天気[てんき]|です|ね", "Nice weather, isn't it?"],
          ["これ|は|美味[おい]しい|です|よ", "This is delicious, I tell you!"],
          ["そう|です|ね", "That's right, isn't it."],
        ],
      },
    ],
    cloze: [
      ["いい|天気[てんき]|です|ね*", "Nice weather, isn't it?", "ね asks for agreement.", "ね,よ,か,の"],
      ["これ|は|美味[おい]しい|です|よ*", "This is delicious, I tell you!", "よ gives new information.", "ね,よ,か,の"],
      ["=早[はや]く*|起[お]きる", "wake up early", "I-adjective → adverb: い → く", "早[はや]く,早[はや]い,早[はや]に,早[はや]で"],
    ],
    vocab: [],
  },
];
