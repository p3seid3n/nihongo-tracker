// Unit 3: Special expressions. Follows Tae Kim's Guide, chapter 5.

export const unit3 = [
  {
    id: "u3-passive", ref: "5.1", title: "Passive and causative", jp: "受身・使役",
    blurb: "Being done to, and making or letting someone do.",
    pages: [
      {
        h: "Passive: being done to",
        p: [
          "Ru-verbs: drop る, add **られる** (褒める → 褒められる). U-verbs: change to the あ-row and add **れる** (噛む → 噛まれる). する → **される**, 来る → 来られる. Passive verbs are ru-verbs.",
          "The doer gets **に**: 先生に褒められた (I was praised by the teacher). Japanese also uses the passive for things that happen **to you and bother you**: 雨に降られた (I got rained on).",
        ],
        ex: [
          ["私[わたし]|は|先生[せんせい]|に|褒[ほ]められた", "I was praised by the teacher."],
          ["犬[いぬ]|に|噛[か]まれた", "I was bitten by a dog."],
          ["雨[あめ]|に|降[ふ]られた", "I got rained on."],
        ],
      },
      {
        h: "Causative: make or let",
        p: [
          "Ru-verbs: drop る, add **させる** (食べさせる). U-verbs: あ-row + **せる** (読む → 読ませる). する → させる, 来る → 来させる.",
          "Who is made to do it gets **に** (or を for intransitives): 母は私に野菜を食べさせた. Context decides between “make” and “let”.",
        ],
        ex: [
          ["母[はは]|は|私[わたし]|に|野菜[やさい]|を|食[た]べさせた", "My mother made me eat vegetables."],
          ["先生[せんせい]|は|学生[がくせい]|に|本[ほん]|を|読[よ]ませた", "The teacher had the students read a book."],
        ],
      },
      {
        h: "Causative-passive",
        p: ["Combine them for “was made to …”: 食べさせられた (was made to eat). U-verbs often shorten to 〜される: 読まされた."],
        ex: [["私[わたし]|は|母[はは]|に|野菜[やさい]|を|食[た]べさせられた", "I was made to eat vegetables by my mother."]],
      },
    ],
    cloze: [
      ["私[わたし]|は|先生[せんせい]|に*|褒[ほ]められた", "I was praised by the teacher.", "The doer in a passive sentence takes に.", "に,を,が,で"],
      ["母[はは]|は|私[わたし]|に|野菜[やさい]|を|食[た]べさせた*", "My mother made me eat vegetables.", "", "食[た]べさせた,食[た]べられた,食[た]べた,食[た]べたい"],
    ],
    conj: [{ pos: "verbRu", form: "passive", n: 1 }, { pos: "verbU", form: "passive", n: 2 }, { pos: "verbRu", form: "causative", n: 1 }, { pos: "verbU", form: "causative", n: 2 }],
    vocab: [],
  },

  {
    id: "u3-keigo", ref: "5.2", title: "Honorific and humble speech", jp: "敬語",
    blurb: "Respect for the listener and for others.",
    pages: [
      {
        h: "Two directions of respect",
        p: [
          "**Honorific (尊敬語)** raises the other person's actions. **Humble (謙譲語)** lowers your own. Together they are called 敬語 (keigo). You'll hear them at shops, offices and in announcements.",
          "Many common verbs have special replacements: 言う → おっしゃる (honorific) / 申す (humble); 食べる・飲む → 召し上がる / いただく; 行く・来る・いる → いらっしゃる / 参る・おる; 見る → ご覧になる / 拝見する; する → なさる / 致す.",
        ],
        ex: [
          ["先生[せんせい]|は|何[なん]|と|おっしゃいました|か", "What did the teacher say?"],
          ["明日[あした]|お|伺[うかが]い|します", "I will visit you tomorrow. (humble)"],
        ],
      },
      {
        h: "お〜になる and お〜する",
        p: [
          "For other verbs: honorific **お + stem + になる**; humble **お + stem + する**. Requests: **お + stem + ください**.",
        ],
        ex: [
          ["社長[しゃちょう]|は|もう|お|帰[かえ]り|に|なりました", "The president has already gone home."],
          ["少々[しょうしょう]|お|待[ま]ち|ください", "Please wait a moment."],
        ],
      },
    ],
    cloze: [
      ["少々[しょうしょう]|お|待[ま]ち*|ください", "Please wait a moment.", "お + stem + ください", "待[ま]ち,待[ま]って,待[ま]つ,待[ま]った"],
      ["社長[しゃちょう]|は|もう|お|帰[かえ]り|に*|なりました", "The president has already gone home.", "お + stem + になる", "に,を,が,で"],
    ],
    quiz: [
      ["Which kind of keigo lowers your own actions?", "Humble (謙譲語[けんじょうご])", "Honorific (尊敬語[そんけいご])", "Casual speech", "~Humble forms lower yourself to show respect."],
      ["Which is the honorific form of 言[い]う (to say)?", "おっしゃる", "申[もう]す", "言[い]う", "~おっしゃる is honorific; 申す is humble."],
      ["Which phrase means “please wait”, politely?", "お待[ま]ちください", "待[ま]て", "待[ま]った", "~お + stem + ください."],
    ],
    vocab: [],
  },

  {
    id: "u3-shimau", ref: "5.3", title: "Finishing or regretting: 〜てしまう", jp: "〜てしまう",
    blurb: "Done completely, or oops.",
    pages: [
      {
        h: "Completion and regret",
        p: ["te-form + **しまう** means doing something completely, or that it happened by accident or with regret. Casual speech contracts it: 〜てしまう → **〜ちゃう** (〜でしまう → 〜じゃう)."],
        ex: [
          ["宿題[しゅくだい]|を|全部[ぜんぶ]|やって|しまった", "I finished all my homework."],
          ["財布[さいふ]|を|忘[わす]れて|しまった", "Oh no, I forgot my wallet."],
          ["食[た]べちゃった", "I ate it! (oops / all of it)"],
        ],
      },
    ],
    cloze: [
      ["財布[さいふ]|を|忘[わす]れて*|しまった", "Oh no, I forgot my wallet.", "", "忘[わす]れて,忘[わす]れた,忘[わす]れる,忘[わす]れない"],
      ["食[た]べ|ちゃった*", "I ate it!", "", "ちゃった,てしまう,ている,ない"],
      ["宿題[しゅくだい]|を|全部[ぜんぶ]|やって*|しまった", "I finished all my homework.", "", "やって,やった,やる,やらない"],
    ],
    quiz: [
      ["What does casual 〜ちゃう stand for?", "〜てしまう", "〜ている", "〜てある", "~ちゃう is the casual contraction of てしまう."],
      ["Which feeling can 〜てしまう carry?", "Regret or completion", "Politeness", "A question", "~It shows something finished, often with regret."],
    ],
    vocab: [],
  },

  {
    id: "u3-koto", ref: "5.4", title: "Experience and timing: こと・ところ", jp: "こと・ところ",
    blurb: "Have you ever …? About to, in the middle of, just did.",
    pages: [
      {
        h: "こと: turning actions into nouns",
        p: ["**こと** turns a clause into a noun. **〜たことがある** = “have done it before”. **〜ことができる** = “be able to”."],
        ex: [
          ["日本[にほん]|へ|行[い]った|こと|が|ある", "I have been to Japan."],
          ["泳[およ]ぐ|こと|が|できる", "I can swim."],
        ],
      },
      {
        h: "ところ: a point in time",
        p: ["**ところ** = “the point where…”. Dictionary form + ところ: about to. 〜ている + ところ: in the middle of. 〜た + ところ: just did."],
        ex: [
          ["今[いま]|食[た]べる|ところ|です", "I'm just about to eat."],
          ["食[た]べている|ところ|です", "I'm in the middle of eating."],
          ["食[た]べた|ところ|です", "I just ate."],
        ],
      },
    ],
    cloze: [
      ["日本[にほん]|へ|行[い]った*|こと|が|ある", "I have been to Japan.", "Past form + ことがある", "行[い]った,行[い]く,行[い]って,行[い]かない"],
      ["食[た]べた*|ところ|です", "I just ate.", "Past form + ところ", "食[た]べた,食[た]べる,食[た]べている,食[た]べない"],
    ],
    vocab: [],
  },

  {
    id: "u3-certainty", ref: "5.5", title: "How sure are you?", jp: "かもしれない・でしょう",
    blurb: "Maybe, probably, surely.",
    pages: [
      {
        h: "Levels of certainty",
        p: [
          "**かもしれない** (polite: かもしれません) = “might, maybe”. Attach it to plain forms; for a noun or na-adjective just drop だ.",
          "**でしょう** (casual **だろう**) = “probably”. Add **きっと** (surely) or **たぶん** (probably) to colour it.",
        ],
        ex: [
          ["明日[あした]|は|雨[あめ]|かも|しれない", "It might rain tomorrow."],
          ["彼[かれ]|は|来[こ]ない|かも|しれません", "He might not come."],
          ["たぶん|大丈夫[だいじょうぶ]|でしょう", "It's probably fine."],
          ["きっと|合格[ごうかく]|する|でしょう", "You'll surely pass."],
        ],
      },
    ],
    cloze: [
      ["明日[あした]|は|雨[あめ]|かも*|しれない", "It might rain tomorrow.", "", "かも,でも,から,けど"],
      ["たぶん|大丈夫[だいじょうぶ]|でしょう*", "It's probably fine.", "", "でしょう,です,でした,ですか"],
    ],
    vocab: [],
  },

  {
    id: "u3-amount", ref: "5.6", title: "Only, too much and as much as", jp: "だけ・しか・すぎる",
    blurb: "Talking about amounts.",
    pages: [
      {
        h: "だけ and しか〜ない",
        p: ["**だけ** = only. **しか** is always followed by a negative: “nothing but, only”."],
        ex: [
          ["水[みず]|だけ|飲[の]む", "I only drink water."],
          ["千円[せんえん]|しか|ない", "I have only 1,000 yen."],
        ],
      },
      {
        h: "すぎる and も",
        p: ["Stem (or adjective stem) + **すぎる** = too much. **も** after an amount stresses that it is a lot."],
        ex: [
          ["食[た]べすぎた", "I ate too much."],
          ["この|問題[もんだい]|は|難[むずか]しすぎる", "This problem is too difficult."],
          ["三時間[さんじかん]|も|待[ま]った", "I waited as much as three hours."],
        ],
      },
    ],
    cloze: [
      ["千円[せんえん]|しか*|ない", "I have only 1,000 yen.", "しか needs a negative.", "しか,だけ,も,より"],
      ["水[みず]|だけ*|飲[の]む", "I only drink water.", "", "しか,だけ,も,より"],
      ["三時間[さんじかん]|も*|待[ま]った", "I waited as much as three hours.", "", "しか,だけ,も,より"],
    ],
    vocab: [],
  },

  {
    id: "u3-similar", ref: "5.7", title: "Seems, looks like, I heard", jp: "ようだ・そうだ・らしい",
    blurb: "Evidence and hearsay.",
    pages: [
      {
        h: "Looks and seems",
        p: [
          "**ようだ / みたいだ**: seems like, based on what you perceive. **〜そう** (on a stem): looks like it's about to; 美味しそう = looks delicious.",
        ],
        ex: [
          ["雨[あめ]|が|降[ふ]る|ようだ", "It seems like it's going to rain."],
          ["彼[かれ]|は|子供[こども]|みたいだ", "He is like a child."],
          ["美味[おい]しそう", "It looks delicious."],
        ],
      },
      {
        h: "Hearsay",
        p: ["Plain form + **そうだ** means “I heard that …”. **らしい** is “apparently”, based on information you've picked up."],
        ex: [
          ["明日[あした]|は|雨[あめ]|だ|そうだ", "I heard it will rain tomorrow."],
          ["彼[かれ]|は|医者[いしゃ]|らしい", "Apparently he is a doctor."],
        ],
      },
    ],
    cloze: [
      ["美味[おい]しそう*", "It looks delicious.", "Stem + そう = looks like", "美味[おい]しそう,美味[おい]しいそう,美味[おい]しくそう,美味[おい]しだ"],
      ["彼[かれ]|は|医者[いしゃ]|らしい*", "Apparently he is a doctor.", "", "らしい,そうだ,ようだ,みたい"],
    ],
    vocab: [],
  },

  {
    id: "u3-compare", ref: "5.8", title: "Comparing", jp: "より・方・一番",
    blurb: "Better than, the most, depends on.",
    pages: [
      {
        h: "Comparing two things",
        p: ["**A は B より …** = A is more … than B. **A の方が …** puts the emphasis on the winner. **〜た方がいい** = “you had better …”."],
        ex: [
          ["電車[でんしゃ]|は|バス|より|早[はや]い", "The train is faster than the bus."],
          ["バス|より|電車[でんしゃ]|の|方[ほう]|が|早[はや]い", "The train is faster than the bus."],
          ["早[はや]く|寝[ね]た|方[ほう]|が|いい", "You should go to bed early."],
        ],
      },
      {
        h: "The most, and “it depends”",
        p: ["**一番** = the most / number one. **によって** = depending on."],
        ex: [
          ["日本[にほん]|で|富士山[ふじさん]|が|一番[いちばん]|高[たか]い", "In Japan, Mt. Fuji is the highest."],
          ["人[ひと]|によって|違[ちが]う", "It depends on the person."],
        ],
      },
    ],
    cloze: [
      ["電車[でんしゃ]|は|バス|より*|早[はや]い", "The train is faster than the bus.", "より marks the thing compared against.", "より,だけ,しか,も"],
      ["日本[にほん]|で|富士山[ふじさん]|が|一番[いちばん]*|高[たか]い", "In Japan, Mt. Fuji is the highest.", "", "一番[いちばん],少[すこ]し,とても,もっと"],
    ],
    vocab: [],
  },

  {
    id: "u3-easy", ref: "5.9", title: "Easy and hard to do", jp: "〜やすい・〜にくい",
    blurb: "Attach to the stem.",
    pages: [
      {
        h: "Stem + やすい / にくい",
        p: ["Add **やすい** (easy to) or **にくい** (hard to) to the verb stem. Both then act like i-adjectives. **づらい** is a more emotional “hard to”."],
        ex: [
          ["この|ペン|は|書[か]きやすい", "This pen is easy to write with."],
          ["この|漢字[かんじ]|は|読[よ]みにくい", "This kanji is hard to read."],
          ["食[た]べづらい", "It's hard to eat."],
        ],
      },
    ],
    cloze: [
      ["この|ペン|は|書[か]きやすい*", "This pen is easy to write with.", "", "書[か]きやすい,書[か]きにくい,書[か]くやすい,書[か]いやすい"],
      ["この|漢字[かんじ]|は|読[よ]みにくい*", "This kanji is hard to read.", "", "読[よ]みやすい,読[よ]みにくい,読[よ]むにくい,読[よ]んにくい"],
    ],
    quiz: [
      ["What do you attach やすい to?", "The verb stem (ます-stem)", "The dictionary form", "The te-form", "~書く → 書きやすい: stem + やすい."],
      ["Which means “hard to do”?", "〜にくい", "〜やすい", "〜たい", "~にくい = hard to."],
    ],
    vocab: [],
  },

  {
    id: "u3-without", ref: "5.10", title: "Without doing", jp: "〜ないで・〜ずに",
    blurb: "Doing one thing without another.",
    pages: [
      {
        h: "ないで and ずに",
        p: ["Negative + **で** = “without doing”. **ずに** is the more formal version (する → せずに). **なくて** gives a reason: “not doing, so …”."],
        ex: [
          ["朝[あさ]|ご|飯[はん]|を|食[た]べないで|学校[がっこう]|へ|行[い]った", "I went to school without eating breakfast."],
          ["傘[かさ]|を|持[も]たないで|出[で]かけた", "I went out without taking an umbrella."],
          ["何[なに]も|言[い]わずに|帰[かえ]った", "He went home without saying anything."],
          ["行[い]かなくて|よかった", "I'm glad I didn't go."],
        ],
      },
    ],
    cloze: [
      ["傘[かさ]|を|持[も]たないで*|出[で]かけた", "I went out without taking an umbrella.", "", "持[も]たないで,持[も]たなくて,持[も]たない,持[も]って"],
      ["行[い]かなくて*|よかった", "I'm glad I didn't go.", "", "行[い]かなくて,行[い]かないで,行[い]かない,行[い]って"],
    ],
    conj: [{ pos: "verb", form: "naide", n: 3 }],
    vocab: [],
  },

  {
    id: "u3-wake", ref: "5.11", title: "Reasons and conclusions: わけ", jp: "わけ",
    blurb: "That's why. There's no way.",
    pages: [
      {
        h: "わけ: the reasoning behind it",
        p: [
          "**わけ** means “reason, logic”. **〜わけだ** = “that's why / it follows that”. **〜わけがない** = “there's no way that …”. **〜わけではない** = “it's not that …”.",
        ],
        ex: [
          ["それ|が|嘘[うそ]|な|わけ|が|ない", "There's no way that's a lie."],
          ["そういう|わけ|です", "That's the reason."],
          ["彼[かれ]|が|来[こ]ない|わけ|じゃない", "It's not that he isn't coming."],
        ],
      },
    ],
    cloze: [
      ["それ|が|嘘[うそ]|な|わけ*|が|ない", "There's no way that's a lie.", "", "わけ,こと,もの,ところ"],
      ["そういう|わけ*|です", "That's the reason.", "", "わけ,こと,もの,ところ"],
    ],
    quiz: [["What does 〜わけではない express?", "It's not that …", "There is no way that …", "I want to …", "~〜わけではない softens a claim: it's not that …"], ["What does 〜わけがない express?", "There's no way that …", "It's probably that …", "I want to …", "~わけがない = no way."]],
    vocab: [],
  },

  {
    id: "u3-time", ref: "5.12", title: "Time-specific actions", jp: "ばかり・とたん・ながら",
    blurb: "Just now, the moment that, while.",
    pages: [
      {
        h: "ばかり and とたん",
        p: ["Past form + **ばかり** = “just did”. Past form + **とたん(に)** = “the moment that …”, for things happening immediately and unexpectedly."],
        ex: [
          ["食[た]べた|ばかり|です", "I just ate."],
          ["家[いえ]|を|出[で]た|とたん|に|雨[あめ]|が|降[ふ]り|出[だ]した", "The moment I left the house, it began to rain."],
        ],
      },
      {
        h: "ながら: while",
        p: ["Stem + **ながら** = doing two things at once. The main action goes last."],
        ex: [["音楽[おんがく]|を|聞[き]き|ながら|勉強[べんきょう]|する", "I study while listening to music."]],
      },
    ],
    cloze: [
      ["音楽[おんがく]|を|聞[き]き|ながら*|勉強[べんきょう]|する", "I study while listening to music.", "Stem + ながら", "ながら,ばかり,とたん,たら"],
      ["食[た]べた|ばかり*|です", "I just ate.", "", "ながら,ばかり,とたん,たら"],
      ["家[いえ]|を|出[で]た|とたん*|に|雨[あめ]|が|降[ふ]り|出[だ]した", "The moment I left the house, it began to rain.", "", "ながら,ばかり,とたん,たら"],
    ],
    quiz: [["Which pattern means “while doing”?", "Stem + ながら", "Past form + ばかり", "Te-form + いる", "~ながら joins two simultaneous actions."]],
    vocab: [],
  },
];
