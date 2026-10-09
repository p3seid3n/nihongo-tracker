import React, { useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import { Furi, Sentence } from "./Furi.jsx";
import { Rich, ExerciseRunner } from "./Exercises.jsx";
import { useApp, useNow, PageHead, plural, Sheet, Burst } from "./common.jsx";
import { UNITS, LESSONS, LESSON_BY_ID, SOURCE } from "../content/lessons.js";
import { buildLessonExercises, buildReviewExercises, lessonExamples } from "../lib/exercises.js";
import { buildSentenceSession } from "../lib/sentenceEx.js";
import { mulberry32, shuffle } from "../content/generators.js";
import { makeWeight, sentencePool } from "../lib/personal.js";
import { currentRetrievability } from "../lib/fsrs.js";
import { dayStart, fmtSpan } from "../lib/time.js";
import * as hap from "../lib/haptics.js";

let allEnglish = null;
function makeCtx(store) {
  const rng = mulberry32((Math.random() * 2 ** 31) | 0);
  if (!allEnglish) allEnglish = LESSONS.flatMap((l) => lessonExamples(l).map((e) => e[1]));
  return { rng, weight: makeWeight(store), extraEngs: shuffle(rng, allEnglish).slice(0, 40) };
}

const isDue = (rec, now) => !!rec && !!rec.done && !!rec.due && dayStart(rec.due) <= dayStart(now);

// ---------------------------------------------------------------------------
// The path
export function Learn() {
  const { store, open } = useApp();
  const now = useNow(60000);
  const [unitSheet, setUnitSheet] = useState(null);
  const done = LESSONS.filter((l) => store.lessons[l.id]?.done).length;
  const due = LESSONS.filter((l) => isDue(store.lessons[l.id], now));
  const next = LESSONS.find((l) => !store.lessons[l.id]?.done);
  const pool = useMemo(() => sentencePool(store, now), [store.getVersion()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <PageHead title="Grammar" right={<span className="chip">{done} / {LESSONS.length}</span>} />
      <div className="row-wrap">
        <button className="btn btn-tonal" disabled={!done} onClick={() => open({ type: "review" })}><Icon name="refresh" /> Review{due.length ? ` (${due.length} due)` : ""}</button>
        <button className="btn btn-soft" disabled={pool.length < 6} onClick={() => open({ type: "sentences" })}><Icon name="book" /> Sentence practice</button>
      </div>
      {pool.length < 6 && <p className="hint" style={{ marginTop: -8 }}>Sentence practice unlocks once you have studied a few vocabulary cards with example sentences.</p>}

      <div className="path">
        {UNITS.map((u) => {
          const ls = LESSONS.filter((l) => l.unit === u.id);
          const d = ls.filter((l) => store.lessons[l.id]?.done).length;
          return (
            <section key={u.id}>
              <div className="unit-head">
                <div className="spread">
                  <div><h2>{u.title}</h2><div className="meta">{u.blurb}</div></div>
                  <button className="icon-btn" aria-label={`Options for ${u.title}`} onClick={() => setUnitSheet(u)}><Icon name="list" /></button>
                </div>
                <div className="bar"><i style={{ width: `${(d / ls.length) * 100}%` }} /></div>
                <div className="tiny faint">{d} of {ls.length} lessons · Tae Kim ch. {u.ref.replace(/^Chapters? /, "")}</div>
              </div>
              <div className="nodes">
                {ls.map((l) => {
                  const rec = store.lessons[l.id];
                  const isDone = !!rec?.done;
                  const isNext = next && next.id === l.id;
                  const R = isDone ? currentRetrievability(rec, now) : 0;
                  const dueNow = isDue(rec, now);
                  return (
                    <button key={l.id} className={`node ${isDone ? "done" : isNext ? "available" : ""}`} onClick={() => open({ type: "lesson", id: l.id })}>
                      <span className="node-dot">
                        {isDone && <svg className="ring-svg" viewBox="0 0 70 70"><circle cx="35" cy="35" r="31" stroke="var(--s4)" /><circle cx="35" cy="35" r="31" stroke="var(--sage)" strokeDasharray={2 * Math.PI * 31} strokeDashoffset={2 * Math.PI * 31 * (1 - Math.max(0.05, R || 0.05))} /></svg>}
                        {isDone ? <Icon name="check" size={26} /> : isNext ? <Icon name="play" size={24} /> : <span>{l.index + 1}</span>}
                      </span>
                      <span className="grow">
                        <div className="t">{l.title}</div>
                        <div className="s"><span lang="ja">{l.jp}</span> · {isDone ? (dueNow ? "Review due" : `Recall ${Math.round(R * 100)}%`) : l.blurb}</div>
                      </span>
                      {dueNow && <span className="chip chip-primary">Due</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="tiny faint">Lesson order follows <a href={SOURCE.url} target="_blank" rel="noreferrer">{SOURCE.name}</a> ({SOURCE.license}). Explanations and practice sentences are written for this app.</p>

      {unitSheet && <UnitSheet unit={unitSheet} onClose={() => setUnitSheet(null)} />}
    </div>
  );
}

function UnitSheet({ unit, onClose }) {
  const { store, open, confirm, toast } = useApp();
  const ls = LESSONS.filter((l) => l.unit === unit.id);
  const pending = ls.filter((l) => !store.lessons[l.id]?.done);
  return (
    <Sheet title={unit.title} onClose={onClose}>
      <p className="dim">{unit.blurb}</p>
      <button className="btn btn-tonal btn-block" disabled={!pending.length} onClick={() => { onClose(); open({ type: "testout", unit: unit.id }); }}>
        <Icon name="target" /> Test out of this unit
      </button>
      <p className="hint">Answer a mixed set. Score 80% or more and all {pending.length} remaining lessons count as known.</p>
      <button className="btn btn-soft btn-block" disabled={!pending.length} onClick={async () => {
        const ok = await confirm({ title: "Mark unit as known?", body: `${plural(pending.length, "lesson")} will count as learned. They return for a quick refresher over the next days.`, confirm: "Mark as known" });
        if (ok) { store.markLessonsDone(pending.map((l) => l.id)); toast("Marked as known"); onClose(); }
      }}>I already know this unit</button>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Lesson player
export function LessonPlayer({ id, onClose, onOpen }) {
  const { store } = useApp();
  const lesson = LESSON_BY_ID[id];
  const [stage, setStage] = useState("learn");
  const [page, setPage] = useState(0);
  const [exs, setExs] = useState(null);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  if (!lesson) return <Shell onClose={onClose}><div className="lesson-body"><p>This lesson doesn't exist any more.</p><button className="btn btn-primary" onClick={onClose}>Back</button></div></Shell>;

  const startPractice = () => {
    try {
      const list = buildLessonExercises(lesson, makeCtx(store));
      if (!list.length) throw new Error("no exercises");
      setExs(list); setStage("practice"); setErr("");
    } catch (e) {
      console.error(e);
      setErr("Couldn't build practice for this lesson. Try again.");
    }
  };

  const finish = (r) => {
    const acc = r.total ? r.correct / r.total : 0;
    const first = !store.lessons[id]?.done;
    const rec = store.recordLesson(id, acc, { first });
    store.logLesson(id, acc, r.ms);
    setResult({ acc, rec, passed: acc >= 0.6, r });
    setStage("result");
    hap.done();
  };

  if (stage === "practice") {
    return <Shell><ExerciseRunner exercises={exs} onFinish={finish} onClose={onClose} title={lesson.title} /></Shell>;
  }

  if (stage === "result") {
    const idx = LESSONS.findIndex((l) => l.id === id);
    const nextL = LESSONS[idx + 1];
    return (
      <Shell onClose={onClose}>
        <div className="lesson-body" style={{ alignItems: "center", textAlign: "center", paddingTop: 40 }}>
          {result.passed && <Burst />}
          <div className="big jp" lang="ja" style={{ fontSize: "4rem", color: result.passed ? "var(--primary)" : "var(--rose)" }}>{result.acc >= 1 ? "完璧" : result.passed ? "合格" : "もう一度"}</div>
          <h1>{result.passed ? "Lesson complete" : "Almost there"}</h1>
          <div className="stat-row">
            <div className="stat"><b>{Math.round(result.acc * 100)}%</b><span>correct first try</span></div>
            <div className="stat"><b>{result.r.correct}/{result.r.total}</b><span>exercises</span></div>
            <div className="stat"><b>{fmtSpan(Math.max(0, result.rec.due - Date.now()))}</b><span>until refresher</span></div>
          </div>
          {!result.passed && <p className="dim">Read the lesson once more, then try again. You need 60% to move on.</p>}
          <div className="stack" style={{ width: "100%", marginTop: "auto" }}>
            {result.passed && nextL && <button className="btn btn-primary btn-lg btn-block" onClick={() => onOpen({ type: "lesson", id: nextL.id })}>Next: {nextL.title}</button>}
            <button className={`btn btn-block ${result.passed && nextL ? "btn-soft" : "btn-primary btn-lg"}`} onClick={startPractice}>Practice again</button>
            {!result.passed && <button className="btn btn-soft btn-block" onClick={() => { setStage("learn"); setPage(0); }}>Read the lesson again</button>}
            <button className="btn btn-ghost btn-block" onClick={onClose}>Done</button>
          </div>
        </div>
      </Shell>
    );
  }

  const pages = lesson.pages || [];
  const p = pages[page];
  const last = page >= pages.length - 1;
  return (
    <Shell onClose={onClose}>
      <div className="lesson-top">
        <button className="icon-btn" onClick={onClose} aria-label="Close lesson"><Icon name="close" /></button>
        <div className="grow"><div className="dots">{pages.map((_, i) => <i key={i} className={i === page ? "on" : i < page ? "past" : ""} />)}</div></div>
        <button className="btn btn-ghost btn-sm" onClick={startPractice}>Skip to practice</button>
      </div>
      <div className="lesson-body" key={page}>
        {page === 0 && (<div className="stack" style={{ gap: 4 }}><span className="chip chip-primary" style={{ alignSelf: "flex-start" }}>Tae Kim §{lesson.ref}</span><h1>{lesson.title}</h1><div className="dim jp" lang="ja" style={{ fontSize: "1.1rem" }}>{lesson.jp}</div></div>)}
        {p && (
          <>
            <h2>{p.h}</h2>
            <div className="prose">{(p.p || []).map((t, i) => <p key={i}><Rich text={t} /></p>)}</div>
            {p.table && (
              <div className="table-wrap"><table className="t"><thead><tr>{p.table.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                <tbody>{p.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}</tbody></table></div>
            )}
            {(p.ex || []).map((e, i) => (
              <div className="ex-card" key={i}>
                <Sentence jp={e[0]} />
                <span className="en">{e[1]}</span>
                {e[2] && <span className="note"><Rich text={e[2]} /></span>}
              </div>
            ))}
          </>
        )}
        {err && <p className="error-text">{err}</p>}
        <div className="sticky-actions">
          <div className="row">
            {page > 0 && <button className="btn btn-soft" onClick={() => setPage(page - 1)}>Back</button>}
            <button className="btn btn-primary btn-lg grow" onClick={() => (last ? startPractice() : setPage(page + 1))}>{last ? "Start practice" : "Continue"}</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return <div className="fullscreen"><div className="study">{children}</div></div>;
}

// ---------------------------------------------------------------------------
// Mixed practice: grammar review, test-out and sentence reading
export function PracticePlayer({ mode, unitId, onClose }) {
  const { store } = useApp();
  const [state] = useState(() => {
    const ctx = makeCtx(store);
    try {
      if (mode === "sentences") return { list: buildSentenceSession(store, ctx.rng, { n: 10 }).list };
      if (mode === "testout") {
        const ls = LESSONS.filter((l) => l.unit === unitId);
        return { list: buildReviewExercises(ls, ctx, 10), lessons: ls };
      }
      const doneLs = LESSONS.filter((l) => store.lessons[l.id]?.done);
      const dueLs = doneLs.filter((l) => isDue(store.lessons[l.id], Date.now()));
      const src = shuffle(ctx.rng, dueLs.length ? dueLs : doneLs).slice(0, 6);
      return { list: buildReviewExercises(src, ctx, 8) };
    } catch (e) { console.error(e); return { list: [] }; }
  });
  const [result, setResult] = useState(null);

  const finish = (r) => {
    const acc = r.total ? r.correct / r.total : 0;
    let note = "";
    let passed = true;
    if (mode === "review") {
      for (const [lid, b] of Object.entries(r.byLesson)) if (LESSON_BY_ID[lid]) store.recordLesson(lid, b.correct / b.total);
    } else if (mode === "testout") {
      passed = acc >= 0.8;
      if (passed) {
        const ids = state.lessons.filter((l) => !store.lessons[l.id]?.done).map((l) => l.id);
        store.markLessonsDone(ids);
        note = `${plural(ids.length, "lesson")} marked as known.`;
      } else note = "You need 80% to skip this unit. The lessons are waiting for you.";
    }
    store.logLesson(mode === "sentences" ? "sentences" : mode, acc, r.ms);
    setResult({ acc, passed, note, r });
    hap.done();
  };

  if (!state.list.length) {
    return (
      <Shell>
        <div className="lesson-body" style={{ alignItems: "center", textAlign: "center", paddingTop: 60 }}>
          <h1>Nothing to practise yet</h1>
          <p className="dim">{mode === "sentences" ? "Study a few vocabulary cards that have example sentences first." : "Complete a lesson first."}</p>
          <button className="btn btn-primary btn-lg" onClick={onClose}>Back</button>
        </div>
      </Shell>
    );
  }
  if (result) {
    return (
      <Shell>
        <div className="lesson-body" style={{ alignItems: "center", textAlign: "center", paddingTop: 40 }}>
          {result.passed && <Burst />}
          <div className="big jp" lang="ja" style={{ fontSize: "4rem", color: result.passed ? "var(--primary)" : "var(--rose)" }}>{result.passed ? "完了" : "残念"}</div>
          <h1>{mode === "testout" ? (result.passed ? "Unit skipped" : "Not this time") : "Practice complete"}</h1>
          <div className="stat-row">
            <div className="stat"><b>{Math.round(result.acc * 100)}%</b><span>correct first try</span></div>
            <div className="stat"><b>{result.r.correct}/{result.r.total}</b><span>exercises</span></div>
            <div className="stat"><b>{Math.max(1, Math.round(result.r.ms / 60000))}</b><span>min</span></div>
          </div>
          {result.note && <p className="dim">{result.note}</p>}
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: "auto" }} onClick={onClose}>Done</button>
        </div>
      </Shell>
    );
  }
  return <Shell><ExerciseRunner exercises={state.list} onFinish={finish} onClose={onClose} title={mode === "sentences" ? "Sentences" : mode === "testout" ? "Test out" : "Review"} /></Shell>;
}
