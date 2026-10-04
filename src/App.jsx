import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { freshCard, grade, dueToday, mastery, isMastered, buildSession } from "./srs.js";
import { parseApkg } from "./apkgImport.js";
import { UNITS, ALL_LESSONS, fillTemplate } from "./lessons.js";
import { haptic } from "./haptics.js";

const STORE = "jsh-v3";
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [tab, setTab] = useState("dash");
  const [st, setSt] = useState({
    decks: {},
    lessonsDone: [],
    lessonMastery: {},
    streak: { cur: 0, best: 0, last: null },
    dailyLog: {},
    start: null,
  });
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const [session, setSession] = useState(null);
  const [lessonSession, setLessonSession] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setSt((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch (e) { /* first run */ }
    setReady(true);
  }, []);

  const save = (next) => {
    setSt(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); }
    catch (e) { flash("Couldn't save — storage may be full"); }
  };
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2200); };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { decks } = await parseApkg(file);
      let nextDecks = { ...st.decks };
      let totalCards = 0;
      for (const d of decks) {
        const deckId = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const freshCards = d.cards.map((c) => freshCard(c.front, c.back, { id: c.id }));
        const existing = nextDecks[deckId];
        nextDecks[deckId] = existing
          ? { ...existing, cards: mergeCards(existing.cards, freshCards) }
          : { name: d.name, cards: freshCards, imported: todayStr() };
        totalCards += freshCards.length;
      }
      save({ ...st, decks: nextDecks, start: st.start || todayStr() });
      haptic("success");
      flash(`Imported ${totalCards} cards across ${decks.length} deck${decks.length !== 1 ? "s" : ""}`);
    } catch (err) {
      haptic("error");
      flash(err.message || "Import failed — check the file is a valid .apkg");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const mergeCards = (oldCards, newCards) => {
    const byId = Object.fromEntries(oldCards.map((c) => [c.id, c]));
    newCards.forEach((c) => { if (!byId[c.id]) byId[c.id] = c; });
    return Object.values(byId);
  };

  const startReview = (deckId) => {
    const deck = st.decks[deckId];
    if (!deck) return;
    const newOnes = deck.cards.filter((c) => c.lastSeen === null);
    const items = buildSession(deck.cards, newOnes, 10, 30);
    if (items.length === 0) { flash("Nothing due in this deck right now"); return; }
    setSession({ deckId, items, idx: 0, revealed: false, correct: 0 });
  };

  const answerCard = (rating) => {
    if (!session) return;
    const deck = st.decks[session.deckId];
    const card = session.items[session.idx];
    const updated = grade(card, rating);
    const cards = deck.cards.map((c) => (c.id === updated.id ? updated : c));
    save({ ...st, decks: { ...st.decks, [session.deckId]: { ...deck, cards } } });
    haptic(rating === 0 ? "error" : "tap");
    const nextIdx = session.idx + 1;
    if (nextIdx >= session.items.length) {
      haptic("success");
      logActivity({ reviewed: session.items.length });
      flash(`Session done — ${session.correct + (rating > 0 ? 1 : 0)}/${session.items.length} correct`);
      setSession(null);
    } else {
      setSession({ ...session, idx: nextIdx, revealed: false, correct: session.correct + (rating > 0 ? 1 : 0) });
    }
  };

  const allWords = useMemo(() => Object.values(st.decks).flatMap((d) => d.cards), [st.decks]);
  const masteredWords = useMemo(() => allWords.filter(isMastered), [allWords]);

  const startLesson = (lessonId) => {
    const lesson = ALL_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) return;
    const exercises = (lesson.templates.length ? lesson.templates : ["(no vocab exercises for this point — read & continue)"])
      .map((t) => fillTemplate(t, masteredWords))
      .filter(Boolean);
    const final = exercises.length ? exercises : ["(not enough mastered vocab yet — reviewed as text only)"];
    setLessonSession({ lessonId, lesson, exercises: final, idx: 0 });
  };

  const advanceLesson = () => {
    if (!lessonSession) return;
    const nextIdx = lessonSession.idx + 1;
    if (nextIdx >= lessonSession.exercises.length) {
      const id = lessonSession.lessonId;
      const lessonsDone = st.lessonsDone.includes(id) ? st.lessonsDone : [...st.lessonsDone, id];
      save({ ...st, lessonsDone });
      haptic("success");
      logActivity({ lessonsDone: 1 });
      flash("Lesson complete ✓");
      setLessonSession(null);
    } else {
      haptic("tap");
      setLessonSession({ ...lessonSession, idx: nextIdx });
    }
  };

  const logActivity = (delta) => {
    const d = todayStr();
    const cur = st.dailyLog[d] || { reviewed: 0, lessonsDone: 0 };
    const dailyLog = { ...st.dailyLog, [d]: {
      reviewed: cur.reviewed + (delta.reviewed || 0),
      lessonsDone: cur.lessonsDone + (delta.lessonsDone || 0),
    }};
    const s = st.streak;
    let streak = s;
    if (s.last !== d) {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const cur2 = s.last === y ? s.cur + 1 : 1;
      streak = { cur: cur2, best: Math.max(cur2, s.best), last: d };
    }
    save({ ...st, dailyLog, streak });
  };

  const totalCards = allWords.length;
  const totalMastered = masteredWords.length;
  const totalDue = useMemo(() => dueToday(allWords).length, [allWords]);
  const gTotal = ALL_LESSONS.length;
  const gDone = st.lessonsDone.length;
  const todayLog = st.dailyLog[todayStr()] || { reviewed: 0, lessonsDone: 0 };
  const checkedInToday = st.streak.last === todayStr();

  const weekChart = useMemo(() => {
    const days = Object.keys(st.dailyLog).sort().slice(-14);
    return days.map((d) => ({ date: d.slice(5), Reviewed: st.dailyLog[d].reviewed, Lessons: st.dailyLog[d].lessonsDone }));
  }, [st.dailyLog]);

  const nextLesson = useMemo(() => {
    for (const u of UNITS) {
      for (const l of u.lessons) {
        if (!st.lessonsDone.includes(l.id)) return l;
      }
    }
    return null;
  }, [st.lessonsDone]);

  const dueDeckEntries = useMemo(
    () => Object.entries(st.decks).map(([id, d]) => ({ id, name: d.name, due: dueToday(d.cards).length })).filter((d) => d.due > 0),
    [st.decks]
  );

  if (!ready) return <div className="boot">読み込み中…</div>;

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="top">
          <div className="logo">日本語<span>。</span></div>
          <div className="msg">{msg}</div>
        </div>

        {tab === "dash" && !session && !lessonSession && (
          <>
            <div className="card plan">
              <h2>今日の計画 <span className="en">Today's plan</span></h2>
              <div className="planrow">
                <div className="pdot">{todayLog.reviewed > 0 ? "✓" : "1"}</div>
                <div className="ptext">
                  <div className="pt">Review due cards</div>
                  <div className="ps">{totalDue} card{totalDue !== 1 ? "s" : ""} waiting across {dueDeckEntries.length} deck{dueDeckEntries.length !== 1 ? "s" : ""}</div>
                </div>
                {totalDue > 0 && <button className="pbtn" onClick={() => startReview(dueDeckEntries[0].id)}>Start</button>}
              </div>
              <div className="planrow">
                <div className="pdot">{nextLesson === null ? "✓" : "2"}</div>
                <div className="ptext">
                  <div className="pt">Grammar lesson</div>
                  <div className="ps">{nextLesson ? `${nextLesson.jp} — ${nextLesson.en}` : "All lessons complete"}</div>
                </div>
                {nextLesson && <button className="pbtn alt" onClick={() => startLesson(nextLesson.id)}>Start</button>}
              </div>
              <div className="planrow">
                <div className="pdot">3</div>
                <div className="ptext">
                  <div className="pt">Immersion</div>
                  <div className="ps">One episode, or a sentence to your friend</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>概要 <span className="en">Overview</span></h2>
              <div className="statrow">
                <div className="stat"><div className="n">{totalCards}</div><div className="l">Total cards</div></div>
                <div className="stat"><div className="n">{totalMastered}</div><div className="l">Mastered</div></div>
                <div className="stat"><div className="n">{gDone}<span className="dim">/{gTotal}</span></div><div className="l">Grammar</div></div>
              </div>
              {Object.keys(st.decks).length === 0 && (
                <p className="hint">No decks imported yet — go to 単語 to import an .apkg file exported from AnkiDroid.</p>
              )}
            </div>

            {weekChart.length >= 2 && (
              <div className="card">
                <h2>推移 <span className="en">Last 14 days</span></h2>
                <div style={{ width: "100%", height: 170 }}>
                  <ResponsiveContainer>
                    <LineChart data={weekChart} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#A89A8C" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#A89A8C" }} />
                      <Tooltip contentStyle={TIP} />
                      <Line type="monotone" dataKey="Reviewed" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 2.5 }} />
                      <Line type="monotone" dataKey="Lessons" stroke="var(--accent2)" strokeWidth={2.5} dot={{ r: 2.5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="card">
              <h2>継続 <span className="en">Streak</span></h2>
              <div className="statrow">
                <div className="stat"><div className="n">{st.streak.cur}<small> 🔥</small></div><div className="l">Current</div></div>
                <div className="stat"><div className="n">{st.streak.best}</div><div className="l">Best</div></div>
              </div>
              {!checkedInToday && (totalDue > 0 || nextLesson) && (
                <p className="hint">Complete a review or lesson above to check in today.</p>
              )}
              {checkedInToday && <p className="hint good">✓ Checked in today</p>}
            </div>
          </>
        )}

        {session && (
          <ReviewCard session={session} onAnswer={answerCard}
            onReveal={() => setSession({ ...session, revealed: true })}
            onExit={() => setSession(null)} />
        )}

        {lessonSession && (
          <LessonCard ls={lessonSession} onNext={advanceLesson} onExit={() => setLessonSession(null)} />
        )}

        {tab === "vocab" && !session && (
          <>
            <div className="card">
              <h2>単語 <span className="en">Decks</span></h2>
              <p className="hint" style={{ marginTop: 0 }}>
                Import an .apkg exported from AnkiDroid (deck menu → ⋮ → Export → Anki Deck Package). Cards run on their own SRS here — this is a one-time import, not a live sync.
              </p>
              <label className="btn file" aria-busy={importing}>
                {importing ? "Importing…" : "Import .apkg file"}
                <input ref={fileRef} type="file" accept=".apkg" onChange={handleImport} disabled={importing} />
              </label>
            </div>
            {Object.entries(st.decks).map(([id, d]) => {
              const due = dueToday(d.cards).length;
              const mast = d.cards.filter(isMastered).length;
              return (
                <div className="card" key={id}>
                  <h2>{d.name} <span className="en">{d.cards.length} cards</span></h2>
                  <div className="bar"><div style={{ width: `${(mast / Math.max(1, d.cards.length)) * 100}%`, background: "var(--accent2)" }} /></div>
                  <div className="deckrow">
                    <span>{mast} mastered</span>
                    <span>{due} due</span>
                  </div>
                  <button className="btn" disabled={due === 0} onClick={() => startReview(id)}>
                    {due > 0 ? `Review ${due} cards` : "Nothing due"}
                  </button>
                </div>
              );
            })}
          </>
        )}

        {tab === "grammar" && !lessonSession && (
          <>
            <div className="card">
              <h2>文法 <span className="en">{gDone}/{gTotal} lessons</span></h2>
              <div className="bar"><div style={{ width: `${(gDone / gTotal) * 100}%`, background: "var(--accent2)" }} /></div>
              <p className="hint">Exercises pull vocab you've already mastered — {masteredWords.length} words qualify right now.</p>
            </div>
            {UNITS.map((u) => (
              <div key={u.id} className="card path">
                <h2>{u.jp} <span className="en">{u.title}</span></h2>
                <div className="pathgrid">
                  {u.lessons.map((l) => {
                    const done = st.lessonsDone.includes(l.id);
                    return (
                      <button key={l.id} className={`node ${done ? "done" : ""}`} onClick={() => startLesson(l.id)}>
                        <span className="nj">{l.jp}</span>
                        <span className="ne">{l.en}</span>
                        {done && <span className="check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "settings" && (
          <div className="card">
            <h2>設定 <span className="en">Data</span></h2>
            <button className="btn ghost" onClick={() => exportBackup(st)}>Export backup (.json)</button>
            <label className="btn ghost file">
              Import backup
              <input type="file" accept="application/json" onChange={(e) => importBackup(e, st, save, flash)} />
            </label>
            <button className="btn ghost danger" onClick={() => {
              if (!confirm("Erase everything — decks, lessons, streak? Export a backup first if unsure.")) return;
              save({ decks: {}, lessonsDone: [], lessonMastery: {}, streak: { cur: 0, best: 0, last: null }, dailyLog: {}, start: null });
            }}>Erase all data</button>
            <p className="hint">Data lives only in this browser, on this device. Export regularly — there is no cloud copy.</p>
          </div>
        )}
      </div>

      <nav className="tabs">
        {[["dash", "家", "Home"], ["vocab", "単", "Vocab"], ["grammar", "文", "Grammar"], ["settings", "設", "Settings"]].map(([id, k, l]) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => { haptic("select"); setTab(id); setSession(null); setLessonSession(null); }}>
            <span className="k">{k}</span>{l}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ReviewCard({ session, onAnswer, onReveal, onExit }) {
  const card = session.items[session.idx];
  return (
    <div className="card session">
      <div className="sessTop">
        <button className="x" onClick={onExit} aria-label="Exit session">✕</button>
        <div className="prog">{session.idx + 1} / {session.items.length}</div>
      </div>
      <div className="cardFace" onClick={!session.revealed ? onReveal : undefined}>
        <div className="front">{card.front}</div>
        {session.revealed && <div className="back">{card.back}</div>}
        {!session.revealed && <div className="tapHint">Tap to reveal</div>}
      </div>
      {session.revealed && (
        <div className="rategrid">
          <button className="rate again" onClick={() => onAnswer(0)}>Again</button>
          <button className="rate hard" onClick={() => onAnswer(1)}>Hard</button>
          <button className="rate good" onClick={() => onAnswer(2)}>Good</button>
          <button className="rate easy" onClick={() => onAnswer(3)}>Easy</button>
        </div>
      )}
    </div>
  );
}

function LessonCard({ ls, onNext, onExit }) {
  const text = ls.exercises[ls.idx];
  return (
    <div className="card session">
      <div className="sessTop">
        <button className="x" onClick={onExit} aria-label="Exit lesson">✕</button>
        <div className="prog">{ls.idx + 1} / {ls.exercises.length}</div>
      </div>
      <div className="lessonHead">{ls.lesson.jp} <span>{ls.lesson.en}</span></div>
      {ls.idx === 0 && <p className="explain">{ls.lesson.explain}</p>}
      <div className="exerciseBox">{text}</div>
      <a className="ll" href={ls.lesson.url} target="_blank" rel="noreferrer">Full lesson on Tae Kim →</a>
      <button className="btn" onClick={onNext}>{ls.idx + 1 >= ls.exercises.length ? "Finish" : "Next"}</button>
    </div>
  );
}

function exportBackup(st) {
  const blob = new Blob([JSON.stringify(st, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `nihongo-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importBackup(e, st, save, flash) {
  const file = e.target.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.decks) throw new Error();
      if (!confirm("Replace all current data with this backup?")) return;
      save({ decks: {}, lessonsDone: [], lessonMastery: {}, streak: { cur: 0, best: 0, last: null }, dailyLog: {}, start: null, ...d });
      flash("Imported ✓");
    } catch { flash("Not a valid backup file"); }
  };
  r.readAsText(file);
}

const TIP = { fontFamily: "inherit", fontSize: 13, background: "#2A2724", border: "1px solid #453F38", borderRadius: 8, color: "#EDE7DF" };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap');
:root{
  --bg:#171513; --surface:#211E1B; --surface2:#2A2724; --stroke:#3A362F;
  --ink:#EDE7DF; --soft:#A89A8C; --accent:#D97757; --accent2:#7FA88C;
  --bad:#D9705A; --radius:20px;
}
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
.boot{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--soft);font-family:sans-serif}
.app{min-height:100vh;color:var(--ink);font-family:'Zen Kaku Gothic New',sans-serif;background:var(--bg);padding:0 14px 112px}
.wrap{max-width:680px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;padding:22px 2px 14px}
.logo{font-weight:900;font-size:24px;letter-spacing:.02em}
.logo span{color:var(--accent)}
.msg{font-size:12px;color:var(--accent2);font-weight:700}
.card{background:var(--surface);border:1px solid var(--stroke);border-radius:var(--radius);padding:18px;margin-bottom:14px}
.card.plan{background:linear-gradient(165deg, var(--surface) 0%, #241F1B 100%)}
h2{font-size:15px;font-weight:900;margin-bottom:12px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
h2 .en{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft);font-weight:700}
.hint{font-size:12.5px;color:var(--soft);line-height:1.6;margin-top:10px}
.hint.good{color:var(--accent2)}
.bar{height:8px;background:var(--surface2);border-radius:99px;overflow:hidden}
.bar>div{height:100%;border-radius:99px;transition:width .4s}
.statrow{display:flex;gap:10px}
.stat{flex:1;background:var(--surface2);border-radius:14px;padding:12px;text-align:center}
.stat .n{font-size:22px;font-weight:900}
.stat .n small{font-size:13px}
.stat .dim{font-size:13px;color:var(--soft)}
.stat .l{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin-top:2px}
.planrow{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--stroke)}
.planrow:last-child{border-bottom:none}
.pdot{width:30px;height:30px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;flex-shrink:0;color:var(--accent)}
.ptext{flex:1;min-width:0}
.pt{font-weight:700;font-size:13.5px}
.ps{font-size:11.5px;color:var(--soft);margin-top:2px}
.pbtn{background:var(--accent);color:#1A1512;border:none;border-radius:99px;font-weight:900;font-size:12.5px;padding:9px 16px;cursor:pointer;flex-shrink:0}
.pbtn.alt{background:var(--accent2)}
.pbtn:active{transform:scale(.95)}
.btn{font-family:inherit;font-weight:900;font-size:14px;cursor:pointer;background:var(--accent);color:#1A1512;border:none;border-radius:16px;padding:14px;width:100%;display:block;text-align:center;transition:transform .1s}
.btn:active{transform:scale(.97)}
.btn:disabled{opacity:.4;cursor:default}
.btn.ghost{background:var(--surface2);color:var(--ink);margin-top:8px;font-size:13px;padding:12px}
.btn.danger{color:var(--bad)}
.btn.file{position:relative;overflow:hidden}
.btn.file input{position:absolute;inset:0;opacity:0;cursor:pointer}
.deckrow{display:flex;justify-content:space-between;font-size:12px;color:var(--soft);margin:8px 0 12px}
.pathgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.node{background:var(--surface2);border:1px solid var(--stroke);border-radius:16px;padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;position:relative;color:var(--ink)}
.node.done{background:rgba(127,168,140,0.15);border-color:var(--accent2)}
.node:active{transform:scale(.96)}
.nj{font-weight:900;font-size:16px}
.ne{font-size:10.5px;color:var(--soft);text-align:center}
.node .check{position:absolute;top:6px;right:8px;color:var(--accent2);font-weight:900;font-size:12px}
.session{min-height:60vh;display:flex;flex-direction:column}
.sessTop{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.x{background:var(--surface2);border:none;color:var(--soft);width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer}
.prog{font-size:12px;color:var(--soft);font-weight:700}
.cardFace{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:180px;cursor:pointer}
.front{font-size:30px;font-weight:900;text-align:center}
.back{font-size:17px;color:var(--accent2);text-align:center}
.tapHint{font-size:11px;color:var(--soft);letter-spacing:.08em;text-transform:uppercase}
.rategrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}
.rate{border:none;border-radius:14px;padding:13px 4px;font-weight:900;font-size:12.5px;cursor:pointer;color:#1A1512}
.rate:active{transform:scale(.95)}
.rate.again{background:var(--bad)}
.rate.hard{background:#D9A857}
.rate.good{background:var(--accent2)}
.rate.easy{background:#6FA8D9}
.lessonHead{font-size:18px;font-weight:900;margin-bottom:4px}
.lessonHead span{font-size:12px;color:var(--soft);font-weight:700;margin-left:8px}
.explain{font-size:13px;color:var(--soft);line-height:1.6;margin-bottom:16px}
.exerciseBox{background:var(--surface2);border-radius:16px;padding:28px 16px;font-size:20px;font-weight:700;text-align:center;flex:1;display:flex;align-items:center;justify-content:center;min-height:140px}
.ll{display:block;text-align:center;font-size:12px;color:var(--accent2);text-decoration:none;margin:14px 0;font-weight:700}
.tabs{position:fixed;bottom:0;left:0;right:0;z-index:10;background:var(--surface);border-top:1px solid var(--stroke);
display:flex;justify-content:space-around;padding:8px 6px calc(10px + env(safe-area-inset-bottom))}
.tab{background:none;border:none;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--soft);font-size:10.5px;font-weight:700;padding:4px 14px;border-radius:12px}
.tab .k{font-size:18px;font-weight:900}
.tab.on{color:var(--accent);background:rgba(217,119,87,0.12)}
`;
