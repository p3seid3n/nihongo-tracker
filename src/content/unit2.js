// Unit 2: Everyday Japanese. Follows Tae Kim's Guide, chapter 4 (Essential Grammar).

export const unit2 = [
  {
    id: "u2-polite", ref: "4.1", title: "Polite speech: ます and です", jp: "〜ます",
    blurb: "Talking politely to people you don't know well.",
    pages: [
      {
        h: "The ます-stem",
        p: [
          "Polite verbs are built on the **stem**. Ru-verbs: drop る (食べる → 食べ). U-verbs: change the last sound to the い-row (飲む → 飲み, 書く → 書き, 話す → 話し). Irregular: する → し, 来る → 来 (き).",
          "Then add **ます** (present/future). That is all: 食べます, 飲みます, 行きます, します, 来ます.",
        ],
        ex: [
          ["私[わたし]|は|毎日[まいにち]|コーヒー|を|飲[の]みます", "I drink coffee every day."],
          ["友達[ともだち]|は|学校[がっこう]|へ|行[い]きます", "My friend goes to school."],
        ],
      },
      {
        h: "Four polite endings",
        p: ["ます makes four forms: **ます** (do), **ません** (don't), **ました** (did), **ませんでした** (didn't). Nouns and adjectives use **です** instead; i-adjectives keep their own conjugation and just add です."],
        table: {
          head: ["", "Verb 食べる", "Noun 学生", "I-adjective 高い"],
          rows: [
            ["now", "食べます", "学生です", "高いです"],
            ["not", "食べません", "学生じゃありません", "高くないです"],
            ["past", "食べました", "学生でした", "高かったです"],
            ["past not", "食べませんでした", "学生じゃありませんでした", "高くなかったです"],
          ],
        },
        ex: [
          ["昨日[きのう]|映画[えいが]|を|見[み]ました", "I watched a movie yesterday."],
          ["友達[ともだち]|は|来[き]ません", "My friend isn't coming."],
          ["お|寿司[すし]|は|食[た]べませんでした", "I didn't eat sushi."],
          ["この|本[ほん]|は|高[たか]くない|です", "This book is not expensive."],
        ],
      },
      {
        h: "です is not just a polite だ",
        p: ["です only shows politeness; it doesn't change the tense. For past, use でした. And don't put です after a verb: 食べますです is wrong."],
        ex: [["昨日[きのう]|は|忙[いそが]しかった|です", "Yesterday was busy."]],
      },
    ],
    cloze: [
      ["私[わたし]|は|毎日[まいにち]|コーヒー|を|飲[の]みます*", "I drink coffee every day.", "", "飲[の]みます,飲[の]みません,飲[の]みました,飲[の]みませんでした"],
      ["昨日[きのう]|映画[えいが]|を|見[み]ました*", "I watched a movie yesterday.", "", "見[み]ます,見[み]ません,見[み]ました,見[み]ませんでした"],
      ["友達[ともだち]|は|来[き]ません*", "My friend isn't coming.", "", "来[き]ます,来[き]ません,来[き]ました,来[き]ませんでした"],
    ],
    spot: [["食[た]べません", "食[た]べないです", "食[た]べますじゃない", "~Polite negative of a verb: 〜ません."]],
    conj: [{ pos: "verb", form: "polite", n: 2 }, { pos: "verb", form: "polite-neg", n: 1 }, { pos: "verb", form: "polite-past", n: 1 }, { pos: "verb", form: "polite-past-neg", n: 1 }],
    gens: ["obj-verb:polite:aff,neg,past,pastneg", "go-to:polite", "at-place:polite", "adj-desu:polite"],
    vocab: ["taberu", "nomu", "miru", "iku", "kuru", "benkyou"],
  },

  {
    id: "u2-people", ref: "4.2", title: "Referring to people", jp: "私・さん・家族",
    blurb: "I, you and everybody else.",
    pages: [
      {
        h: "Avoid “you”, use names",
        p: [
          "Japanese avoids saying “you”. People use the other person's name plus **さん**, or their role (先生). **あなた** is correct but can sound distant or even pushy; keep it for textbook sentences and special cases.",
          "For “I” there are many options: **私** (neutral, polite, works for everyone), **僕** (casual, mostly male), **俺** (rough, male). When in doubt, use 私.",
          "Use **さん** with names (田中さん), but never with your own name. **くん** (boys, juniors) and **ちゃん** (children, close friends) are friendlier.",
        ],
        ex: [
          ["田中[たなか]さん|は|先生[せんせい]|です", "Mr. Tanaka is a teacher."],
          ["僕[ぼく]|は|学生[がくせい]|だ", "I'm a student. (casual, male)"],
        ],
      },
      {
        h: "Your family and other people's",
        p: [
          "When you talk about your **own** family to others you use one set of words (母, 父). For **somebody else's** family you use the respectful set (お母さん, お父さん). Inside your own home, you call your mother お母さん too.",
        ],
        table: {
          head: ["", "My own", "Someone else's"],
          rows: [["mother", "母 (はは)", "お母さん"], ["father", "父 (ちち)", "お父さん"], ["older sister", "姉 (あね)", "お姉さん"], ["older brother", "兄 (あに)", "お兄さん"]],
        },
        ex: [
          ["母[はは]|は|医者[いしゃ]|です", "My mother is a doctor."],
          ["田中[たなか]さん|の|お|母[かあ]さん|は|先生[せんせい]|です", "Ms. Tanaka's mother is a teacher."],
        ],
      },
    ],
    quiz: [
      ["Which honorific is the safe default after a name?", "さん", "ちゃん", "くん", "~さん works for nearly everyone."],
      ["How do you refer to your own mother when speaking to others?", "母[はは]", "お母[かあ]さん", "~母 is the plain word used for your own family."],
      ["How do you refer to someone else's mother?", "お母[かあ]さん", "母[はは]", "~Use the respectful form for other people's family."],
      ["Which word for “I” is neutral and works for everyone?", "私[わたし]", "俺[おれ]", "僕[ぼく]", "~私 is the safe choice."],
    ],
    vocab: ["watashi", "anata", "kare", "kanojo", "tomodachi", "tanaka"],
  },

  {
    id: "u2-question", ref: "4.3", title: "Asking questions", jp: "か・疑問詞",
    blurb: "Yes/no questions and who, what, where, when.",
    pages: [
      {
        h: "か makes a question",
        p: ["Add **か** to the end of a polite sentence to turn it into a question. No word order change, and the question mark is optional. In casual speech the か disappears and your voice rises instead."],
        ex: [
          ["コーヒー|を|飲[の]みます|か", "Do you drink coffee?"],
          ["田中[たなか]さん|は|学生[がくせい]|です|か", "Is Mr. Tanaka a student?"],
          ["明日[あした]|来[く]る|？", "Are you coming tomorrow?"],
        ],
      },
      {
        h: "Question words",
        p: ["Question words take the place of the thing you're asking about. They never take は; use が or the usual particle (を, に, で…) instead."],
        table: {
          head: ["Word", "Meaning"],
          rows: [["何 (なに/なん)", "what"], ["誰 (だれ)", "who"], ["どこ", "where"], ["いつ", "when"], ["どう", "how"], ["どれ", "which one"], ["いくつ", "how many"]],
        },
        ex: [
          ["これ|は|何[なん]|です|か", "What is this?"],
          ["学校[がっこう]|は|どこ|です|か", "Where is the school?"],
          ["いつ|日本[にほん]|へ|行[い]きます|か", "When are you going to Japan?"],
          ["何[なに]|を|食[た]べます|か", "What will you eat?"],
          ["誰[だれ]|と|映画[えいが]|を|見[み]ました|か", "Who did you watch the movie with?"],
        ],
      },
    ],
    cloze: [
      ["コーヒー|を|飲[の]みます|か*", "Do you drink coffee?", "か ends a question.", "か,ね,よ,の"],
      ["何[なに]*|を|食[た]べます|か", "What will you eat?", "", "何[なに],誰[だれ],どこ,いつ"],
      ["学校[がっこう]|は|どこ*|です|か", "Where is the school?", "", "何[なに],誰[だれ],どこ,いつ"],
      ["誰[だれ]*|と|映画[えいが]|を|見[み]ました|か", "Who did you watch the movie with?", "", "何[なに],誰[だれ],どこ,いつ"],
    ],
    quiz: [
      ["Which question word means “where”?", "どこ", "いつ", "誰[だれ]", "~どこ = where."],
      ["Which means “when”?", "いつ", "どこ", "何[なに]", "~いつ = when."],
    ],
    vocab: [],
  },

  {
    id: "u2-te", ref: "4.4", title: "The te-form", jp: "〜て",
    blurb: "Chaining actions and states together.",
    pages: [
      {
        h: "Forming the te-form",
        p: ["Same pattern as the past tense, but ending in て/で instead of た/だ. Ru-verbs: drop る, add て. U-verbs follow the ending table. Irregular: する → して, 来る → 来て (きて), 行く → 行って."],
        table: {
          head: ["Ending", "Becomes", "Example"],
          rows: [["う・つ・る", "って", "買う → 買って"], ["む・ぶ・ぬ", "んで", "飲む → 飲んで"], ["く", "いて", "書く → 書いて"], ["ぐ", "いで", "泳ぐ → 泳いで"], ["す", "して", "話す → 話して"]],
        },
        ex: [
          ["友達[ともだち]|に|会[あ]って|話[はな]した", "I met a friend and we talked."],
          ["水[みず]|を|飲[の]んで|寝[ね]た", "I drank water and went to sleep."],
        ],
      },
      {
        h: "Linking actions in order",
        p: ["Put the verbs in order, with the te-form on each one except the last. The last verb carries the tense for the whole chain."],
        ex: [
          ["朝[あさ]|起[お]きて|ご|飯[はん]|を|食[た]べた", "I got up in the morning and ate."],
          ["図書館[としょかん]|へ|行[い]って|本[ほん]|を|読[よ]んだ", "I went to the library and read a book."],
        ],
      },
      {
        h: "Linking descriptions",
        p: ["I-adjectives link with **〜くて**, nouns and na-adjectives with **で**."],
        ex: [
          ["この|部屋[へや]|は|大[おお]きくて|きれい|です", "This room is big and clean."],
          ["彼[かれ]|は|学生[がくせい]|で|友達[ともだち]|は|先生[せんせい]|です", "He is a student and my friend is a teacher."],
        ],
      },
    ],
    cloze: [
      ["図書館[としょかん]|へ|行[い]って*|本[ほん]|を|読[よ]んだ", "I went to the library and read a book.", "", "行[い]って,行[い]いて,行[い]んで,行[い]った"],
      ["水[みず]|を|飲[の]んで*|寝[ね]た", "I drank water and went to sleep.", "", "飲[の]んで,飲[の]って,飲[の]いて,飲[の]して"],
      ["この|部屋[へや]|は|大[おお]きくて*|きれい|です", "This room is big and clean.", "", "大[おお]きくて,大[おお]きいで,大[おお]きで,大[おお]きって"],
    ],
    conj: [{ pos: "verbRu", form: "te", n: 1 }, { pos: "verbU", form: "te", n: 4 }, { pos: "verb", form: "te", n: 1 }, { pos: "iadj", form: "te", n: 1 }],
    vocab: ["taberu", "nomu", "iku", "kaku", "hanasu", "matsu", "kaeru"],
  },

  {
    id: "u2-kara", ref: "4.4.3", title: "Reasons and contrasts", jp: "から・ので・けど",
    blurb: "Because, but and despite.",
    pages: [
      {
        h: "から and ので: because",
        p: [
          "**から** follows the reason: “reason から result”. It's direct and works in any register. **ので** is softer and more polite; after a noun or na-adjective use **なので**.",
        ],
        ex: [
          ["忙[いそが]しい|から|行[い]かない", "I'm busy, so I won't go."],
          ["雨[あめ]|だ|から|家[いえ]|に|いる", "It's raining, so I'll stay home."],
          ["天気[てんき]|が|いい|ので|公園[こうえん]|へ|行[い]きます", "The weather is good, so I'll go to the park."],
        ],
      },
      {
        h: "けど and が: but",
        p: ["**けど** (casual) and **が** (polite) join two contrasting clauses: “…, but …”."],
        ex: [
          ["安[やす]い|けど|美味[おい]しくない", "It's cheap, but not tasty."],
          ["日本語[にほんご]|は|難[むずか]しい|が|面白[おもしろ]い", "Japanese is difficult, but interesting."],
        ],
      },
      {
        h: "のに and し",
        p: ["**のに** means “even though; despite”, often with a feeling of disappointment. **し** lists reasons, with the sense “and besides”."],
        ex: [
          ["頑張[がんば]った|のに|ダメ|だった", "Even though I tried hard, it didn't work."],
          ["安[やす]い|し|美味[おい]しい|し|この|店[みせ]|は|いい|です", "It's cheap, it's tasty, this restaurant is great."],
        ],
      },
    ],
    cloze: [
      ["忙[いそが]しい|から*|行[い]かない", "I'm busy, so I won't go.", "から gives the reason.", "から,けど,のに,と"],
      ["安[やす]い|けど*|美味[おい]しくない", "It's cheap, but not tasty.", "けど = but", "から,けど,のに,し"],
      ["頑張[がんば]った|のに*|ダメ|だった", "Even though I tried hard, it didn't work.", "のに = despite", "から,けど,のに,し"],
      ["雨[あめ]|な*|ので|家[いえ]|に|いる", "It's raining, so I'll stay home.", "Noun + なので", "な,の,だ,で"],
    ],
    vocab: [],
  },

  {
    id: "u2-teiru", ref: "4.5", title: "Ongoing actions and states: 〜ている", jp: "〜ている",
    blurb: "Is doing, and is in the state of.",
    pages: [
      {
        h: "Is doing / has been done",
        p: [
          "Add **いる** to the te-form. For actions that take time it means “is doing”: 食べている (is eating). For verbs of change it means the **resulting state**: 結婚している (is married), 知っている (knows), 住んでいる (lives).",
          "Negative: 〜ていない. Past: 〜ていた. Casual speech drops the い: 〜てる.",
        ],
        ex: [
          ["今[いま]|ご|飯[はん]|を|食[た]べている", "I'm eating right now."],
          ["彼[かれ]|は|東京[とうきょう]|に|住[す]んでいる", "He lives in Tokyo."],
          ["田中[たなか]さん|は|結婚[けっこん]している", "Mr. Tanaka is married."],
          ["まだ|食[た]べていない", "I haven't eaten yet."],
        ],
      },
      {
        h: "Intransitive states",
        p: ["With intransitive verbs, 〜ている describes how things are right now: the door **is open**, the light **is on**. Compare transitive 〜てある later on."],
        ex: [
          ["窓[まど]|が|開[あ]いている", "The window is open."],
          ["電気[でんき]|が|ついている", "The light is on."],
        ],
      },
    ],
    cloze: [
      ["今[いま]|ご|飯[はん]|を|食[た]べている*", "I'm eating right now.", "", "食[た]べている,食[た]べていた,食[た]べていない,食[た]べる"],
      ["まだ|食[た]べていない*", "I haven't eaten yet.", "", "食[た]べている,食[た]べていた,食[た]べていない,食[た]べる"],
      ["彼[かれ]|は|東京[とうきょう]|に|住[す]んでいる*", "He lives in Tokyo.", "", "住[す]んでいる,住[す]んでいない,住[す]む,住[す]んだ"],
    ],
    conj: [{ pos: "verb", form: "teiru", n: 3 }, { pos: "verb", form: "teinai", n: 1 }, { pos: "verb", form: "teita", n: 1 }],
    vocab: ["taberu", "nomu", "miru", "yomu", "benkyou"],
  },

  {
    id: "u2-potential", ref: "4.6", title: "Can do: the potential form", jp: "可能形",
    blurb: "Saying what you are able to do.",
    pages: [
      {
        h: "Making the potential",
        p: [
          "Ru-verbs: drop る, add **られる** (食べる → 食べられる). U-verbs: change the last sound to the え-row and add る (飲む → 飲める, 書く → 書ける, 話す → 話せる). Irregular: する → **できる**, 来る → 来られる (こられる).",
          "Potential verbs are ru-verbs, so they conjugate that way: 食べられない (can't eat), 読めた (could read).",
        ],
        ex: [
          ["日本語[にほんご]|が|話[はな]せる", "I can speak Japanese."],
          ["魚[さかな]|が|食[た]べられる", "I can eat fish."],
          ["漢字[かんじ]|が|読[よ]める", "I can read kanji."],
          ["明日[あした]|は|来[こ]られない", "I can't come tomorrow."],
        ],
      },
      {
        h: "The object takes が",
        p: ["Because the sentence now describes an ability or a state, the thing you can do is usually marked with **が**, not を: 日本語**が**話せる."],
        ex: [
          ["私[わたし]|は|泳[およ]げる", "I can swim."],
          ["日本語[にほんご]|は|話[はな]せない", "I can't speak Japanese."],
        ],
      },
    ],
    cloze: [
      ["日本語[にほんご]|が*|話[はな]せる", "I can speak Japanese.", "The thing you can do takes が.", "が,を,に,で"],
      ["魚[さかな]|が|食[た]べられる*", "I can eat fish.", "Ru-verb: 〜られる", "食[た]べられる,食[た]べれる,食[た]べる,食[た]べさせる"],
    ],
    conj: [{ pos: "verbRu", form: "potential", n: 2 }, { pos: "verbU", form: "potential", n: 3 }, { pos: "verb", form: "potential", n: 1 }],
    vocab: ["hanasu", "yomu", "taberu", "nomu", "kaku"],
  },

  {
    id: "u2-naru", ref: "4.7", title: "Becoming and making: なる・する", jp: "になる・にする",
    blurb: "Change and decisions.",
    pages: [
      {
        h: "なる: become",
        p: ["Noun or na-adjective + **に** + なる. I-adjective: replace い with **く** + なる. Verbs: 〜ように + なる for gradual change."],
        ex: [
          ["=先生[せんせい]|に|なる", "become a teacher"],
          ["元気[げんき]|に|なった", "(I) got better."],
          ["寒[さむ]く|なった", "It became cold."],
          ["日本語[にほんご]|が|上手[じょうず]|に|なった", "My Japanese got good."],
        ],
      },
      {
        h: "する: make, or decide",
        p: ["**に する** makes something a certain way, or chooses it (“I'll have …”). **〜ことにする** means “decide to”."],
        ex: [
          ["部屋[へや]|を|きれい|に|する", "I make the room clean."],
          ["コーヒー|に|する", "I'll have coffee."],
          ["日本[にほん]|へ|行[い]く|こと|に|した", "I decided to go to Japan."],
        ],
      },
    ],
    cloze: [
      ["寒[さむ]く*|なった", "It became cold.", "I-adjective: い → く + なる", "寒[さむ]く,寒[さむ]に,寒[さむ]い,寒[さむ]で"],
      ["元気[げんき]|に*|なった", "(I) got better.", "Na-adjective + に + なる", "に,く,な,で"],
      ["部屋[へや]|を|きれい|に*|する", "I make the room clean.", "", "に,く,な,で"],
    ],
    vocab: [],
  },

  {
    id: "u2-cond", ref: "4.8", title: "If and when: conditionals", jp: "と・ば・たら・なら",
    blurb: "Four ways to say “if”.",
    pages: [
      {
        h: "と: natural result",
        p: ["**A と B**: whenever A happens, B follows. It's for facts, habits and laws of nature, not for requests or wishes."],
        ex: [["春[はる]|に|なる|と|暖[あたた]かく|なる", "When spring comes, it gets warm."]],
      },
      {
        h: "ば and たら: ordinary ifs",
        p: [
          "**〜ば**: ru-verbs drop る + れば (食べれば); u-verbs change to the え-row + ば (飲めば); i-adjectives use ければ (安ければ); nouns use なら(ば).",
          "**〜たら**: take the past form and add ら (行ったら). It also covers “when / once it's done”, and is the most flexible and common.",
        ],
        ex: [
          ["安[やす]ければ|買[か]う", "If it's cheap, I'll buy it."],
          ["時間[じかん]|が|あれば|行[い]きます", "If I have time, I'll go."],
          ["雨[あめ]|が|降[ふ]ったら|行[い]かない", "If it rains, I won't go."],
        ],
      },
      {
        h: "なら: given that",
        p: ["**なら** picks up what someone said or the situation at hand: “if that's the case, …”."],
        ex: [["日本[にほん]|へ|行[い]く|なら|京都[きょうと]|が|いい", "If you're going to Japan, Kyoto is good."]],
      },
    ],
    cloze: [
      ["安[やす]ければ*|買[か]う", "If it's cheap, I'll buy it.", "I-adjective: ければ", "安[やす]ければ,安[やす]かったら,安[やす]いと,安[やす]いなら"],
      ["雨[あめ]|が|降[ふ]ったら*|行[い]かない", "If it rains, I won't go.", "Past form + ら", "降[ふ]ったら,降[ふ]れば,降[ふ]ると,降[ふ]るなら"],
      ["春[はる]|に|なる|と*|暖[あたた]かく|なる", "When spring comes, it gets warm.", "と = natural result", "と,ば,たら,なら"],
    ],
    conj: [{ pos: "verb", form: "ba", n: 2 }, { pos: "verb", form: "tara", n: 2 }, { pos: "iadj", form: "ba", n: 1 }],
    vocab: [],
  },

  {
    id: "u2-must", ref: "4.9", title: "May, must and must not", jp: "てもいい・なければならない",
    blurb: "Permission, obligation and prohibition.",
    pages: [
      {
        h: "May I? 〜てもいい",
        p: ["te-form + **もいい** = “it's fine to …”. Add です/か to ask permission: 食べてもいいですか?"],
        ex: [
          ["ここ|で|食[た]べても|いい|です", "You may eat here."],
          ["ここ|で|食[た]べても|いい|です|か", "May I eat here?"],
        ],
      },
      {
        h: "Must not: 〜てはいけない",
        p: ["te-form + **はいけない** (or ちゃだめ in casual speech) = “must not”."],
        ex: [["ここ|で|食[た]べては|いけない|です", "You must not eat here."]],
      },
      {
        h: "Must and don't have to",
        p: [
          "To say “must”, use the **negative** and then deny it: 〜なければならない, 〜ないといけない, or casual 〜なきゃ. Literally: “if you don't do it, it won't do.”",
          "“Don't have to” is the negative te-form with もいい: 〜なくてもいい.",
        ],
        ex: [
          ["勉強[べんきょう]|しなければ|ならない", "I have to study."],
          ["早[はや]く|寝[ね]ないと|いけない", "I have to go to sleep early."],
          ["宿題[しゅくだい]|を|しなきゃ", "I've got to do my homework. (casual)"],
          ["行[い]かなくても|いい", "You don't have to go."],
        ],
      },
    ],
    cloze: [
      ["ここ|で|食[た]べても*|いい|です", "You may eat here.", "", "食[た]べても,食[た]べては,食[た]べると,食[た]べたら"],
      ["ここ|で|食[た]べては*|いけない|です", "You must not eat here.", "", "食[た]べても,食[た]べては,食[た]べると,食[た]べたら"],
      ["行[い]かなくても*|いい", "You don't have to go.", "", "行[い]かなくても,行[い]かなければ,行[い]っても,行[い]かないと"],
    ],
    vocab: [],
  },

  {
    id: "u2-want", ref: "4.10", title: "Wanting and suggesting", jp: "〜たい・ほしい・〜よう",
    blurb: "I want to … and let's …",
    pages: [
      {
        h: "〜たい: want to do",
        p: [
          "Take the ます-stem and add **たい**: 行く → 行きたい, 食べる → 食べたい. It then conjugates like an i-adjective: 食べたくない (don't want), 食べたかった (wanted).",
        ],
        ex: [
          ["私[わたし]|は|日本[にほん]|へ|行[い]きたい", "I want to go to Japan."],
          ["何[なに]|を|食[た]べたい|です|か", "What do you want to eat?"],
          ["魚[さかな]|は|食[た]べたくない", "I don't want to eat fish."],
        ],
      },
      {
        h: "ほしい: want a thing",
        p: ["**ほしい** is an i-adjective for wanting an object. The thing wanted takes が."],
        ex: [["新[あたら]しい|車[くるま]|が|ほしい", "I want a new car."]],
      },
      {
        h: "Let's: the volitional",
        p: [
          "Ru-verbs: drop る + **よう** (食べよう). U-verbs: change to the お-row + う (行こう, 飲もう). する → しよう, 来る → 来よう. Polite: **〜ましょう** (行きましょう). Add か to offer: 食べましょうか?",
        ],
        ex: [
          ["一緒[いっしょ]|に|食[た]べよう", "Let's eat together."],
          ["映画[えいが]|を|見[み]ましょう", "Let's watch a movie."],
        ],
      },
    ],
    cloze: [
      ["私[わたし]|は|日本[にほん]|へ|行[い]きたい*", "I want to go to Japan.", "", "行[い]きたい,行[い]きます,行[い]きたく,行[い]こう"],
      ["魚[さかな]|は|食[た]べたくない*", "I don't want to eat fish.", "", "食[た]べたくない,食[た]べたい,食[た]べない,食[た]べたかった"],
      ["新[あたら]しい|車[くるま]|が*|ほしい", "I want a new car.", "The thing wanted takes が.", "が,を,に,は"],
    ],
    conj: [{ pos: "verb", form: "tai", n: 3 }, { pos: "verb", form: "volitional", n: 3 }],
    vocab: [],
  },

  {
    id: "u2-quote", ref: "4.11", title: "Quoting and thinking", jp: "と言う・と思う",
    blurb: "Saying what someone said and what you think.",
    pages: [
      {
        h: "と: close the quote",
        p: ["Put the quoted sentence, in its original form, before **と** and add 言う (say), 思う (think), 聞く (hear) or 知る (know). Casual speech shortens と to **って**."],
        ex: [
          ["彼[かれ]|は|行[い]く|と|言[い]った", "He said he'd go."],
          ["明日[あした]|は|雨[あめ]|だ|と|思[おも]う", "I think it will rain tomorrow."],
          ["行[い]く|って|言[い]った", "He said he'd go. (casual)"],
        ],
      },
      {
        h: "という: called, named",
        p: ["**〜という** + noun means “a noun called …”. It's also how you ask what something is called."],
        ex: [
          ["=田中[たなか]さん|という|人[ひと]", "a person called Tanaka"],
          ["これ|は|日本語[にほんご]|で|何[なん]|と|言[い]います|か", "How do you say this in Japanese?"],
        ],
      },
    ],
    cloze: [
      ["彼[かれ]|は|行[い]く|と*|言[い]った", "He said he'd go.", "と closes the quote.", "と,を,に,が"],
      ["明日[あした]|は|雨[あめ]|だ|と*|思[おも]う", "I think it will rain tomorrow.", "", "と,を,に,が"],
    ],
    vocab: [],
  },

  {
    id: "u2-try", ref: "4.13", title: "Trying, preparing and changing", jp: "てみる・ておく・てくる",
    blurb: "Small helpers that follow the te-form.",
    pages: [
      {
        h: "てみる: try doing",
        p: ["te-form + **みる**: do something to see what it's like."],
        ex: [
          ["この|ラーメン|を|食[た]べてみる", "I'll try eating this ramen."],
          ["お|寿司[すし]|を|食[た]べてみた", "I tried eating sushi."],
        ],
      },
      {
        h: "ておく: do in advance",
        p: ["te-form + **おく** = do something beforehand, getting ready for later."],
        ex: [["先[さき]に|宿題[しゅくだい]|を|しておく", "I'll do my homework in advance."]],
      },
      {
        h: "ていく・てくる: direction and change",
        p: ["te-form + **いく** means doing something and going away (or continuing). **てくる** means coming back with it, or a change that has built up until now."],
        ex: [
          ["弁当[べんとう]|を|買[か]って|いく", "I'll buy a bento and take it with me."],
          ["だんだん|寒[さむ]く|なって|きた", "It has gradually gotten cold."],
        ],
      },
    ],
    cloze: [
      ["お|寿司[すし]|を|食[た]べて*|みた", "I tried eating sushi.", "てみる", "食[た]べて,食[た]べた,食[た]べる,食[た]べない"],
      ["先[さき]に|宿題[しゅくだい]|を|しておく*", "I'll do my homework in advance.", "ておく", "しておく,してみる,してくる,している"],
    ],
    vocab: [],
  },

  {
    id: "u2-give", ref: "4.14", title: "Giving and receiving", jp: "あげる・くれる・もらう",
    blurb: "Who gives what to whom.",
    pages: [
      {
        h: "Three verbs, three directions",
        p: [
          "**あげる**: I (or someone) give to another person. **くれる**: someone gives to me (or my side). **もらう**: I receive from someone.",
          "The giver of あげる/くれる is the subject. For もらう the receiver is the subject and the giver gets **に**.",
        ],
        ex: [
          ["私[わたし]|は|友達[ともだち]|に|本[ほん]|を|あげた", "I gave my friend a book."],
          ["友達[ともだち]|が|私[わたし]|に|本[ほん]|を|くれた", "My friend gave me a book."],
          ["私[わたし]|は|友達[ともだち]|に|本[ほん]|を|もらった", "I received a book from my friend."],
        ],
      },
      {
        h: "Doing favors",
        p: ["Attach the same verbs to the te-form to say who does a favor for whom: 〜てあげる, 〜てくれる, 〜てもらう."],
        ex: [
          ["友達[ともだち]|が|日本語[にほんご]|を|教[おし]えて|くれた", "My friend taught me Japanese (as a favor)."],
          ["友達[ともだち]|に|手伝[てつだ]って|もらった", "I got my friend to help me."],
        ],
      },
    ],
    cloze: [
      ["友達[ともだち]|が|私[わたし]|に|本[ほん]|を|くれた*", "My friend gave me a book.", "Someone gives to me: くれる", "あげた,くれた,もらった,した"],
      ["私[わたし]|は|友達[ともだち]|に|本[ほん]|を|もらった*", "I received a book from my friend.", "", "あげた,くれた,もらった,した"],
    ],
    vocab: [],
  },

  {
    id: "u2-request", ref: "4.15", title: "Making requests", jp: "ください・ないで",
    blurb: "Please do, please don't, and commands.",
    pages: [
      {
        h: "〜てください",
        p: ["te-form + **ください** = “please do …”. For “please give me …” use the noun + を + ください. For “please don't”, use the negative: **〜ないでください**."],
        ex: [
          ["水[みず]|を|ください", "Please give me water."],
          ["ちょっと|待[ま]って|ください", "Please wait a moment."],
          ["ここ|で|食[た]べないで|ください", "Please don't eat here."],
        ],
      },
      {
        h: "Firmer forms",
        p: [
          "**〜なさい**: a firm but polite instruction, often from parents and teachers. Stem + なさい.",
          "**Command form**: ru-verbs → 〜ろ (食べろ), u-verbs → え-row (行け). Negative command: dictionary form + な (行くな). These are blunt; you'll mostly hear them in anime, sports and arguments.",
        ],
        ex: [
          ["早[はや]く|寝[ね]なさい", "Go to sleep early. (firm)"],
          ["食[た]べろ", "Eat! (blunt)"],
          ["行[い]くな", "Don't go! (blunt)"],
        ],
      },
    ],
    cloze: [
      ["ちょっと|待[ま]って*|ください", "Please wait a moment.", "", "待[ま]って,待[ま]った,待[ま]つ,待[ま]ち"],
      ["ここ|で|食[た]べないで*|ください", "Please don't eat here.", "", "食[た]べないで,食[た]べなくて,食[た]べないと,食[た]べて"],
    ],
    conj: [{ pos: "verb", form: "te", n: 2 }, { pos: "verb", form: "naide", n: 2 }, { pos: "verb", form: "imperative", n: 1 }],
    vocab: [],
  },

  {
    id: "u2-numbers", ref: "4.16", title: "Numbers and counting", jp: "数字・助数詞",
    blurb: "Counting things, people and times.",
    pages: [
      {
        h: "The basics",
        p: [
          "一 二 三 四 五 六 七 八 九 十: いち に さん し/よん ご ろく しち/なな はち きゅう/く じゅう. Then 百 (ひゃく), 千 (せん), 万 (まん).",
          "Things are counted with a **counter** word that goes after the number: 三人 (3 people), 三本 (3 long things), 三枚 (3 flat things). Native counters 一つ, 二つ, 三つ… work for many objects up to ten.",
        ],
        ex: [
          ["りんご|を|三[みっ]つ|買[か]った", "I bought three apples."],
          ["学生[がくせい]|が|二人[ふたり]|いる", "There are two students."],
          ["七時[しちじ]|に|起[お]きる", "I wake up at seven o'clock."],
        ],
      },
      {
        h: "Irregular readings",
        p: ["Watch out: 一人 ひとり, 二人 ふたり, 四時 よじ, 九時 くじ, 三本 さんぼん, 六本 ろっぽん. Sound changes are normal; learn them as you meet them."],
        ex: [
          ["本[ほん]|を|五冊[ごさつ]|読[よ]んだ", "I read five books."],
          ["一日[いちにち]|に|三回[さんかい]|食[た]べる", "I eat three times a day."],
        ],
      },
    ],
    quiz: [
      ["!How do you read 二人?", "ふたり", "にたり", "ににん", "~二人 is read ふたり."],
      ["!What is 四時 (four o'clock)?", "よじ", "しじ", "よんじ", "~四時 is read よじ."],
      ["Which counter is used for people?", "人[にん]", "本[ほん]", "枚[まい]", "~人 counts people."],
    ],
    vocab: [],
  },

  {
    id: "u2-casual", ref: "4.17", title: "Casual speech", jp: "くだけた話し方",
    blurb: "How friends really talk.",
    pages: [
      {
        h: "Dropping and shortening",
        p: [
          "Among friends, particles like は, が and を are often dropped, and endings shrink: **〜ている → 〜てる**, **〜ては → 〜ちゃ**, **〜てしまう → 〜ちゃう**, **〜ければ → 〜きゃ**. Questions often lose か, and a rising tone does the work.",
        ],
        ex: [
          ["何[なに]|してる|？", "What are you doing?"],
          ["ご|飯[はん]|食[た]べた|？", "Did you eat?"],
          ["お|腹[なか]|すいた", "I'm hungry."],
          ["知[し]らない", "I don't know."],
        ],
      },
      {
        h: "Casual sentence endings",
        p: ["Plain-form sentences plus **よ**, **ね**, **な**, and **じゃん** (“isn't it?”, “see?”). Be careful with strong endings like ぞ and ぜ; they sound rough or theatrical."],
        ex: [
          ["それ|いい|ね", "That's nice."],
          ["いい|じゃん", "That's good, isn't it!"],
          ["行[い]こう|よ", "Come on, let's go."],
        ],
      },
    ],
    cloze: [
      ["何[なに]|して*|る|？", "What are you doing?", "〜ている → 〜てる", "して,した,する,しない"],
      ["それ|いい|ね*", "That's nice.", "", "ね,よ,か,の"],
      ["いい|じゃん*", "That's good, isn't it!", "", "じゃん,です,ます,だった"],
    ],
    vocab: [],
  },
];
