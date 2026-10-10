import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Furi, Sentence } from "./Furi.jsx";
import { TokLine } from "./WordTap.jsx";
import { SpeakBtn } from "./Voice.jsx";
import { useApp } from "./common.jsx";
import { audioPlan, say, markupPart } from "../lib/audio.js";
import { checkBuild } from "../lib/exercises.js";
import { plainOf } from "../lib/jp.js";
import * as hap from "../lib/haptics.js";

/** Inline text with **bold** and furigana markup. */
export function Rich({ text }) {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}><Furi m={p} /></strong> : <Furi key={i} m={p} />))}</>;
}

/** The part to read aloud for a finished sentence (native clip when the card has one). */
const recapPart = (r) => (r ? r.part || (r.jp ? markupPart(r.jp) : r.text ? { file: "", text: r.text } : null) : null);

/** Reads the sentence once an exercise has been answered, if "example sentence audio" isn't off. */
function useRecapAudio(verdict, recap) {
  const { store } = useApp();
  useEffect(() => {
    if (!verdict) return;
    const part = recapPart(recap);
    if (part && audioPlan(store.settings).sentence !== "off") say(part);
  }, [!!verdict]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** After an answer: the whole sentence, word by word, its translation and a speaker. Fills the empty space with something to learn from. */
function Recap({ r }) {
  const part = recapPart(r);
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }), 260);
    return () => clearTimeout(t);
  }, []);
  if (!r || (!r.toks && !r.jp)) return null;
  return (
    <div className="recap" ref={ref}>
      <div className="recap-h"><span>The full sentence</span><SpeakBtn part={part} size={22} /></div>
      {r.toks ? <TokLine toks={r.toks} all /> : <Sentence jp={r.jp} />}
      {r.en && <span className="en">{r.en}</span>}
    </div>
  );
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
  const selText = ex.options.find((o) => o.id === sel)?.text;
  useRecapAudio(verdict, ex.recap);
  const promptPart = !hasBlank && p.blank == null ? (p.toks ? ex.recap?.part || null : p.jp ? markupPart(p.jp) : null) : null;
  return (
    <>
      <div className="lesson-body">
      <div className="q-instr">{ex.instruction}</div>
      {(p.word || p.jp || p.text || p.toks) && (
        <div className="q-prompt">
          {p.toks && <><TokLine toks={p.toks} blank={p.blank} fill={verdict ? correct.text : selText} filled={!!(sel || verdict)} />{p.blank != null && p.en && <span className="dim">{p.en}</span>}</>}
          {p.word && <><span className="word" lang="ja"><Furi m={p.word} /></span>{p.wordEn && <span className="dim">{p.wordEn}</span>}</>}
          {hasBlank && <><Sentence jp={p.jp} blank={p.blank} fill={verdict || sel ? ex.options.find((o) => o.id === sel)?.text : null} filled={!!sel} />{p.en && <span className="dim">{p.en}</span>}</>}
          {!hasBlank && p.jp && <Sentence jp={p.jp} />}
          {promptPart && <SpeakBtn part={promptPart} className="prompt-say" />}
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
      {verdict && <Recap r={ex.recap} />}
      </div>
      <Footer canCheck={!!sel} onCheck={check} verdict={verdict} onContinue={() => onDone(verdict.correct)} />
    </>
  );
}

/** A word tile; words you have not learned yet show their translation above. */
function Tile({ b, used, disabled, onClick }) {
  return (
    <button type="button" className={`tilebtn ${used ? "used" : ""} ${b.gloss ? "has-g" : ""}`} lang="ja" disabled={disabled} onClick={onClick}>
      {b.gloss ? <span className="tk-g">{b.gloss}</span> : null}
      <span><Furi m={b.m} /></span>
    </button>
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
  useRecapAudio(verdict, ex.recap);
  const add = (id) => { if (!verdict && !picked.includes(id)) { setPicked([...picked, id]); hap.tap(); } };
  const remove = (id) => { if (!verdict) setPicked(picked.filter((x) => x !== id)); };
  return (
    <>
      <div className="lesson-body">
      <div className="q-instr">{ex.instruction}</div>
      <div className="q-prompt"><span className="big">{ex.prompt.en}</span></div>
      <div className="tile-zone answer-zone" aria-label="Your sentence">
        {picked.map((id) => <Tile key={id} b={byId[id]} lang="ja" onClick={() => remove(id)} />)}
      </div>
      <div className="tile-zone" aria-label="Word bank" style={{ borderStyle: "none", background: "transparent", padding: 0 }}>
        {ex.bank.map((b) => <Tile key={b.id} b={b} used={picked.includes(b.id)} disabled={picked.includes(b.id) || !!verdict} onClick={() => add(b.id)} />)}
      </div>
      {verdict && <Recap r={ex.recap} />}
      </div>
      <Footer canCheck={picked.length > 0} onCheck={check} verdict={verdict} onContinue={() => onDone(verdict.correct)} />
    </>
  );
}

function Match({ ex, onDone }) {
  const { store } = useApp();
  const hear = (id) => {
    if (audioPlan(store.settings).word === "off") return;
    const item = ex.left.find((p) => p.id === id);
    const part = item ? markupPart(item.jp) : null;
    if (part) say(part);
  };
  const [gone, setGone] = useState({});
  const [sel, setSel] = useState(null); // { side: "l" | "r", id } - start from either column
  const [wrong, setWrong] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const finished = Object.keys(gone).length === ex.pairs.length;
  const pick = (side, id) => {
    if (gone[id]) return;
    if (!sel || sel.side === side) {
      // first tap, or changing your mind within the same column
      setSel(sel && sel.side === side && sel.id === id ? null : { side, id });
      hap.tap();
      if (side === "l") hear(id);
      return;
    }
    if (sel.id === id) { setGone((g) => ({ ...g, [id]: true })); setSel(null); hap.good(); hear(id); return; }
    const key = side + id;
    setWrong(key); setMistakes((m) => m + 1); hap.bad();
    setTimeout(() => setWrong((w) => (w === key ? null : w)), 350);
  };
  const on = (side, id) => !!sel && sel.side === side && sel.id === id;
  return (
    <>
      <div className="lesson-body">
        <div className="q-instr">{ex.instruction}</div>
        <div className="match">
          <div className="stack">
            {ex.left.map((p) => <button key={p.id} className={`${gone[p.id] ? "gone" : ""} ${wrong === "l" + p.id ? "shake" : ""}`} aria-pressed={on("l", p.id)} disabled={!!gone[p.id]} onClick={() => pick("l", p.id)}><span className="jp-line" lang="ja" style={{ fontSize: "1.2rem" }}><Furi m={p.jp} /></span></button>)}
          </div>
          <div className="stack">
            {ex.right.map((p) => <button key={p.id} className={`${gone[p.id] ? "gone" : ""} ${wrong === "r" + p.id ? "shake" : ""}`} aria-pressed={on("r", p.id)} disabled={!!gone[p.id]} onClick={() => pick("r", p.id)}>{p.en}</button>)}
          </div>
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
      <div className="ex-frame" key={ex.id + ":" + i}>
        <Cmp ex={ex} onDone={done} />
      </div>
    </>
  );
}
