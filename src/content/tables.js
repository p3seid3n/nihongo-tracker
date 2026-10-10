// Extra reference tables for the lessons, keyed by lesson id and page heading (`h`).
// A table is { cap, head, rows, hl?, note? }. Cells use the same markup as lesson text:
// 食[た]べる for furigana, **bold** for the part that changes, and "\n" for a second, smaller line.
// `hl` is the index of a column to tint. tests/lessons.test.js checks that every key matches a real page.

export const EXTRA_TABLES = {
  "u1-writing": {
    "Three scripts in one sentence": [{
      cap: "The three scripts at a glance",
      head: ["Script", "Used for", "Examples"],
      rows: [
        ["Hiragana", "Grammar: particles, endings, words without kanji", "は・を・です"],
        ["Katakana", "Foreign words, names, sounds, emphasis", "コーヒー・テレビ・アメリカ"],
        ["Kanji", "The core meaning of most nouns, verbs and adjectives", "学校[がっこう]・食[た]べる・大[おお]きい"],
      ],
    }],
  },
  "u1-ga": {
    "は or が?": [{
      cap: "Same words, different question being answered",
      head: ["", "は", "が"],
      rows: [
        ["Marks", "the topic: “as for …”", "the subject you point out"],
        ["Answers", "What about X?", "Who or what is it?"],
        ["Stress falls on", "what comes after it", "the word before が"],
        ["Question words", "not normally with 誰・何", "誰[だれ]が・何[なに]が"],
        ["Example", "田中[たなか]さん**は**先生[せんせい]です。\nAs for Tanaka, he is a teacher.", "田中[たなか]さん**が**先生[せんせい]です。\nTanaka is the teacher (not someone else)."],
      ],
    }],
  },
  "u1-na-adj": {
    "Conjugation is the same as nouns": [{
      cap: "I-adjective or na-adjective?",
      head: ["", "I-adjective", "Na-adjective"],
      rows: [
        ["Ends in", "い: 大[おお]きい", "usually not い: 静[しず]か"],
        ["Before a noun", "大[おお]きい犬[いぬ]", "静[しず]か**な**町[まち]"],
        ["Not", "大[おお]き**くない**", "静[しず]か**じゃない**"],
        ["Was", "大[おお]き**かった**", "静[しず]か**だった**"],
        ["Careful", "いい → よくない", "きれい・嫌[きら]い are na-adjectives"],
      ],
    }],
  },
  "u1-i-adj": {
    "いい is irregular": [{
      cap: "いい borrows the stem よ",
      head: ["", "Regular: 高[たか]い", "Irregular: いい"],
      rows: [
        ["Plain", "高[たか]い", "いい"],
        ["Not", "高[たか]くない", "**よ**くない"],
        ["Was", "高[たか]かった", "**よ**かった"],
        ["Was not", "高[たか]くなかった", "**よ**くなかった"],
      ],
    }],
  },
  "u1-verbs": {
    "Ru-verbs and u-verbs": [{
      cap: "Telling the two groups apart",
      head: ["", "Ru-verbs", "U-verbs"],
      rows: [
        ["Ending", "る after an い- or え-sound", "う・く・ぐ・す・つ・ぬ・ぶ・む・る"],
        ["Examples", "食[た]べる・見[み]る・起[お]きる", "飲[の]む・書[か]く・話[はな]す・買[か]う"],
        ["Look-alikes", "—", "帰[かえ]る・入[はい]る・走[はし]る・知[し]る・切[き]る end in い/え + る but are u-verbs"],
      ],
    }],
  },
  "u1-neg": {
    "Ru-verbs: drop る, add ない": [{
      cap: "Ru-verbs",
      head: ["Dictionary", "Negative"],
      hl: 1,
      rows: [["食[た]べる", "食[た]べ**ない**"], ["見[み]る", "見[み]**ない**"], ["起[お]きる", "起[お]き**ない**"]],
    }],
    "Irregulars": [{
      cap: "The irregular verbs",
      head: ["Dictionary", "Negative", "Note"],
      hl: 1,
      rows: [["する", "しない", "to do"], ["来[く]る", "来[こ]ない", "to come; the reading changes"], ["ある", "**ない**", "to exist; not あらない"]],
    }],
  },
  "u1-past": {
    "Negative past and irregulars": [
      {
        cap: "Negative past: ない → なかった",
        head: ["Negative", "Negative past"],
        hl: 1,
        rows: [["食[た]べない", "食[た]べ**なかった**"], ["飲[の]まない", "飲[の]ま**なかった**"], ["しない", "し**なかった**"]],
      },
      {
        cap: "Irregular verbs in the past",
        head: ["Dictionary", "Past", "Note"],
        hl: 1,
        rows: [["する", "した", "to do"], ["来[く]る", "来[き]た", "to come"], ["行[い]く", "行[い]**った**", "an exception: not 行いた"], ["ある", "あった", "to exist"]],
      },
    ],
  },
  "u1-ni-de": {
    "で: where an action happens, and how": [{
      cap: "に, へ and で side by side",
      head: ["Particle", "Used for", "Example"],
      rows: [
        ["に", "where to, who to", "学校[がっこう]**に**行[い]く\nI go to school."],
        ["に", "an exact time", "七時[しちじ]**に**起[お]きる\nI get up at seven."],
        ["に", "where something exists", "部屋[へや]**に**猫[ねこ]がいる\nThere is a cat in the room."],
        ["へ", "direction, toward", "日本[にほん]**へ**行[い]く\nI go toward Japan."],
        ["で", "where an action happens", "学校[がっこう]**で**勉強[べんきょう]する\nI study at school."],
        ["で", "means or tool", "バス**で**行[い]く\nI go by bus."],
      ],
    }],
  },
  "u1-relative": {
    "Put the description before the noun": [{
      cap: "Plain form + noun",
      head: ["", "Example", "Means"],
      rows: [
        ["Present", "食[た]べる人[ひと]", "the person who eats"],
        ["Past", "食[た]べた人[ひと]", "the person who ate"],
        ["Negative", "食[た]べない人[ひと]", "the person who doesn't eat"],
        ["Adjective", "高[たか]い本[ほん]", "an expensive book"],
      ],
    }],
  },
  "u1-noun-particles": {
    "の: of": [{
      cap: "Three ways to join nouns",
      head: ["Particle", "Meaning", "Example"],
      rows: [
        ["と", "and (a complete list), with", "りんご**と**バナナ\napples and bananas"],
        ["や", "and (a few examples among more)", "りんご**や**バナナ\napples, bananas and so on"],
        ["の", "of, 's, belonging to", "私[わたし]**の**本[ほん]\nmy book"],
      ],
    }],
  },
  "u1-adverbs": {
    "Turning adjectives into adverbs": [{
      cap: "Adjective → adverb",
      head: ["Type", "Adjective", "Adverb"],
      hl: 2,
      rows: [
        ["i-adjective", "早[はや]い", "早[はや]**く**"],
        ["i-adjective", "高[たか]い", "高[たか]**く**"],
        ["na-adjective", "静[しず]か", "静[しず]か**に**"],
        ["na-adjective", "きれい", "きれい**に**"],
        ["irregular", "いい", "**よ**く"],
      ],
    }],
    "ね and よ": [{
      cap: "Sentence-ending ね and よ",
      head: ["", "Feels like", "Example"],
      rows: [
        ["ね", "“…, right?” asks for agreement", "暑[あつ]いですね。\nIt's hot, isn't it?"],
        ["よ", "“…, you know.” gives new information", "暑[あつ]いですよ。\nIt's hot, you know."],
        ["よね", "“…, right?” you're fairly sure", "暑[あつ]いですよね。\nIt's hot, right?"],
      ],
    }],
  },
  "u2-polite": {
    "The ます-stem": [{
      cap: "Dictionary form → ます-stem → polite",
      head: ["", "Dictionary", "Stem", "Polite"],
      hl: 3,
      rows: [
        ["Ru-verb", "食[た]べる", "食[た]べ", "食[た]べ**ます**"],
        ["U-verb", "飲[の]む", "飲[の]み", "飲[の]み**ます**"],
        ["U-verb", "書[か]く", "書[か]き", "書[か]き**ます**"],
        ["U-verb", "話[はな]す", "話[はな]し", "話[はな]し**ます**"],
        ["U-verb", "買[か]う", "買[か]い", "買[か]い**ます**"],
        ["Irregular", "する", "し", "し**ます**"],
        ["Irregular", "来[く]る", "来[き]", "来[き]**ます**"],
      ],
    }],
  },
  "u2-people": {
    "Avoid “you”, use names": [{
      cap: "Words for I, you, he and she",
      head: ["English", "Japanese", "Feel"],
      rows: [
        ["I", "私[わたし]", "neutral and polite: use this one"],
        ["I", "僕[ぼく]", "casual, mostly men"],
        ["I", "俺[おれ]", "very casual, men"],
        ["you", "あなた", "distant; a name + さん is better"],
        ["he / she", "彼[かれ]・彼女[かのじょ]", "also “boyfriend” and “girlfriend”"],
      ],
    }],
  },
  "u2-question": {
    "Question words": [{
      cap: "A question word takes the place of the answer",
      head: ["Statement", "Question"],
      hl: 1,
      rows: [
        ["田中[たなか]さん**が**来[き]ます", "**誰[だれ]が**来[き]ますか"],
        ["パン**を**食[た]べます", "**何[なに]を**食[た]べますか"],
        ["駅[えき]**に**行[い]きます", "**どこに**行[い]きますか"],
        ["三時[さんじ]**に**行[い]きます", "**いつ**行[い]きますか\nいつ needs no に."],
      ],
    }],
  },
  "u2-te": {
    "Linking descriptions": [{
      cap: "Te-form of the other word types",
      head: ["Type", "Dictionary", "Te-form"],
      hl: 2,
      rows: [
        ["Irregular", "する", "して"],
        ["Irregular", "来[く]る", "来[き]て"],
        ["Exception", "行[い]く", "行[い]**って**"],
        ["I-adjective", "高[たか]い", "高[たか]**くて**"],
        ["Na-adjective", "静[しず]か", "静[しず]か**で**"],
        ["Noun", "学生[がくせい]", "学生[がくせい]**で**"],
      ],
    }],
  },
  "u2-kara": {
    "のに and し": [{
      cap: "Reasons and contrasts at a glance",
      head: ["Word", "Meaning", "Example"],
      rows: [
        ["から", "because, stated plainly", "寒[さむ]いから帰[かえ]ります。\nIt's cold, so I'm going home."],
        ["ので", "because, softer and politer", "寒[さむ]いので帰[かえ]ります。\nSame reason, gentler tone."],
        ["けど・が", "but", "高[たか]いけど買[か]います。\nIt's expensive, but I'll buy it."],
        ["のに", "even though (surprise)", "勉強[べんきょう]したのにできなかった。\nI studied, yet couldn't do it."],
        ["し", "and what's more", "安[やす]いし、おいしい。\nIt's cheap, and tasty too."],
      ],
    }],
  },
  "u2-teiru": {
    "Intransitive states": [{
      cap: "Four uses of 〜ている",
      head: ["Meaning", "Example", "Means"],
      rows: [
        ["In progress", "本[ほん]を読[よ]んでいる", "is reading a book"],
        ["Habit", "毎日[まいにち]走[はし]っている", "runs every day"],
        ["Resulting state", "結婚[けっこん]している", "is married"],
        ["State of a thing", "ドアが開[あ]いている", "the door is open"],
      ],
    }],
  },
  "u2-potential": {
    "Making the potential": [{
      cap: "Potential: can do",
      head: ["", "Dictionary", "Potential"],
      hl: 2,
      rows: [
        ["Ru-verb", "食[た]べる", "食[た]べ**られる**"],
        ["U-verb: う", "買[か]う", "買[か]**える**"],
        ["U-verb: く", "書[か]く", "書[か]**ける**"],
        ["U-verb: む", "飲[の]む", "飲[の]**める**"],
        ["U-verb: す", "話[はな]す", "話[はな]**せる**"],
        ["Irregular", "する", "できる"],
        ["Irregular", "来[く]る", "来[こ]られる"],
      ],
      note: "For u-verbs, the last sound moves to the え-row and る is added.",
    }],
  },
  "u2-naru": {
    "する: make, or decide": [{
      cap: "なる and する with different word types",
      head: ["Word type", "Become (なる)", "Make or decide (する)"],
      rows: [
        ["Noun", "先生[せんせい]**に**なる", "コーヒー**に**する"],
        ["I-adjective", "高[たか]**く**なる", "小[ちい]さ**く**する"],
        ["Na-adjective", "静[しず]か**に**なる", "きれい**に**する"],
      ],
      note: "Nouns and na-adjectives take に. I-adjectives change い to く.",
    }],
  },
  "u2-cond": {
    "なら: given that": [{
      cap: "The four conditionals",
      head: ["", "How", "Example"],
      rows: [
        ["と\nnatural result", "plain form + と", "春[はる]になると暖[あたた]かくなる。\nWhen spring comes, it gets warm."],
        ["ば\nif, in general", "え-row + ば\nadjective: い → ければ", "安[やす]ければ買[か]う。\nIf it's cheap, I'll buy it."],
        ["たら\nif or when, once", "past form + ら", "雨[あめ]が降[ふ]ったら行[い]かない。\nIf it rains, I won't go."],
        ["なら\nif that's so", "plain form + なら", "行[い]くなら教[おし]えて。\nIf you're going, tell me."],
      ],
    }],
  },
  "u2-must": {
    "Must and don't have to": [{
      cap: "May, must, must not, don't have to",
      head: ["Meaning", "Pattern", "Example"],
      rows: [
        ["may", "〜てもいい", "食[た]べてもいい\nYou may eat."],
        ["must not", "〜てはいけない", "食[た]べてはいけない\nYou must not eat."],
        ["must", "〜なければならない", "食[た]べなければならない\nYou must eat."],
        ["don't have to", "〜なくてもいい", "食[た]べなくてもいい\nYou don't have to eat."],
      ],
    }],
  },
  "u2-want": {
    "〜たい: want to do": [{
      cap: "〜たい changes like an i-adjective",
      head: ["", "Form", "Means"],
      rows: [
        ["Plain", "食[た]べ**たい**", "want to eat"],
        ["Not", "食[た]べ**たくない**", "don't want to eat"],
        ["Past", "食[た]べ**たかった**", "wanted to eat"],
        ["Past not", "食[た]べ**たくなかった**", "didn't want to eat"],
      ],
    }],
    "Let's: the volitional": [{
      cap: "Let's …",
      head: ["", "Polite", "Casual"],
      rows: [
        ["Ru-verb", "食[た]べましょう", "食[た]べ**よう**"],
        ["U-verb", "飲[の]みましょう", "飲[の]**もう**"],
        ["する", "しましょう", "しよう"],
        ["来[く]る", "来[き]ましょう", "来[こ]よう"],
      ],
    }],
  },
  "u2-quote": {
    "と: close the quote": [{
      cap: "What goes before と",
      head: ["", "Example", "Means"],
      rows: [
        ["Verb", "行[い]くと思[おも]う", "I think (they) will go"],
        ["I-adjective", "高[たか]いと思[おも]う", "I think it's expensive"],
        ["Noun, na-adjective", "学生[がくせい]**だ**と思[おも]う", "I think (they) are a student"],
        ["Speech", "「行[い]く」と言[い]った", "said “I'll go”"],
      ],
    }],
  },
  "u2-try": {
    "ていく・てくる: direction and change": [{
      cap: "Te-form + helper verb",
      head: ["Pattern", "Meaning", "Example"],
      rows: [
        ["〜てみる", "try doing", "食[た]べてみる\nTry eating it."],
        ["〜ておく", "do in advance", "買[か]っておく\nBuy it ahead of time."],
        ["〜ていく", "go on, go away", "持[も]っていく\nTake it along."],
        ["〜てくる", "come, bring, start to", "持[も]ってくる\nBring it."],
      ],
    }],
  },
  "u2-give": {
    "Three verbs, three directions": [{
      cap: "Who gives to whom?",
      head: ["Verb", "Direction", "Example"],
      rows: [
        ["あげる", "I → someone else", "私[わたし]は友達[ともだち]に本[ほん]を**あげる**。\nI give my friend a book."],
        ["くれる", "someone else → me", "友達[ともだち]が私[わたし]に本[ほん]を**くれる**。\nMy friend gives me a book."],
        ["もらう", "I receive from someone", "私[わたし]は友達[ともだち]に本[ほん]を**もらう**。\nI get a book from my friend."],
      ],
    }],
    "Doing favors": [{
      cap: "Te-form + the same verbs",
      head: ["Pattern", "Meaning", "Example"],
      rows: [
        ["〜てあげる", "I do it for someone", "手伝[てつだ]ってあげる\nI'll help you."],
        ["〜てくれる", "someone does it for me", "手伝[てつだ]ってくれる\nThey help me."],
        ["〜てもらう", "I get someone to do it", "手伝[てつだ]ってもらう\nI get their help."],
      ],
    }],
  },
  "u2-request": {
    "Firmer forms": [{
      cap: "From casual to very polite",
      head: ["Politeness", "Please do", "Please don't"],
      rows: [
        ["Casual", "食[た]べて", "食[た]べないで"],
        ["Polite", "食[た]べてください", "食[た]べないでください"],
        ["Very polite", "食[た]べていただけませんか", "食[た]べないでいただけませんか"],
      ],
    }],
  },
  "u2-numbers": {
    "The basics": [{
      cap: "Numbers",
      head: ["", "Kanji", "Reading"],
      rows: [
        ["1", "一", "いち"], ["2", "二", "に"], ["3", "三", "さん"], ["4", "四", "し・よん"], ["5", "五", "ご"],
        ["6", "六", "ろく"], ["7", "七", "しち・なな"], ["8", "八", "はち"], ["9", "九", "きゅう・く"], ["10", "十", "じゅう"],
        ["100", "百", "ひゃく"], ["1,000", "千", "せん"], ["10,000", "万", "まん"],
      ],
    }],
    "Irregular readings": [{
      cap: "Common counters",
      head: ["Counter", "For", "1", "2", "3"],
      rows: [
        ["〜人[にん]", "people", "ひとり", "ふたり", "さんにん"],
        ["〜つ", "things", "ひとつ", "ふたつ", "みっつ"],
        ["〜本[ほん]", "long things", "いっぽん", "にほん", "さんぼん"],
        ["〜枚[まい]", "flat things", "いちまい", "にまい", "さんまい"],
        ["〜時[じ]", "o'clock", "いちじ", "にじ", "さんじ"],
      ],
      note: "Watch the o'clock readings: 4 is よじ, 7 is しちじ, 9 is くじ.",
    }],
  },
  "u2-casual": {
    "Dropping and shortening": [{
      cap: "Polite → casual",
      head: ["Polite", "Casual"],
      hl: 1,
      rows: [
        ["食[た]べます", "食[た]べる"],
        ["食[た]べません", "食[た]べない"],
        ["食[た]べました", "食[た]べた"],
        ["学生[がくせい]です", "学生[がくせい]だ"],
        ["食[た]べています", "食[た]べてる"],
        ["食[た]べてしまいました", "食[た]べちゃった"],
      ],
    }],
  },
  "u3-passive": {
    "Causative: make or let": [{
      cap: "Passive and causative at a glance",
      head: ["", "Dictionary", "Passive", "Causative"],
      rows: [
        ["Ru-verb", "食[た]べる", "食[た]べ**られる**", "食[た]べ**させる**"],
        ["U-verb", "書[か]く", "書[か]**かれる**", "書[か]**かせる**"],
        ["U-verb", "飲[の]む", "飲[の]**まれる**", "飲[の]**ませる**"],
        ["U-verb", "買[か]う", "買[か]**われる**", "買[か]**わせる**"],
        ["Irregular", "する", "される", "させる"],
        ["Irregular", "来[く]る", "来[こ]られる", "来[こ]させる"],
      ],
    }],
    "Causative-passive": [{
      cap: "“Was made to …”",
      head: ["Dictionary", "Causative-passive"],
      hl: 1,
      rows: [["食[た]べる", "食[た]べ**させられる**"], ["読[よ]む", "読[よ]**まされる**"], ["する", "**させられる**"], ["来[く]る", "来[こ]**させられる**"]],
    }],
  },
  "u3-keigo": {
    "Two directions of respect": [{
      cap: "Special replacements",
      head: ["Plain", "Honorific (them)", "Humble (me)"],
      rows: [
        ["言[い]う", "おっしゃる", "申[もう]す"],
        ["食[た]べる・飲[の]む", "召[め]し上[あ]がる", "いただく"],
        ["行[い]く・来[く]る", "いらっしゃる", "参[まい]る"],
        ["いる", "いらっしゃる", "おる"],
        ["見[み]る", "ご覧[らん]になる", "拝見[はいけん]する"],
        ["する", "なさる", "致[いた]す"],
        ["知[し]っている", "ご存[ぞん]じ", "存[ぞん]じている"],
      ],
    }],
    "お〜になる and お〜する": [{
      cap: "General patterns",
      head: ["", "Pattern", "Example"],
      rows: [
        ["Honorific", "お + stem + になる", "お待[ま]ちになる\n(they) wait"],
        ["Humble", "お + stem + する", "お持[も]ちする\n(I) carry it"],
        ["Request", "お + stem + ください", "お待[ま]ちください\nPlease wait"],
      ],
    }],
  },
  "u3-shimau": {
    "Completion and regret": [{
      cap: "〜てしまう in casual speech",
      head: ["Formal", "Casual"],
      hl: 1,
      rows: [
        ["食[た]べてしまった", "食[た]べ**ちゃ**った"],
        ["忘[わす]れてしまった", "忘[わす]れ**ちゃ**った"],
        ["読[よ]んでしまった", "読[よ]ん**じゃ**った"],
        ["飲[の]んでしまった", "飲[の]ん**じゃ**った"],
      ],
      note: "て becomes ちゃ, and で becomes じゃ.",
    }],
  },
  "u3-koto": {
    "こと: turning actions into nouns": [{
      cap: "Patterns with こと",
      head: ["Pattern", "Meaning", "Example"],
      rows: [
        ["past + ことがある", "have done it before", "日本[にほん]へ行[い]ったことがある\nI have been to Japan."],
        ["dictionary + ことができる", "can do", "泳[およ]ぐことができる\nI can swim."],
        ["dictionary + ことにする", "decide to", "行[い]くことにする\nI decide to go."],
        ["dictionary + ことになる", "it has been decided that", "行[い]くことになった\nIt's been decided I'll go."],
      ],
    }],
    "ところ: a point in time": [{
      cap: "ところ: three moments",
      head: ["Form + ところ", "Moment", "Example"],
      rows: [
        ["dictionary", "about to", "食[た]べるところ"],
        ["〜ている", "in the middle of", "食[た]べているところ"],
        ["〜た", "just finished", "食[た]べたところ"],
      ],
    }],
  },
  "u3-certainty": {
    "Levels of certainty": [{
      cap: "From least to most sure",
      head: ["Expression", "Sureness", "Example"],
      rows: [
        ["かもしれない", "●○○ maybe", "明日[あした]は雨[あめ]かもしれない。\nIt might rain tomorrow."],
        ["でしょう・だろう", "●●○ probably", "明日[あした]は雨[あめ]でしょう。\nIt will probably rain tomorrow."],
        ["に違[ちが]いない", "●●● surely", "明日[あした]は雨[あめ]に違[ちが]いない。\nIt must rain tomorrow."],
      ],
    }],
  },
  "u3-amount": {
    "だけ and しか〜ない": [{
      cap: "Only",
      head: ["", "Meaning", "Example"],
      rows: [
        ["だけ", "only", "水[みず]だけ飲[の]む\nI only drink water."],
        ["しか〜ない", "nothing but (needs a negative)", "千円[せんえん]しかない\nI have only 1,000 yen."],
      ],
    }],
    "すぎる and も": [{
      cap: "Too much, as much as",
      head: ["", "Meaning", "Example"],
      rows: [
        ["〜すぎる", "too much (stem + すぎる)", "食[た]べすぎる\nEat too much."],
        ["も", "as much as (stresses the amount)", "三時間[さんじかん]も待[ま]った\nI waited a full three hours."],
        ["くらい", "about", "二時間[にじかん]くらい\nAbout two hours."],
      ],
    }],
  },
  "u3-similar": {
    "Looks and seems": [{
      cap: "What you see",
      head: ["Pattern", "Built on", "Example"],
      rows: [
        ["〜ようだ・みたいだ", "plain form: what you perceive", "雨[あめ]が降[ふ]っているようだ\nIt seems to be raining."],
        ["〜そう", "stem: how it looks", "おいしそう\nIt looks tasty."],
      ],
    }],
    "Hearsay": [{
      cap: "What you heard",
      head: ["Pattern", "Built on", "Example"],
      rows: [
        ["〜そうだ", "plain form: what you heard", "雨[あめ]が降[ふ]るそうだ\nI heard it will rain."],
        ["〜らしい", "plain form: apparently", "彼[かれ]は医者[いしゃ]らしい\nApparently he is a doctor."],
      ],
      note: "おいしそう looks tasty (you see it). おいしいそうだ is “I heard it's tasty”.",
    }],
  },
  "u3-compare": {
    "Comparing two things": [{
      cap: "Patterns for comparing",
      head: ["Pattern", "Meaning", "Example"],
      rows: [
        ["AはBより〜", "A is more … than B", "電車[でんしゃ]はバスより早[はや]い。\nThe train is faster than the bus."],
        ["AよりBの方[ほう]が〜", "B is more … than A", "バスより電車[でんしゃ]の方[ほう]が早[はや]い。\nThe train is faster than the bus."],
        ["〜た方[ほう]がいい", "you had better", "早[はや]く寝[ね]た方[ほう]がいい。\nYou should go to bed early."],
      ],
    }],
    "The most, and “it depends”": [{
      cap: "Most, and “it depends”",
      head: ["Pattern", "Meaning", "Example"],
      rows: [
        ["一番[いちばん]〜", "the most …", "富士山[ふじさん]が一番[いちばん]高[たか]い。\nMt. Fuji is the highest."],
        ["〜によって", "depending on", "人[ひと]によって違[ちが]う。\nIt depends on the person."],
      ],
    }],
  },
  "u3-easy": {
    "Stem + やすい / にくい": [{
      cap: "Stem + やすい / にくい",
      head: ["Dictionary", "Stem", "Easy", "Hard"],
      rows: [
        ["食[た]べる", "食[た]べ", "食[た]べ**やすい**", "食[た]べ**にくい**"],
        ["読[よ]む", "読[よ]み", "読[よ]み**やすい**", "読[よ]み**にくい**"],
        ["書[か]く", "書[か]き", "書[か]き**やすい**", "書[か]き**にくい**"],
        ["する", "し", "し**やすい**", "し**にくい**"],
      ],
    }],
  },
  "u3-without": {
    "ないで and ずに": [{
      cap: "Two ways to say “without”",
      head: ["Dictionary", "〜ないで", "〜ずに"],
      rows: [
        ["食[た]べる", "食[た]べないで", "食[た]べずに"],
        ["飲[の]む", "飲[の]まないで", "飲[の]まずに"],
        ["書[か]く", "書[か]かないで", "書[か]かずに"],
        ["する", "しないで", "**せ**ずに"],
        ["来[く]る", "来[こ]ないで", "来[こ]ずに"],
      ],
    }],
  },
  "u3-wake": {
    "わけ: the reasoning behind it": [{
      cap: "Three patterns with わけ",
      head: ["Pattern", "Meaning", "Example"],
      rows: [
        ["〜わけだ", "that's why, it follows", "だから行[い]かなかったわけだ。\nSo that's why he didn't go."],
        ["〜わけがない", "there's no way", "嘘[うそ]なわけがない。\nThere's no way it's a lie."],
        ["〜わけではない", "it's not that …", "嫌[きら]いなわけではない。\nIt's not that I dislike it."],
      ],
    }],
  },
  "u3-time": {
    "ばかり and とたん": [{
      cap: "Just did, the moment that",
      head: ["Pattern", "Meaning", "Example"],
      rows: [
        ["past + ばかり", "just did", "食[た]べたばかり\nI just ate."],
        ["past + とたん(に)", "the moment that", "立[た]ち上[あ]がったとたん\nThe moment I stood up."],
      ],
    }],
  },
};
