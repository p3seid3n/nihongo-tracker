// Writing prompts for output practice. Each has a model answer to compare with after you write.
const P = (id, level, en, model, tip = "") => ({ id, level, en, model, tip });

export const PROMPTS = [
  P("intro", 1, "Introduce yourself: your name, that you are a student, and one thing you like.", [
    ["私[わたし]の名前[なまえ]はアンです。", "My name is Ann."],
    ["学生[がくせい]です。", "I am a student."],
    ["音楽[おんがく]が好[す]きです。", "I like music."],
  ], "は and が, です"),
  P("morning", 1, "Describe your morning: when you get up and what you eat.", [
    ["私[わたし]は七時[しちじ]に起[お]きます。", "I get up at seven."],
    ["朝[あさ]ご飯[はん]にパンを食[た]べます。", "I eat bread for breakfast."],
    ["それから、学校[がっこう]に行[い]きます。", "After that, I go to school."],
  ], "に for times, を for what you eat"),
  P("food", 1, "Say what food you like and one you do not like.", [
    ["私[わたし]はラーメンが好[す]きです。", "I like ramen."],
    ["でも、野菜[やさい]はあまり好[す]きじゃありません。", "But I do not like vegetables much."],
  ], "が好きです, あまり〜ません"),
  P("room", 1, "Describe your room: what is in it?", [
    ["私[わたし]の部屋[へや]は小[ちい]さいです。", "My room is small."],
    ["ベッドと机[つくえ]があります。", "There is a bed and a desk."],
    ["机[つくえ]の上[うえ]に本[ほん]があります。", "There are books on the desk."],
  ], "〜があります for things"),
  P("yesterday", 2, "What did you do yesterday?", [
    ["昨日[きのう]は友達[ともだち]に会[あ]いました。", "Yesterday I met a friend."],
    ["一緒[いっしょ]に映画[えいが]を見[み]ました。", "We watched a movie together."],
    ["とても面白[おもしろ]かったです。", "It was very interesting."],
  ], "past tense: ました, かったです"),
  P("weekend", 2, "What will you do this weekend?", [
    ["今週末[こんしゅうまつ]は友達[ともだち]と買[か]い物[もの]に行[い]きます。", "This weekend I will go shopping with a friend."],
    ["日曜日[にちようび]は家[いえ]で勉強[べんきょう]します。", "On Sunday I will study at home."],
  ], "と for with, に行きます"),
  P("family", 2, "Write about a person in your family or a friend: what they do and what they are like.", [
    ["母[はは]は先生[せんせい]です。", "My mother is a teacher."],
    ["母[はは]は料理[りょうり]が上手[じょうず]です。", "My mother is good at cooking."],
    ["私[わたし]は母[はは]の料理[りょうり]が大好[だいす]きです。", "I love my mother's cooking."],
  ], "の, が上手です"),
  P("japanese", 2, "Why are you learning Japanese?", [
    ["日本[にほん]のゲームが好[す]きなので、日本語[にほんご]を勉強[べんきょう]しています。", "I like Japanese games, so I am studying Japanese."],
    ["いつか日本[にほん]に行[い]きたいです。", "Someday I want to go to Japan."],
  ], "ので, たいです, ています"),
  P("hobby", 3, "Talk about a hobby: what it is, how often you do it and why you like it.", [
    ["私[わたし]の趣味[しゅみ]は絵[え]を描[か]くことです。", "My hobby is drawing."],
    ["毎日[まいにち]三十分[さんじゅっぷん]ぐらい描[か]きます。", "I draw for about thirty minutes every day."],
    ["楽[たの]しいので、やめられません。", "It is so fun that I cannot stop."],
  ], "ことです, ので"),
  P("trip", 3, "Write about a place you would like to visit and why.", [
    ["私[わたし]は京都[きょうと]に行[い]きたいです。", "I want to go to Kyoto."],
    ["お寺[てら]がたくさんあるからです。", "It is because there are many temples."],
    ["おいしい物[もの]も食[た]べてみたいです。", "I would also like to try eating delicious things."],
  ], "からです, てみたい"),
  P("opinion", 3, "Is Japanese hard? Give your opinion and one reason.", [
    ["日本語[にほんご]は難[むずか]しいと思[おも]います。", "I think Japanese is difficult."],
    ["漢字[かんじ]がたくさんあるからです。", "It is because there are many kanji."],
    ["でも、面白[おもしろ]いです。", "But it is interesting."],
  ], "と思います, から"),
  P("request", 3, "Politely ask a friend to help you, and suggest studying together.", [
    ["すみません、ちょっと手伝[てつだ]ってください。", "Sorry, please help me a little."],
    ["明日[あした]、一緒[いっしょ]に勉強[べんきょう]しませんか。", "Would you like to study together tomorrow?"],
  ], "てください, ませんか"),
];

export const PROMPT_BY_ID = Object.fromEntries(PROMPTS.map((p) => [p.id, p]));
