import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Furi, Sentence } from "./Furi.jsx";
import { checkBuild } from "../lib/exercises.js";
import { plainOf } from "../lib/jp.js";
import * as hap from "../lib/haptics.js";

/** Inline text with **bold** and furigana markup. */
export function Rich({ text }) {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}><Furi m={p} /></strong> : <Furi key={i} m={p} />))}</>;
}

function Footer({ canCheck, onCheck, verdict, onContinue, checkLabel = "Check" }) {
  useEffect(() => {
    const k = (e) => {
      if (e.key !== "Enter" || e.repeat) return;
      if (verdict) { e.preventDefault(); onContinue(); }
      else if (canCheck) { e.preventDefault(); onCheck(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [canCheck, verdict, onCheck, onContinue]);
  if (verdict) {
    return (
      <div className={`feedback ${verdict.correct ? "ok" : "no"}`} role="status">
        <div className="row"><Icon name={verdict.correct ? "check" : "close"} size={24} /><b style={{ fontSize: "1.15rem" }}>{verdict.correct ? "Correct" : "Not quite"}</b></div>
        {verdict.answer && !verdict.correct && <div className="why"><span className="dim">Answer: </span><b lang="ja"><Furi m={verdict.answer} /></b></div>}
        {verdict.explain && <div className="why"><Furi m={verdict.explain} /></div>}
        <button className="btn btn-lg btn-block" style={{ background: "currentColor" }} onClick={onContinue} autoFocus>
          <span style={{ color: "var(--bg)" }}>Continue</span>
        </button>
      </div>
    );
  }
  return (
    <div className="sticky-actions">
      <button className="btn btn-primary btn-lg btn-block" data-haptic="none" disabled={!canCheck} onClick={onCheck}>{checkLabel}</button>
    </div>
  );
}

function Choose({ ex, onDone }) {
  const [sel, setSel] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const p = ex.prompt || {};
  const correct = ex.options.find((o) => o.correct);
  const check = () => {
    const ok = !!ex.options.find((o) => o.id === sel)?.correct;
    ok ? hap.good() : hap.bad();
    setVerdict({ correct: ok, answer: correct.text, explain: ex.explain });
  };
  const hasBlank = p.blank != null && p.jp;
  return (
    <>
      <div className="q-instr">{ex.instruction}</div>
      {(p.word || p.jp || p.text) && (
        <div className="q-prompt">
          {p.word && <><span className="word" lang="ja"><Furi m={p.word} /></span>{p.wordEn && <span className="dim">{p.wordEn}</span>}</>}
          {hasBlank && <><Sentence jp={p.jp} blank={p.blank} fill={verdict || sel ? ex.options.find((o) => o.id === sel)?.text : null} filled={!!sel} />{p.en && <span className="dim">{p.en}</span>}</>}
          {!hasBlank && p.jp && <Sentence jp={p.jp} />}
          {p.text && <span className="big"><Furi m={p.text} mode={p.noFuri ? "never" : undefined} /></span>}
        </div>
      )}
      <div className="opts" role="group" aria-label="Answers">
        {ex.options.map((o) => {
          let cls = "opt";
          if (verdict) {
            if (o.correct) cls += " right";
            else if (o.id === sel) cls += " wrong";
            else cls += " dimmed";
          }
          const jp = !!o.jp || hasBlank;
          return (
            <button key={o.id} className={cls} aria-pressed={sel === o.id && !verdict} disabled={!!verdict} onClick={() => { setSel(o.id); hap.tap(); }}>
              {jp ? <span className="jp-line" lang="ja"><Furi m={o.text} /></span> : <span><Furi m={o.text} /></span>}
            </button>
          );
        })}
      </div>
      <Footer canCheck={!!sel} onCheck={check} verdict={verdict} onContinue={() => onDone(verdict.correct)} />
    </>
  );
}

function Build({ ex, onDone }) {
  const [picked, setPicked] = useState([]); // bank ids in order
  const [verdict, setVerdict] = useState(null);
  const byId = useMemo(() => Object.fromEntries(ex.bank.map((b) => [b.id, b])), [ex]);
  const texts = picked.map((id) => byId[id].text);
  const check = () => {
    const ok = checkBuild(ex, texts);
    ok ? hap.good() : hap.bad();
    setVerdict({ correct: ok, answer: ex.answer.join(""), explain: ex.explain });
  };
  const add = (id) => { if (!verdict && !picked.includes(id)) { setPicked([...picked, id]); hap.tap(); } };
  const remove = (id) => { if (!verdict) setPicked(picked.filter((x) => x !== id)); };
  return (
    <>
      <div className="q-instr">{ex.instruction}</div>
      <div className="q-prompt"><span className="big">{ex.prompt.en}</span></div>
      <div className="tile-zone answer-zone" aria-label="Your sentence">
        {picked.map((id) => <button key={id} className="tilebtn" lang="ja" onClick={() => remove(id)}><Furi m={byId[id].m} /></button>)}
      </div>
      <div className="tile-zone" aria-label="Word bank" style={{ borderStyle: "none", background: "transparent", padding: 0 }}>
        {ex.bank.map((b) => <button key={b.id} className={`tilebtn ${picked.includes(b.id) ? "used" : ""}`} lang="ja" disabled={picked.includes(b.id) || !!verdict} onClick={() => add(b.id)}><Furi m={b.m} /></button>)}
      </div>
      <Footer canCheck={picked.length > 0} onCheck={check} verdict={verdict} onContinue={() => onDone(verdict.correct)} />
    </>
  );
}

function Match({ ex, onDone }) {
  const [gone, setGone] = useState({});
  const [left, setLeft] = useState(null);
  const [wrong, setWrong] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const finished = Object.keys(gone).length === ex.pairs.length;
  const tapLeft = (id) => { if (!gone[id]) { setLeft(id); hap.tap(); } };
  const tapRight = (id) => {
    if (gone[id] || !left) return;
    if (left === id) { setGone((g) => ({ ...g, [id]: true })); setLeft(null); hap.good(); }
    else { setWrong(id); setMistakes((m) => m + 1); hap.bad(); setTimeout(() => setWrong(null), 350); }
  };
  return (
    <>
      <div className="q-instr">{ex.instruction}</div>
      <div className="match">
        <div className="stack">
          {ex.left.map((p) => <button key={p.id} className={gone[p.id] ? "gone" : ""} aria-pressed={left === p.id} disabled={!!gone[p.id]} onClick={() => tapLeft(p.id)}><span className="jp-line" lang="ja" style={{ fontSize: "1.2rem" }}><Furi m={p.jp} /></span></button>)}
        </div>
        <div className="stack">
          {ex.right.map((p) => <button key={p.id} className={`${gone[p.id] ? "gone" : ""} ${wrong === p.id ? "shake" : ""}`} disabled={!!gone[p.id]} onClick={() => tapRight(p.id)}>{p.en}</button>)}
        </div>
      </div>
      {finished && <Footer verdict={{ correct: mistakes === 0, explain: mistakes ? `${mistakes} slip${mistakes === 1 ? "" : "s"}. Matching still helps you remember.` : "" }} onContinue={() => onDone(mistakes === 0)} />}
    </>
  );
}

/**
 * Runs a list of exercises. Wrong answers come back once at the end.
 * onFinish({ correct, total, byLesson: {lessonId: {correct,total}}, ms })
 */
export function ExerciseRunner({ exercises, onFinish, onClose, title }) {
  const [queue, setQueue] = useState(exercises);
  const [i, setI] = useState(0);
  const results = useRef(new Map());
  const started = useRef(Date.now());
  const total = exercises.length;
  const ex = queue[i];

  const done = useCallback((ok) => {
    const cur = queue[i];
    const first = !cur.retry;
    if (first) results.current.set(cur.id, { lessonId: cur.lessonId, ok });
    let nq = queue;
    if (!ok && first && cur.kind !== "match") nq = [...queue, { ...cur, retry: true, id: cur.id + "r" }];
    if (i + 1 >= nq.length) {
      const byLesson = {};
      let correct = 0;
      for (const r of results.current.values()) {
        const b = (byLesson[r.lessonId] = byLesson[r.lessonId] || { correct: 0, total: 0 });
        b.total++; if (r.ok) { b.correct++; correct++; }
      }
      onFinish({ correct, total: results.current.size, byLesson, ms: Date.now() - started.current });
      return;
    }
    setQueue(nq);
    setI(i + 1);
  }, [queue, i, onFinish]);

  if (!ex) return null;
  const answered = results.current.size;
  const pct = Math.round((Math.min(answered, total) / total) * 100);
  const Cmp = ex.kind === "choose" ? Choose : ex.kind === "build" ? Build : Match;
  return (
    <>
      <div className="lesson-top">
        <button className="icon-btn" onClick={onClose} aria-label="Leave practice"><Icon name="close" /></button>
        <div className="study-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        {title && <span className="chip">{title}</span>}
      </div>
      <div className="lesson-body" key={ex.id + ":" + i}>
        <Cmp ex={ex} onDone={done} />
      </div>
    </>
  );
}
