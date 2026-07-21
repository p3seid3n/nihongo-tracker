import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ================= CURRICULUM (Tae Kim's Grammar Guide, in order) ================= */

const CURRICULUM = [
  { phase: "Basic Grammar", target: "Months 1–4", items: [
    { id: "state", jp: "だ", en: "State of being", url: "https://guidetojapanese.org/learn/grammar/stateofbeing" },
    { id: "particles1", jp: "は・も・が", en: "Intro particles", url: "https://guidetojapanese.org/learn/grammar/particlesintro" },
    { id: "adjectives", jp: "形容詞", en: "Adjectives", url: "https://guidetojapanese.org/learn/grammar/adjectives" },
    { id: "verbs", jp: "動詞", en: "Verb basics (ru/u)", url: "https://guidetojapanese.org/learn/grammar/verbs" },
    { id: "negverbs", jp: "否定", en: "Negative verbs", url: "https://guidetojapanese.org/learn/grammar/negativeverbs" },
    { id: "past", jp: "過去形", en: "Past tense", url: "https://guidetojapanese.org/learn/grammar/past_tense" },
    { id: "verbparticles", jp: "を・に・へ・で", en: "Verb particles", url: "https://guidetojapanese.org/learn/grammar/verbparticles" },
    { id: "transitivity", jp: "自他動詞", en: "Transitivity", url: "https://guidetojapanese.org/learn/grammar/transitivity" },
    { id: "subclause", jp: "従属節", en: "Descriptive clauses", url: "https://guidetojapanese.org/learn/grammar/clause" },
    { id: "nounparticles", jp: "の", en: "Noun particles", url: "https://guidetojapanese.org/learn/grammar/nounparticles" },
    { id: "adverbs", jp: "副詞", en: "Adverbs & gobi", url: "https://guidetojapanese.org/learn/grammar/adgobi" },
  ]},
  { phase: "Essential Grammar", target: "Months 4–10", items: [
    { id: "polite", jp: "です・ます", en: "Polite form", url: "https://guidetojapanese.org/learn/grammar/polite" },
    { id: "question", jp: "か", en: "Question marker", url: "https://guidetojapanese.org/learn/grammar/question" },
    { id: "compound", jp: "て形", en: "Compound sentences", url: "https://guidetojapanese.org/learn/grammar/compound" },
    { id: "teform", jp: "〜ている", en: "Ongoing actions", url: "https://guidetojapanese.org/learn/grammar/teform" },
    { id: "potential", jp: "可能形", en: "Potential form", url: "https://guidetojapanese.org/learn/grammar/potential" },
    { id: "suru", jp: "する・なる", en: "Using suru/naru", url: "https://guidetojapanese.org/learn/grammar/surunaru" },
    { id: "conditionals", jp: "条件", en: "Conditionals", url: "https://guidetojapanese.org/learn/grammar/conditionals" },
    { id: "must", jp: "〜なければ", en: "Have to / must", url: "https://guidetojapanese.org/learn/grammar/must" },
    { id: "desire", jp: "たい・欲しい", en: "Desire & suggestions", url: "https://guidetojapanese.org/learn/grammar/desire" },
    { id: "quotation", jp: "と・って", en: "Quoting", url: "https://guidetojapanese.org/learn/grammar/quotation" },
    { id: "try", jp: "〜てみる", en: "Trying things", url: "https://guidetojapanese.org/learn/grammar/try" },
    { id: "givereceive", jp: "あげる・くれる・もらう", en: "Giving & receiving", url: "https://guidetojapanese.org/learn/grammar/favors" },
    { id: "request", jp: "〜てください", en: "Requests", url: "https://guidetojapanese.org/learn/grammar/requests" },
    { id: "numbers", jp: "数字", en: "Numbers & counting", url: "https://guidetojapanese.org/learn/grammar/numbers" },
    { id: "casual", jp: "砕けた話し方", en: "Casual patterns & slang", url: "https://guidetojapanese.org/learn/grammar/casual" },
  ]},
  { phase: "Special Expressions", target: "Months 10–18", items: [
    { id: "causative", jp: "使役・受身", en: "Causative & passive", url: "https://guidetojapanese.org/learn/grammar/causepass" },
    { id: "honorific", jp: "敬語", en: "Honorifics (keigo)", url: "https://guidetojapanese.org/learn/grammar/honorific" },
    { id: "unintended", jp: "〜てしまう", en: "Unintended actions", url: "https://guidetojapanese.org/learn/grammar/unintended" },
    { id: "genericnouns", jp: "こと・ところ・もの", en: "Generic nouns", url: "https://guidetojapanese.org/learn/grammar/generic" },
    { id: "certainty", jp: "はず・べき", en: "Certainty & expectation", url: "https://guidetojapanese.org/learn/grammar/certainty" },
    { id: "amounts", jp: "だけ・しか・ばかり", en: "Amounts & extents", url: "https://guidetojapanese.org/learn/grammar/amount" },
    { id: "similarity", jp: "よう・みたい・そう", en: "Similarity & hearsay", url: "https://guidetojapanese.org/learn/grammar/similarity" },
    { id: "comparison", jp: "方・比べる", en: "Comparisons", url: "https://guidetojapanese.org/learn/grammar/comparison" },
  ]},
  { phase: "Advanced → Immersion-led", target: "Months 18–30", items: [
    { id: "formal", jp: "である", en: "Formal expressions", url: "https://guidetojapanese.org/learn/grammar/formal" },
    { id: "advvolitional", jp: "意向形", en: "Volitional nuances", url: "https://guidetojapanese.org/learn/grammar/volitional2" },
    { id: "advcovered", jp: "多読", en: "Switch: mostly reading & talking", url: "https://guidetojapanese.org/learn/grammar" },
  ]},
];

const ALL_ITEMS = CURRICULUM.flatMap((p) => p.items);

const MILESTONES = [
  { at: 0, label: "Start", sub: "Kana + RRTK begun ✓" },
  { at: 3, label: "300 kanji", sub: "Resume Kaishi 1.5k (5/day)" },
  { at: 6, label: "Basic grammar done", sub: "Text your friend daily, simple sentences" },
  { at: 10, label: "RRTK complete (~1000)", sub: "Kaishi at 10/day" },
  { at: 14, label: "Kaishi 1.5k finished", sub: "Dual subs (Language Reactor / Animelon)" },
  { at: 18, label: "Essential grammar done", sub: "Weekly JP calls with your friend" },
  { at: 24, label: "JP subs comfortable", sub: "Reading manga, mining vocab from anime" },
  { at: 30, label: "Matura — conversational", sub: "会話ができる。飛べ。" },
];

const STORAGE_KEY = "jsh-v1";

const EMPTY_FORM = {
  kanji: "", vocab: "", minutes: "", retention: "",
  daysStudied: "", secPerCard: "", mature: "", medianInterval: "",
};

/* Which AnkiDroid stat feeds each field */
const FIELD_MAP = [
  ["kanji", "Kanji known", "「Estimated total knowledge」 in RRTK", "141"],
  ["vocab", "Vocab known", "「Estimated total knowledge」 in Kaishi", "0"],
  ["retention", "Retention %", "「Retention → Today → All」", "100"],
  ["minutes", "Min/day avg", "「Reviews → Average for days studied」 (min)", "13"],
  ["daysStudied", "Days studied %", "「Reviews → Days studied」 percentage", "35"],
  ["secPerCard", "Sec/card", "「Today → …s/card」", "19.8"],
  ["mature", "Mature cards", "「Card Counts → Mature」", "70"],
  ["medianInterval", "Median interval (d)", "「Review Intervals → Median interval」", "23"],
];

export default function JapaneseStudyApp() {
  const [tab, setTab] = useState("dash");
  const [state, setState] = useState({ logs: [], lessons: [], startDate: null });
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({ logs: [], lessons: [], startDate: null, ...parsed });
        }
      } catch (e) { /* first run */ }
      setLoaded(true);
    })();
  }, []);

  const persist = async (next) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      setSaveMsg("Couldn't save — check connection");
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

  const addLog = () => {
    const kanji = num(form.kanji);
    if (kanji === null) { setSaveMsg("Kanji count is required"); setTimeout(() => setSaveMsg(""), 2500); return; }
    const today = new Date().toISOString().slice(0, 10);
    const entry = {
      date: today,
      kanji,
      vocab: num(form.vocab) ?? 0,
      minutes: num(form.minutes),
      retention: num(form.retention),
      daysStudied: num(form.daysStudied),
      secPerCard: num(form.secPerCard),
      mature: num(form.mature),
      medianInterval: num(form.medianInterval),
    };
    const logs = state.logs.filter((l) => l.date !== today);
    logs.push(entry);
    logs.sort((a, b) => a.date.localeCompare(b.date));
    persist({ ...state, logs, startDate: state.startDate || today });
    setForm(EMPTY_FORM);
    setSaveMsg("Saved ✓");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const toggleLesson = (id) => {
    const lessons = state.lessons.includes(id)
      ? state.lessons.filter((l) => l !== id)
      : [...state.lessons, id];
    persist({ ...state, lessons });
  };

  const clearAll = () => {
    if (!confirm("Reset ALL progress data? This can't be undone.")) return;
    persist({ logs: [], lessons: [], startDate: null });
  };

  const latest = state.logs[state.logs.length - 1];
  const prev = state.logs[state.logs.length - 2];
  const kanjiNow = latest ? latest.kanji : 141;
  const vocabNow = latest ? latest.vocab : 0;
  const kanjiDelta = latest && prev ? latest.kanji - prev.kanji : null;
  const lessonsDone = state.lessons.length;
  const lessonPct = Math.round((lessonsDone / ALL_ITEMS.length) * 100);

  const monthsIn = useMemo(() => {
    if (!state.startDate) return 0;
    return Math.max(0, (Date.now() - new Date(state.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4));
  }, [state.startDate]);

  /* pace projection: kanji/week from last two logs → weeks to 1000 */
  const projection = useMemo(() => {
    if (state.logs.length < 2) return null;
    const a = state.logs[0], b = state.logs[state.logs.length - 1];
    const days = (new Date(b.date) - new Date(a.date)) / (1000 * 60 * 60 * 24);
    if (days < 5 || b.kanji <= a.kanji) return null;
    const perDay = (b.kanji - a.kanji) / days;
    const daysLeft = Math.ceil((1000 - b.kanji) / perDay);
    const finish = new Date(Date.now() + daysLeft * 86400000);
    return { perDay: perDay.toFixed(1), finish: finish.toLocaleDateString("de-CH", { month: "short", year: "numeric" }) };
  }, [state.logs]);

  const chartData = state.logs.map((l) => ({
    date: l.date.slice(5),
    Kanji: l.kanji,
    Vocab: l.vocab,
    Retention: l.retention,
    "Min/day": l.minutes,
    Consistency: l.daysStudied,
  }));

  const kanjiPct = Math.min(100, Math.round((kanjiNow / 1000) * 100));
  const vocabPct = Math.min(100, Math.round((vocabNow / 1500) * 100));

  if (!loaded) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F5EF", fontFamily: "sans-serif", color: "#5C574D" }}>読み込み中…</div>;
  }

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
        :root {
          --paper:#F7F5EF; --grid:#E4E0D4; --ink:#1F1D1A; --soft:#5C574D;
          --hanko:#C43227; --indigo:#33506B; --indigo-soft:#DDE4EA; --done:#4A7B4F;
        }
        *{box-sizing:border-box;margin:0}
        .app{
          min-height:100vh;color:var(--ink);font-family:'Zen Kaku Gothic New',sans-serif;
          background-color:var(--paper);
          background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
          background-size:28px 28px;padding:0 16px 110px;
        }
        .wrap{max-width:680px;margin:0 auto}
        .top{display:flex;align-items:center;justify-content:space-between;padding:22px 0 14px}
        .logo{font-family:'Shippori Mincho',serif;font-weight:800;font-size:26px}
        .logo span{color:var(--hanko)}
        .savemsg{font-size:12px;color:var(--done);font-weight:700}
        .tabs{
          position:fixed;bottom:0;left:0;right:0;z-index:10;background:var(--paper);
          border-top:2px solid var(--ink);display:flex;justify-content:space-around;
          padding:8px 6px calc(10px + env(safe-area-inset-bottom));
        }
        .tab{background:none;border:none;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--soft);font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px}
        .tab .k{font-family:'Shippori Mincho',serif;font-size:19px;font-weight:800}
        .tab.on{color:var(--hanko)}
        .tab:focus-visible{outline:2px solid var(--indigo);outline-offset:2px}
        .card{background:rgba(255,255,255,0.78);border:1.5px solid var(--ink);border-radius:5px;padding:16px;margin-bottom:14px}
        h2{font-family:'Shippori Mincho',serif;font-size:17px;font-weight:800;margin-bottom:10px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
        h2 .en{font-family:'Zen Kaku Gothic New',sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);font-weight:700}
        .statrow{display:flex;gap:12px;flex-wrap:wrap}
        .stat{flex:1;min-width:90px}
        .stat .n{font-family:'Shippori Mincho',serif;font-size:26px;font-weight:800}
        .stat .n small{font-size:13px;color:var(--done);font-weight:700}
        .stat .l{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}
        .bar{height:8px;background:var(--indigo-soft);border-radius:4px;margin-top:6px;overflow:hidden}
        .bar>div{height:100%;background:var(--indigo);border-radius:4px;transition:width .4s}
        .bar.red>div{background:var(--hanko)}
        .bar.green>div{background:var(--done)}
        .hint{font-size:12.5px;color:var(--soft);line-height:1.6;margin-top:8px}
        .pillrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .pill{border:1.5px solid var(--ink);border-radius:4px;padding:6px 10px;font-size:12px;background:#fff}
        .pill b{font-family:'Shippori Mincho',serif}
        input{font-family:inherit;font-size:15px;padding:10px 12px;border:1.5px solid var(--ink);border-radius:4px;background:#fff;width:100%}
        input:focus-visible{outline:2px solid var(--indigo)}
        .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
        label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);display:block;margin-bottom:3px}
        .where{font-size:10.5px;color:var(--soft);margin-top:3px;line-height:1.4}
        .req{color:var(--hanko)}
        .btn{font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;background:var(--hanko);color:#fff;border:none;border-radius:4px;padding:11px 18px;width:100%}
        .btn:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
        .btn.ghost{background:transparent;color:var(--soft);border:1.5px dashed var(--soft);margin-top:8px;font-size:12px;padding:8px}
        .phasehead{display:flex;align-items:baseline;gap:10px;margin:20px 0 10px;border-bottom:2px solid var(--ink);padding-bottom:6px}
        .phasehead .t{font-family:'Shippori Mincho',serif;font-weight:800;font-size:15px}
        .phasehead .d{margin-left:auto;font-size:11px;color:var(--hanko);font-weight:700}
        .lesson{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.78);border:1.5px solid var(--ink);border-radius:4px;padding:10px 12px;margin-bottom:8px}
        .lesson.done{opacity:.55}
        .lesson.done .le{text-decoration:line-through}
        .cb{width:22px;height:22px;border:2px solid var(--ink);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;background:transparent;cursor:pointer;padding:0}
        .lesson.done .cb{background:var(--done);border-color:var(--done)}
        .cb:focus-visible{outline:2px solid var(--indigo);outline-offset:2px}
        .lj{font-family:'Shippori Mincho',serif;font-weight:800;font-size:15px;color:var(--indigo);min-width:88px}
        .le{font-size:13.5px;font-weight:700;flex:1}
        .llink{font-size:12px;color:var(--indigo);font-weight:700;text-decoration:none;border-bottom:1.5px solid var(--indigo);white-space:nowrap}
        .tl{position:relative;padding-left:30px}
        .tl::before{content:'';position:absolute;left:10px;top:6px;bottom:6px;width:2px;background:var(--ink)}
        .ms{position:relative;margin-bottom:16px}
        .ms .dot{position:absolute;left:-30px;top:2px;width:20px;height:20px;border-radius:50%;border:2px solid var(--ink);background:var(--paper)}
        .ms.hit .dot{background:var(--done);border-color:var(--done)}
        .ms.now .dot{background:var(--hanko);border-color:var(--hanko)}
        .ms .mt{font-weight:700;font-size:14px}
        .ms .mm{font-size:11px;color:var(--hanko);font-weight:700;letter-spacing:.06em}
        .ms .msb{font-size:12.5px;color:var(--soft)}
        .loghist{font-size:12px;color:var(--soft);border-top:1px dashed var(--grid);padding-top:8px;margin-top:8px;line-height:1.7}
        .loghist b{color:var(--ink)}
        .charttitle{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--soft);margin:14px 0 6px}
      `}</style>

      <div className="wrap">
        <div className="top">
          <div className="logo">日本語<span>。</span></div>
          <div className="savemsg">{saveMsg}</div>
        </div>

        {/* ============ DASHBOARD ============ */}
        {tab === "dash" && (
          <>
            <div className="card">
              <h2>現在 <span className="en">Where you are</span></h2>
              <div className="statrow">
                <div className="stat">
                  <div className="n">{kanjiNow}{kanjiDelta > 0 && <small> +{kanjiDelta}</small>}</div>
                  <div className="l">Kanji / 1000</div>
                  <div className="bar red"><div style={{ width: `${kanjiPct}%` }} /></div>
                </div>
                <div className="stat">
                  <div className="n">{vocabNow}</div>
                  <div className="l">Vocab / 1500</div>
                  <div className="bar"><div style={{ width: `${vocabPct}%` }} /></div>
                </div>
                <div className="stat">
                  <div className="n">{lessonsDone}<span style={{ fontSize: 15, color: "var(--soft)" }}>/{ALL_ITEMS.length}</span></div>
                  <div className="l">Grammar</div>
                  <div className="bar green"><div style={{ width: `${lessonPct}%` }} /></div>
                </div>
              </div>
              {latest && (
                <div className="pillrow">
                  {latest.retention != null && <span className="pill">安定 Retention <b>{latest.retention}%</b></span>}
                  {latest.mature != null && <span className="pill">成熟 Mature <b>{latest.mature}</b></span>}
                  {latest.secPerCard != null && <span className="pill">速度 <b>{latest.secPerCard}s</b>/card</span>}
                  {latest.medianInterval != null && <span className="pill">間隔 Median <b>{latest.medianInterval}d</b></span>}
                  {latest.daysStudied != null && <span className="pill">継続 Consistency <b>{latest.daysStudied}%</b></span>}
                </div>
              )}
              {projection && (
                <p className="hint">
                  Pace: <b>{projection.perDay} kanji/day</b> → at this rate you hit 1000 around <b>{projection.finish}</b>.
                </p>
              )}
              {latest && latest.daysStudied != null && latest.daysStudied < 60 && (
                <p className="hint" style={{ color: "var(--hanko)" }}>
                  ⚠ Consistency {latest.daysStudied}% — days studied matters more than cards/day. Aim for 80%+, even if some days are 5 minutes.
                </p>
              )}
            </div>

            <div className="card">
              <h2>進歩 <span className="en">Progress</span></h2>
              {chartData.length >= 2 ? (
                <>
                  <div className="charttitle">Knowledge — kanji & vocab</div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <Tooltip contentStyle={{ fontFamily: "inherit", fontSize: 13, border: "1.5px solid #1F1D1A", borderRadius: 4 }} />
                        <ReferenceLine y={1000} stroke="#C43227" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="Kanji" stroke="#C43227" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Vocab" stroke="#33506B" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="charttitle">Quality — retention % & consistency %</div>
                  <div style={{ width: "100%", height: 160 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <Tooltip contentStyle={{ fontFamily: "inherit", fontSize: 13, border: "1.5px solid #1F1D1A", borderRadius: 4 }} />
                        <ReferenceLine y={85} stroke="#4A7B4F" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="Retention" stroke="#4A7B4F" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="Consistency" stroke="#8B7355" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="charttitle">Effort — minutes per day</div>
                  <div style={{ width: "100%", height: 140 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <Tooltip contentStyle={{ fontFamily: "inherit", fontSize: 13, border: "1.5px solid #1F1D1A", borderRadius: 4 }} />
                        <Bar dataKey="Min/day" fill="#33506B" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="hint">Log your Anki stats at least twice (記 tab) and three charts appear here: knowledge growth, review quality, and study effort.</p>
              )}
            </div>

            <div className="card">
              <h2>今日 <span className="en">Today's rhythm</span></h2>
              <p className="hint" style={{ marginTop: 0 }}>
                ① Anki first (kana + RRTK, ~25 min) · ② one grammar section (~15 min) ·
                ③ one sentence to your friend · ④ one episode. On brutal Matura-prep days, Anki alone keeps the streak alive.
              </p>
            </div>
          </>
        )}

        {/* ============ LOG ============ */}
        {tab === "log" && (
          <div className="card">
            <h2>記録 <span className="en">Weekly Anki log</span></h2>
            <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
              Once a week: open AnkiDroid → RRTK deck → stats, and copy the numbers below.
              Each label tells you exactly where to find it. Only kanji is required — fill what you have.
            </p>
            <div className="fgrid">
              {FIELD_MAP.map(([key, label, where, ph]) => (
                <div key={key}>
                  <label htmlFor={key}>{label}{key === "kanji" && <span className="req"> *</span>}</label>
                  <input id={key} inputMode="decimal" placeholder={ph} value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  <div className="where">{where}</div>
                </div>
              ))}
            </div>
            <button className="btn" onClick={addLog}>Save this week</button>
            {state.logs.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {state.logs.slice(-6).reverse().map((l) => (
                  <div className="loghist" key={l.date}>
                    <b>{l.date}</b> — 漢字 {l.kanji} · 語彙 {l.vocab}
                    {l.retention != null && ` · ret ${l.retention}%`}
                    {l.minutes != null && ` · ${l.minutes} min/d`}
                    {l.daysStudied != null && ` · consistency ${l.daysStudied}%`}
                    {l.mature != null && ` · mature ${l.mature}`}
                  </div>
                ))}
              </div>
            )}
            <button className="btn ghost" onClick={clearAll}>Reset all data</button>
          </div>
        )}

        {/* ============ GRAMMAR ============ */}
        {tab === "grammar" && (
          <>
            <div className="card" style={{ marginBottom: 6 }}>
              <h2>文法 <span className="en">Tae Kim curriculum — {lessonsDone}/{ALL_ITEMS.length} done</span></h2>
              <div className="bar green"><div style={{ width: `${lessonPct}%` }} /></div>
              <p className="hint">Top to bottom, one or two a week. Read → copy an example into your notebook → write your own.</p>
            </div>
            {CURRICULUM.map((p) => (
              <div key={p.phase}>
                <div className="phasehead">
                  <span className="t">{p.phase}</span>
                  <span className="d">{p.target}</span>
                </div>
                {p.items.map((it) => {
                  const done = state.lessons.includes(it.id);
                  return (
                    <div key={it.id} className={`lesson ${done ? "done" : ""}`}>
                      <button className="cb" aria-label={done ? "Mark not done" : "Mark done"} onClick={() => toggleLesson(it.id)}>{done ? "✓" : ""}</button>
                      <span className="lj">{it.jp}</span>
                      <span className="le">{it.en}</span>
                      <a className="llink" href={it.url} target="_blank" rel="noreferrer">Read →</a>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {/* ============ TIMELINE ============ */}
        {tab === "timeline" && (
          <>
            <div className="card">
              <h2>道 <span className="en">Road to Matura — month {monthsIn.toFixed(0)} of 30</span></h2>
              <div className="bar red"><div style={{ width: `${Math.min(100, (monthsIn / 30) * 100)}%` }} /></div>
              <p className="hint">
                {state.startDate
                  ? `Started ${state.startDate}. Hold ~45 min/day and the last milestone lands right at graduation.`
                  : "Save your first log and the clock starts running."}
              </p>
            </div>
            <div className="card">
              <div className="tl">
                {MILESTONES.map((m) => {
                  const hit = monthsIn >= m.at && m.at !== 30;
                  const now = !hit && monthsIn < m.at && MILESTONES.filter((x) => x.at > monthsIn)[0]?.at === m.at;
                  return (
                    <div key={m.at} className={`ms ${hit ? "hit" : ""} ${now ? "now" : ""}`}>
                      <div className="dot" />
                      <div className="mm">MONTH {m.at}</div>
                      <div className="mt">{m.label}</div>
                      <div className="msb">{m.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="tabs">
        {[["dash", "家", "Home"], ["log", "記", "Log"], ["grammar", "文", "Grammar"], ["timeline", "道", "Timeline"]].map(([id, k, l]) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            <span className="k">{k}</span>{l}
          </button>
        ))}
      </nav>
    </div>
  );
}
