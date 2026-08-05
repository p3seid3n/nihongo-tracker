import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

/* ================= CURRICULUM ================= */

const CURRICULUM = [
  { phase: "Basic Grammar", target: "Start here", items: [
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
  { phase: "Essential Grammar", target: "The conversational core", items: [
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
    { id: "givereceive", jp: "あげる・くれる", en: "Giving & receiving", url: "https://guidetojapanese.org/learn/grammar/favors" },
    { id: "request", jp: "〜てください", en: "Requests", url: "https://guidetojapanese.org/learn/grammar/requests" },
    { id: "numbers", jp: "数字", en: "Numbers & counting", url: "https://guidetojapanese.org/learn/grammar/numbers" },
    { id: "casual", jp: "砕けた話し方", en: "Casual patterns & slang", url: "https://guidetojapanese.org/learn/grammar/casual" },
  ]},
  { phase: "Special Expressions", target: "Once conversations flow", items: [
    { id: "causative", jp: "使役・受身", en: "Causative & passive", url: "https://guidetojapanese.org/learn/grammar/causepass" },
    { id: "honorific", jp: "敬語", en: "Honorifics (keigo)", url: "https://guidetojapanese.org/learn/grammar/honorific" },
    { id: "unintended", jp: "〜てしまう", en: "Unintended actions", url: "https://guidetojapanese.org/learn/grammar/unintended" },
    { id: "genericnouns", jp: "こと・ところ", en: "Generic nouns", url: "https://guidetojapanese.org/learn/grammar/generic" },
    { id: "certainty", jp: "はず・べき", en: "Certainty & expectation", url: "https://guidetojapanese.org/learn/grammar/certainty" },
    { id: "amounts", jp: "だけ・しか", en: "Amounts & extents", url: "https://guidetojapanese.org/learn/grammar/amount" },
    { id: "similarity", jp: "よう・みたい", en: "Similarity & hearsay", url: "https://guidetojapanese.org/learn/grammar/similarity" },
    { id: "comparison", jp: "方・比べる", en: "Comparisons", url: "https://guidetojapanese.org/learn/grammar/comparison" },
  ]},
  { phase: "Advanced → Immersion-led", target: "Mostly reading & talking", items: [
    { id: "formal", jp: "である", en: "Formal expressions", url: "https://guidetojapanese.org/learn/grammar/formal" },
    { id: "advvolitional", jp: "意向形", en: "Volitional nuances", url: "https://guidetojapanese.org/learn/grammar/volitional2" },
    { id: "advcovered", jp: "多読", en: "Switch: reading & talking", url: "https://guidetojapanese.org/learn/grammar" },
  ]},
];
const ALL_ITEMS = CURRICULUM.flatMap((p) => p.items);
const BASIC_IDS = CURRICULUM[0].items.map((i) => i.id);
const ESSENTIAL_IDS = CURRICULUM[1].items.map((i) => i.id);

const MILESTONES = [
  { at: 0, label: "Kana + RRTK started", sub: "Recognition foundation" },
  { at: 3, label: "300 kanji · Kaishi resumed", sub: "Shift weight toward vocab & grammar" },
  { at: 6, label: "Basic grammar done (11 sections)", sub: "You can form real sentences" },
  { at: 10, label: "600 vocab · daily output habit", sub: "Texting your friend without translating first" },
  { at: 14, label: "Kaishi 1.5k finished", sub: "Dual subs become comfortable" },
  { at: 18, label: "Essential grammar done", sub: "Weekly voice calls in Japanese" },
  { at: 24, label: "JP subs · manga readable", sub: "Mining vocab from what you watch" },
  { at: 30, label: "Matura — conversational", sub: "会話ができる。飛べ。" },
];

const STORE = "jsh-v2";

const EMPTY = {
  rKnown: "", rRetention: "", rMinutes: "", rDaysStudied: "", rSecPerCard: "", rMature: "", rInterval: "",
  kKnown: "", kRetention: "", kMinutes: "", kDaysStudied: "", kSecPerCard: "", kMature: "", kInterval: "", kRetrievability: "",
  gMinutes: "", episodes: "", subMode: "en", sentences: "", spoken: "",
};

const DECKS = [
  { p: "r", name: "RRTK — Kanji", req: true, rows: [
    ["Known", "Known", "「Estimated total knowledge」", "315"],
    ["Retention %", "Retention", "「Retention → Today → All」", "100"],
    ["Min/day", "Minutes", "「Reviews → Avg for days studied」", "22"],
    ["Days studied %", "DaysStudied", "「Reviews → Days studied」 %", "87"],
    ["Sec/card", "SecPerCard", "「Today → …s/card」", "14.2"],
    ["Mature", "Mature", "「Card Counts → Mature」", "236"],
    ["Median interval", "Interval", "「Review Intervals → Median」", "26"],
  ]},
  { p: "k", name: "Kaishi — Vocab", req: false, rows: [
    ["Known", "Known", "「Estimated total knowledge」", "41"],
    ["Retention %", "Retention", "「Retention → Today → All」", "—"],
    ["Min/day", "Minutes", "「Reviews → Avg for days studied」", "3"],
    ["Days studied %", "DaysStudied", "「Reviews → Days studied」 %", "13"],
    ["Sec/card", "SecPerCard", "「Today → …s/card」", "13.4"],
    ["Mature", "Mature", "「Card Counts → Mature」", "21"],
    ["Median interval", "Interval", "「Review Intervals → Median」", "47"],
    ["Retrievability %", "Retrievability", "「Card Retrievability → Average」", "41"],
  ]},
];

const SUB_MODES = [["en", "EN subs"], ["dual", "Dual subs"], ["jp", "JP subs"], ["none", "No subs"]];

export default function App() {
  const [tab, setTab] = useState("dash");
  const [st, setSt] = useState({ logs: [], lessons: [], start: null, streak: { cur: 0, best: 0, last: null } });
  const [ready, setReady] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setSt((s) => ({ ...s, ...JSON.parse(raw) }));
      else {
        const old = localStorage.getItem("jsh-v1");
        if (old) {
          const o = JSON.parse(old);
          setSt((s) => ({ ...s, logs: o.logs || [], lessons: o.lessons || [], start: o.startDate || null }));
        }
      }
    } catch (e) { /* first run */ }
    setReady(true);
  }, []);

  const save = (next) => {
    setSt(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); }
    catch (e) { flash("Couldn't save"); }
  };
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2200); };
  const n = (v) => { const x = parseFloat(v); return isNaN(x) ? null : x; };
  const today = () => new Date().toISOString().slice(0, 10);

  const addLog = () => {
    const kanji = n(f.rKnown);
    if (kanji === null) return flash("RRTK known is required");
    const d = today();
    const entry = {
      date: d,
      kanji,
      vocab: n(f.kKnown) ?? 0,
      rrtk: { retention: n(f.rRetention), minutes: n(f.rMinutes), daysStudied: n(f.rDaysStudied), secPerCard: n(f.rSecPerCard), mature: n(f.rMature), interval: n(f.rInterval) },
      kaishi: { retention: n(f.kRetention), minutes: n(f.kMinutes), daysStudied: n(f.kDaysStudied), secPerCard: n(f.kSecPerCard), mature: n(f.kMature), interval: n(f.kInterval), retrievability: n(f.kRetrievability) },
      grammarMin: n(f.gMinutes),
      episodes: n(f.episodes),
      subMode: f.subMode,
      sentences: n(f.sentences),
      spoken: n(f.spoken),
    };
    const logs = st.logs.filter((l) => l.date !== d).concat(entry).sort((a, b) => a.date.localeCompare(b.date));
    save({ ...st, logs, start: st.start || d });
    setF(EMPTY);
    flash("Saved ✓");
  };

  const toggle = (id) => {
    const lessons = st.lessons.includes(id) ? st.lessons.filter((x) => x !== id) : [...st.lessons, id];
    save({ ...st, lessons });
  };

  const checkIn = () => {
    const d = today();
    const s = st.streak || { cur: 0, best: 0, last: null };
    if (s.last === d) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const cur = s.last === y ? s.cur + 1 : 1;
    save({ ...st, streak: { cur, best: Math.max(cur, s.best), last: d } });
    flash("お疲れ様 ✓");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(st, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nihongo-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d.logs) throw new Error();
        if (!confirm("Replace all current data with this backup?")) return;
        save({ logs: [], lessons: [], start: null, streak: { cur: 0, best: 0, last: null }, ...d });
        flash("Imported ✓");
      } catch { flash("Not a valid backup file"); }
    };
    r.readAsText(file);
  };

  const reset = () => {
    if (!confirm("Erase all data? Export a backup first if unsure.")) return;
    save({ logs: [], lessons: [], start: null, streak: { cur: 0, best: 0, last: null } });
  };

  const last = st.logs[st.logs.length - 1];
  const kanji = last?.kanji ?? 0;
  const vocab = last?.vocab ?? 0;
  const gDone = st.lessons.length;
  const basicDone = BASIC_IDS.filter((i) => st.lessons.includes(i)).length;
  const essDone = ESSENTIAL_IDS.filter((i) => st.lessons.includes(i)).length;

  const recent = st.logs.slice(-4);
  const sentSum = recent.reduce((a, l) => a + (l.sentences || 0), 0);
  const epSum = recent.reduce((a, l) => a + (l.episodes || 0), 0);
  const spokeSum = recent.reduce((a, l) => a + (l.spoken || 0), 0);

  const axes = [
    { key: "認識", en: "Recognition", v: Math.min(100, (kanji / 1000) * 100), note: `${kanji} kanji` },
    { key: "語彙", en: "Vocabulary", v: Math.min(100, (vocab / 1500) * 100), note: `${vocab} words` },
    { key: "文法", en: "Grammar", v: Math.round((gDone / ALL_ITEMS.length) * 100), note: `${gDone}/${ALL_ITEMS.length} sections` },
    { key: "産出", en: "Output", v: Math.min(100, (sentSum * 4) + (spokeSum * 10) + (epSum * 2)), note: `${sentSum} sentences · ${epSum} eps` },
  ];
  const weakest = axes.reduce((a, b) => (a.v <= b.v ? a : b));

  const rMin = last?.rrtk?.minutes ?? 0;
  const kMin = last?.kaishi?.minutes ?? 0;
  const gMin = last?.grammarMin ?? 0;
  const totalMin = rMin + kMin + gMin;
  const rShare = totalMin ? Math.round((rMin / totalMin) * 100) : 0;

  const findings = useMemo(() => {
    const out = [];
    if (!last) return out;
    if (totalMin > 0 && rShare >= 65) {
      out.push({ t: "warn", h: `RRTK is ${rShare}% of your study time`, b: "Recognition doesn't produce speech. Drop RRTK to 5 new/day and put those minutes into Kaishi and grammar — you already have enough kanji to decompose almost anything." });
    }
    if (gDone === 0) {
      out.push({ t: "warn", h: "Grammar hasn't started", b: "This is the single biggest gap between you and conversation. One Tae Kim section this week — だ, then は — costs 15 minutes and unlocks sentence structure." });
    } else if (basicDone < BASIC_IDS.length) {
      out.push({ t: "info", h: `Basic grammar ${basicDone}/${BASIC_IDS.length}`, b: "Finish this phase before adding more vocab volume — grammar is what turns known words into understood sentences." });
    } else if (essDone < ESSENTIAL_IDS.length) {
      out.push({ t: "info", h: `Essential grammar ${essDone}/${ESSENTIAL_IDS.length}`, b: "This phase is the conversational core. て-form and casual patterns are what you'll actually hear in Haikyuu." });
    }
    const kr = last.kaishi?.retrievability;
    if (kr != null && kr < 70) {
      out.push({ t: "info", h: `Kaishi retrievability ${kr}%`, b: "Those cards decayed while paused. Expect a rough week of failures — that's the backlog clearing, not you regressing. Don't raise new cards until it climbs past 80%." });
    }
    if (sentSum === 0 && st.logs.length >= 2) {
      out.push({ t: "warn", h: "No output logged", b: "Your Japanese friend is the fastest lever you have and it's currently unused. One sentence a day, however broken." });
    }
    if (vocab > 0 && kanji / Math.max(vocab, 1) > 6) {
      out.push({ t: "info", h: "Kanji far ahead of vocabulary", b: `${kanji} kanji vs ${vocab} words. Kanji without words is a filing system with nothing filed. Raise Kaishi to 10/day.` });
    }
    const cons = last.rrtk?.daysStudied;
    if (cons != null && cons >= 80) {
      out.push({ t: "good", h: `Consistency ${cons}%`, b: "This is the hard part and you've got it. Everything else is just allocation." });
    }
    return out;
  }, [last, totalMin, rShare, gDone, basicDone, essDone, sentSum, vocab, kanji, st.logs.length]);

  const months = st.start ? Math.max(0, (Date.now() - new Date(st.start)) / 2.628e9) : 0;

  const proj = useMemo(() => {
    if (st.logs.length < 2) return null;
    const a = st.logs[0], b = st.logs[st.logs.length - 1];
    const days = (new Date(b.date) - new Date(a.date)) / 864e5;
    if (days < 3) return null;
    const vPer = (b.vocab - a.vocab) / days;
    if (vPer <= 0) return null;
    const left = Math.ceil((1500 - b.vocab) / vPer);
    return { vPer: vPer.toFixed(1), when: new Date(Date.now() + left * 864e5).toLocaleDateString("de-CH", { month: "short", year: "numeric" }) };
  }, [st.logs]);

  const chart = st.logs.map((l) => ({
    date: l.date.slice(5),
    Kanji: l.kanji, Vocab: l.vocab,
    RRTK: l.rrtk?.minutes ?? 0,
    Kaishi: l.kaishi?.minutes ?? 0,
    "Grammar min": l.grammarMin ?? 0,
  }));

  if (!ready) return <div className="boot">読み込み中…</div>;

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="top">
          <div className="logo">日本語<span>。</span></div>
          <div className="msg">{msg}</div>
        </div>

        {tab === "dash" && (
          <>
            <div className="card">
              <h2>診断 <span className="en">What your data says</span></h2>
              {findings.length === 0 && <p className="hint" style={{ marginTop: 0 }}>Save a log entry and this becomes a real read on your balance — where time is going, what's lagging, what to change.</p>}
              {findings.map((x, i) => (
                <div key={i} className={`find ${x.t}`}>
                  <div className="fh">{x.h}</div>
                  <div className="fb">{x.b}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>四技能 <span className="en">The four axes</span></h2>
              {axes.map((a) => (
                <div key={a.key} className="axis">
                  <div className="arow">
                    <span className="ak">{a.key}</span>
                    <span className="ae">{a.en}</span>
                    <span className="an">{a.note}</span>
                  </div>
                  <div className="bar"><div style={{ width: `${Math.max(1, a.v)}%`, background: a.key === weakest.key ? "var(--hanko)" : "var(--indigo)" }} /></div>
                </div>
              ))}
              <p className="hint">Weakest axis: <b>{weakest.en}</b>. Conversation needs all four — the lowest one is your ceiling, not the highest.</p>
            </div>

            {totalMin > 0 && (
              <div className="card">
                <h2>時間配分 <span className="en">Where your minutes go</span></h2>
                <div className="split">
                  <div style={{ width: `${(rMin / totalMin) * 100}%`, background: "var(--hanko)" }} />
                  <div style={{ width: `${(kMin / totalMin) * 100}%`, background: "var(--indigo)" }} />
                  <div style={{ width: `${(gMin / totalMin) * 100}%`, background: "var(--done)" }} />
                </div>
                <div className="key">
                  <span><i style={{ background: "var(--hanko)" }} />RRTK {rMin}m</span>
                  <span><i style={{ background: "var(--indigo)" }} />Kaishi {kMin}m</span>
                  <span><i style={{ background: "var(--done)" }} />Grammar {gMin}m</span>
                </div>
                <p className="hint">Target for now: roughly a third each. Kanji recognition is the one you can afford to starve.</p>
              </div>
            )}

            <div className="card">
              <h2>進歩 <span className="en">Progress</span></h2>
              {chart.length >= 2 ? (
                <>
                  <div className="ct">Knowledge</div>
                  <div style={{ width: "100%", height: 190 }}>
                    <ResponsiveContainer>
                      <LineChart data={chart} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <Tooltip contentStyle={TIP} />
                        <Line type="monotone" dataKey="Kanji" stroke="#C43227" strokeWidth={2.5} dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="Vocab" stroke="#33506B" strokeWidth={2.5} dot={{ r: 2.5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="ct">Minutes by activity</div>
                  <div style={{ width: "100%", height: 170 }}>
                    <ResponsiveContainer>
                      <BarChart data={chart} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#5C574D" }} />
                        <Tooltip contentStyle={TIP} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="RRTK" stackId="a" fill="#C43227" />
                        <Bar dataKey="Kaishi" stackId="a" fill="#33506B" />
                        <Bar dataKey="Grammar min" stackId="a" fill="#4A7B4F" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {proj && <p className="hint">Vocab pace: <b>{proj.vPer}/day</b> → Kaishi finished around <b>{proj.when}</b>.</p>}
                </>
              ) : <p className="hint" style={{ marginTop: 0 }}>Two log entries and the charts appear.</p>}
            </div>

            <div className="card">
              <h2>継続 <span className="en">Streak</span></h2>
              <div className="srow">
                <div><div className="sn">{st.streak?.cur ?? 0}<small> 🔥</small></div><div className="sl">Current</div></div>
                <div><div className="sn">{st.streak?.best ?? 0}</div><div className="sl">Best</div></div>
              </div>
              <button className="btn" style={{ background: st.streak?.last === today() ? "var(--done)" : "var(--hanko)" }}
                onClick={checkIn} disabled={st.streak?.last === today()}>
                {st.streak?.last === today() ? "✓ Checked in today" : "Check in — I studied today"}
              </button>
            </div>
          </>
        )}

        {tab === "log" && (
          <div className="card">
            <h2>記録 <span className="en">Weekly log</span></h2>
            <p className="hint" style={{ marginTop: 0 }}>Anki numbers from each deck's stats screen, plus what the decks can't see: grammar, immersion, and output.</p>

            {DECKS.map((d) => (
              <div key={d.p}>
                <div className="ph"><span className="pt">{d.name}</span>{!d.req && <span className="po">optional</span>}</div>
                <div className="grid">
                  {d.rows.map(([label, suffix, where, ph]) => {
                    const k = d.p + suffix;
                    return (
                      <div key={k}>
                        <label htmlFor={k}>{label}{d.req && suffix === "Known" && <b className="req"> *</b>}</label>
                        <input id={k} inputMode="decimal" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
                        <div className="w">{where}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="ph"><span className="pt">Beyond Anki</span></div>
            <div className="grid">
              <div>
                <label htmlFor="gMinutes">Grammar min/day</label>
                <input id="gMinutes" inputMode="decimal" placeholder="15" value={f.gMinutes} onChange={(e) => setF({ ...f, gMinutes: e.target.value })} />
                <div className="w">Tae Kim, notebook time</div>
              </div>
              <div>
                <label htmlFor="episodes">Episodes watched</label>
                <input id="episodes" inputMode="decimal" placeholder="4" value={f.episodes} onChange={(e) => setF({ ...f, episodes: e.target.value })} />
                <div className="w">Since last log</div>
              </div>
              <div>
                <label htmlFor="sentences">Sentences written</label>
                <input id="sentences" inputMode="decimal" placeholder="7" value={f.sentences} onChange={(e) => setF({ ...f, sentences: e.target.value })} />
                <div className="w">To your friend, in Japanese</div>
              </div>
              <div>
                <label htmlFor="spoken">Minutes spoken</label>
                <input id="spoken" inputMode="decimal" placeholder="0" value={f.spoken} onChange={(e) => setF({ ...f, spoken: e.target.value })} />
                <div className="w">Voice/calls in Japanese</div>
              </div>
            </div>
            <label style={{ marginTop: 4 }}>Subtitle mode</label>
            <div className="chips">
              {SUB_MODES.map(([v, l]) => (
                <button key={v} className={`chip ${f.subMode === v ? "on" : ""}`} onClick={() => setF({ ...f, subMode: v })}>{l}</button>
              ))}
            </div>

            <button className="btn" style={{ marginTop: 14 }} onClick={addLog}>Save this week</button>

            {st.logs.length > 0 && (
              <div className="hist">
                {st.logs.slice(-8).reverse().map((l) => (
                  <div className="hrow" key={l.date}>
                    <b>{l.date}</b> 漢字{l.kanji} · 語彙{l.vocab}
                    {l.grammarMin ? ` · 文法${l.grammarMin}m` : ""}
                    {l.sentences ? ` · ${l.sentences}文` : ""}
                    {l.episodes ? ` · ${l.episodes}話` : ""}
                  </div>
                ))}
              </div>
            )}

            <div className="ph"><span className="pt">Data</span></div>
            <button className="btn ghost" onClick={exportData}>Export backup (.json)</button>
            <label className="btn ghost file">
              Import backup
              <input type="file" accept="application/json" onChange={importData} />
            </label>
            <button className="btn ghost danger" onClick={reset}>Erase all data</button>
            <p className="hint">Data lives only in this browser on this device. Export occasionally — that file is your only backup.</p>
          </div>
        )}

        {tab === "grammar" && (
          <>
            <div className="card">
              <h2>文法 <span className="en">{gDone}/{ALL_ITEMS.length} sections</span></h2>
              <div className="bar"><div style={{ width: `${(gDone / ALL_ITEMS.length) * 100}%`, background: "var(--done)" }} /></div>
              <p className="hint">Read → copy one example into your notebook → write one of your own. Fifteen minutes. This axis is worth more than the next hundred kanji.</p>
            </div>
            {CURRICULUM.map((p) => (
              <div key={p.phase}>
                <div className="ph"><span className="pt">{p.phase}</span><span className="po">{p.target}</span></div>
                {p.items.map((it) => {
                  const done = st.lessons.includes(it.id);
                  return (
                    <div key={it.id} className={`les ${done ? "done" : ""}`}>
                      <button className="cb" aria-label={done ? "Undo" : "Mark done"} onClick={() => toggle(it.id)}>{done ? "✓" : ""}</button>
                      <span className="lj">{it.jp}</span>
                      <span className="le">{it.en}</span>
                      <a className="ll" href={it.url} target="_blank" rel="noreferrer">Read →</a>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {tab === "timeline" && (
          <>
            <div className="card">
              <h2>道 <span className="en">Month {months.toFixed(0)} of 30</span></h2>
              <div className="bar"><div style={{ width: `${Math.min(100, (months / 30) * 100)}%`, background: "var(--hanko)" }} /></div>
              <p className="hint">{st.start ? `Started ${st.start}.` : "Save your first log to start the clock."} Milestones are checkpoints, not deadlines — missing one by a month costs nothing.</p>
            </div>
            <div className="card">
              <div className="tl">
                {MILESTONES.map((m) => {
                  const hit = months >= m.at && m.at !== 30;
                  const next = !hit && MILESTONES.filter((x) => x.at > months)[0]?.at === m.at;
                  return (
                    <div key={m.at} className={`ms ${hit ? "hit" : ""} ${next ? "next" : ""}`}>
                      <div className="dot" />
                      <div className="mm">MONTH {m.at}</div>
                      <div className="mt">{m.label}</div>
                      <div className="mb">{m.sub}</div>
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

const TIP = { fontFamily: "inherit", fontSize: 13, border: "1.5px solid #1F1D1A", borderRadius: 4 };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
:root{--paper:#F7F5EF;--grid:#E4E0D4;--ink:#1F1D1A;--soft:#5C574D;--hanko:#C43227;--indigo:#33506B;--soft2:#DDE4EA;--done:#4A7B4F}
*{box-sizing:border-box;margin:0}
.boot{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F5EF;color:#5C574D;font-family:sans-serif}
.app{min-height:100vh;color:var(--ink);font-family:'Zen Kaku Gothic New',sans-serif;background-color:var(--paper);
background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
background-size:28px 28px;padding:0 16px 110px}
.wrap{max-width:680px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;padding:22px 0 14px}
.logo{font-family:'Shippori Mincho',serif;font-weight:800;font-size:26px}
.logo span{color:var(--hanko)}
.msg{font-size:12px;color:var(--done);font-weight:700}
.card{background:rgba(255,255,255,.78);border:1.5px solid var(--ink);border-radius:5px;padding:16px;margin-bottom:14px}
h2{font-family:'Shippori Mincho',serif;font-size:17px;font-weight:800;margin-bottom:12px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
h2 .en{font-family:'Zen Kaku Gothic New',sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);font-weight:700}
.hint{font-size:12.5px;color:var(--soft);line-height:1.65;margin-top:10px}
.bar{height:8px;background:var(--soft2);border-radius:4px;overflow:hidden}
.bar>div{height:100%;border-radius:4px;transition:width .4s}
.find{border-left:3px solid var(--soft);padding:8px 0 8px 12px;margin-bottom:12px}
.find.warn{border-color:var(--hanko)}
.find.good{border-color:var(--done)}
.find.info{border-color:var(--indigo)}
.fh{font-weight:700;font-size:14px;margin-bottom:3px}
.fb{font-size:13px;color:var(--soft);line-height:1.6}
.axis{margin-bottom:12px}
.arow{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}
.ak{font-family:'Shippori Mincho',serif;font-weight:800;font-size:15px}
.ae{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--soft)}
.an{margin-left:auto;font-size:12px;color:var(--soft)}
.split{display:flex;height:14px;border:1.5px solid var(--ink);border-radius:4px;overflow:hidden}
.key{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--soft)}
.key i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}
.ct{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--soft);margin:14px 0 6px}
.srow{display:flex;gap:24px;margin-bottom:12px}
.sn{font-family:'Shippori Mincho',serif;font-size:26px;font-weight:800}
.sn small{font-size:14px}
.sl{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}
input{font-family:inherit;font-size:15px;padding:10px 12px;border:1.5px solid var(--ink);border-radius:4px;background:#fff;width:100%}
input:focus-visible{outline:2px solid var(--indigo)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px}
label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;display:block;margin-bottom:3px}
.w{font-size:10px;color:var(--soft);margin-top:3px;line-height:1.35}
.req{color:var(--hanko)}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.chip{font-family:inherit;font-size:12.5px;font-weight:700;padding:8px 12px;border:1.5px solid var(--ink);background:#fff;border-radius:4px;cursor:pointer}
.chip.on{background:var(--indigo);color:#fff;border-color:var(--indigo)}
.btn{font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;background:var(--hanko);color:#fff;border:none;border-radius:4px;padding:11px 18px;width:100%;display:block;text-align:center}
.btn:disabled{opacity:.75;cursor:default}
.btn.ghost{background:transparent;color:var(--soft);border:1.5px dashed var(--soft);margin-top:8px;font-size:12.5px;padding:9px}
.btn.danger{color:var(--hanko);border-color:var(--hanko)}
.btn.file{position:relative;overflow:hidden}
.btn.file input{position:absolute;inset:0;opacity:0;cursor:pointer}
.hist{margin-top:14px}
.hrow{font-size:12px;color:var(--soft);border-top:1px dashed var(--grid);padding-top:7px;margin-top:7px;line-height:1.6}
.hrow b{color:var(--ink);margin-right:6px}
.ph{display:flex;align-items:baseline;gap:10px;margin:18px 0 10px;border-bottom:2px solid var(--ink);padding-bottom:6px}
.pt{font-family:'Shippori Mincho',serif;font-weight:800;font-size:15px}
.po{margin-left:auto;font-size:11px;color:var(--hanko);font-weight:700}
.les{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.78);border:1.5px solid var(--ink);border-radius:4px;padding:10px 12px;margin-bottom:8px}
.les.done{opacity:.55}
.les.done .le{text-decoration:line-through}
.cb{width:22px;height:22px;border:2px solid var(--ink);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;background:transparent;cursor:pointer;padding:0}
.les.done .cb{background:var(--done);border-color:var(--done)}
.lj{font-family:'Shippori Mincho',serif;font-weight:800;font-size:15px;color:var(--indigo);min-width:86px}
.le{font-size:13.5px;font-weight:700;flex:1}
.ll{font-size:12px;color:var(--indigo);font-weight:700;text-decoration:none;border-bottom:1.5px solid var(--indigo);white-space:nowrap}
.tl{position:relative;padding-left:30px}
.tl::before{content:'';position:absolute;left:10px;top:6px;bottom:6px;width:2px;background:var(--ink)}
.ms{position:relative;margin-bottom:16px}
.ms .dot{position:absolute;left:-30px;top:2px;width:20px;height:20px;border-radius:50%;border:2px solid var(--ink);background:var(--paper)}
.ms.hit .dot{background:var(--done);border-color:var(--done)}
.ms.next .dot{background:var(--hanko);border-color:var(--hanko)}
.mm{font-size:11px;color:var(--hanko);font-weight:700;letter-spacing:.06em}
.mt{font-weight:700;font-size:14px}
.mb{font-size:12.5px;color:var(--soft)}
.tabs{position:fixed;bottom:0;left:0;right:0;z-index:10;background:var(--paper);border-top:2px solid var(--ink);
display:flex;justify-content:space-around;padding:8px 6px calc(10px + env(safe-area-inset-bottom))}
.tab{background:none;border:none;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--soft);font-size:11px;font-weight:700;padding:4px 10px}
.tab .k{font-family:'Shippori Mincho',serif;font-size:19px;font-weight:800}
.tab.on{color:var(--hanko)}
`;
