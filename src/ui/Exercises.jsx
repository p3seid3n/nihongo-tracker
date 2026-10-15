import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Furi, Sentence } from "./Furi.jsx";
import { TokLine } from "./WordTap.jsx";
import { SpeakBtn } from "./Voice.jsx";
import { useApp } from "./common.jsx";
import { audioPlan, say, markupPart } from "../lib/audio.js";
import { checkBuild } from "../lib/exercises.js";
import { explainBuild, explainChoice } from "../lib/mistakes.js";
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
  if (!r || (!r.toks && !r.jp)) return null;
  return (
    <div className="recap">
      <div className="recap-h"><span>The full sentence</span><SpeakBtn part={part} size={22} /></div>
      {r.toks ? <TokLine toks={r.toks} all /> : <Sentence jp={r.jp} />}
      {r.en && <span className="en">{r.en}</span>}
    </div>
  );
}

/** The explanation inside the result panel: what went wrong and why, the fix, the full sentence, word by word. */
function Explanation({ verdict, recap }) {
  const e = verdict.explain;
  return (
    <div className="explain">
      {e && e.points && e.points.length > 0 && (
        <div className="ex-block">
          <span className="ex-label">{verdict.correct ? (e.alt ? "Also correct" : "Why it's right") : "What went wrong"}</span>
          {e.points.map((t, i) => <p key={i}><Rich text={t} /></p>)}
        </div>
      )}
      {e && e.fix && (
        <div className="ex-block fix">
          <span className="ex-label">{e.fix.label}</span>
          {e.fix.markup ? <span className="jp-line fix-line" lang="ja"><Furi m={e.fix.markup} /></span> : <span className="fix-line">{e.fix.text}</span>}
        </div>
      )}
      {recap && <Recap r={recap} />}
      {e && e.breakdown && e.breakdown.length > 1 && (
        <div className="ex-block">
          <span className="ex-label">Word by word</span>
          <div className="wbw">
            {e.breakdown.map((b, i) => (
              <span key={i} className={`wbw-item ${b.particle ? "particle" : ""}`}>
                <b lang="ja"><Furi m={b.jp} /></b>
                <small>{b.gloss || "\u00a0"}</small>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The result of an answer as a panel at the bottom: the verdict and Continue. Drag it up (or tap the handle)
 * to read why: what was wrong, how to fix it, the full sentence and a word-by-word breakdown.
 */
export function ResultSheet({ verdict, recap, onContinue }) {
  const [h, setH] = useState(0); // open height of the explanation in px
  const [dragging, setDragging] = useState(false);
  const bodyRef = useRef(null);
  const drag = useRef(null);
  const maxH = () => Math.min((bodyRef.current?.scrollHeight || 0), Math.round(window.innerHeight * 0.62));
  const hasMore = !!(verdict.explain && (verdict.explain.points?.length || verdict.explain.fix || verdict.explain.breakdown?.length > 1)) || !!(recap && (recap.toks || recap.jp));
  const open = h > 0;
  const toggle = () => { setH(open ? 0 : maxH()); hap.snap(); };
  const down = (e) => {
    if (!hasMore || e.button > 0) return;
    if (e.pointerType === "mouse") e.preventDefault(); // no text selection while dragging with a mouse
    drag.current = { y: e.clientY, h, t: performance.now(), moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (!d.moved && Math.abs(dy) < 6) return;
    if (!d.moved) { d.moved = true; setDragging(true); }
    const m = maxH();
    // a little give past either end
    let next = d.h + dy;
    if (next < 0) next = next / 4;
    if (next > m) next = m + (next - m) / 4;
    setH(next);
    d.v = dy / Math.max(1, performance.now() - d.t);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    setDragging(false);
    if (!d.moved) return; // a tap: handled by onClick
    const m = maxH();
    const flingUp = (d.v || 0) > 0.25, flingDown = (d.v || 0) < -0.25;
    const target = flingUp ? m : flingDown ? 0 : h > m / 2 ? m : 0;
    setH(target);
    if ((target > 0) !== (d.h > 0)) hap.snap();
  };
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Enter" && !e.repeat) { e.preventDefault(); onContinue(); }
      if ((e.key === "ArrowUp" || e.key === "?") && hasMore) { e.preventDefault(); setH(maxH()); }
      if (e.key === "ArrowDown") setH(0);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onContinue, hasMore]); // eslint-disable-line react-hooks/exhaustive-deps
  const word = verdict.explain?.alt ? "Also correct" : verdict.correct ? "Correct" : "Not quite";
  return (
    <div className={`result-sheet glass ${verdict.correct ? "ok" : "no"} ${open ? "open" : ""} ${dragging ? "dragging" : ""}`} role="status">
      <div className="rs-drag" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {hasMore && <button type="button" className="rs-grab" aria-expanded={open} aria-label={open ? "Hide the explanation" : "Show why"} onClick={toggle} data-haptic="none"><i /></button>}
        <div className="rs-head">
          <Icon name={verdict.correct ? "check" : "close"} size={24} />
          <b>{word}</b>
          {hasMore && <span className="rs-hint" aria-hidden="true">{open ? "" : "Swipe up for why"}</span>}
        </div>
        {!verdict.correct && verdict.answer && !open && <div className="rs-answer"><span className="dim">Answer: </span><b lang="ja"><Furi m={verdict.answer} /></b></div>}
      </div>
      <div className="rs-body" style={{ height: Math.max(0, h) }} aria-hidden={!open}>
        <div ref={bodyRef} className="rs-inner"><Explanation verdict={verdict} recap={recap} /></div>
      </div>
      <button className="btn btn-lg btn-block rs-continue" onClick={onContinue} autoFocus><span>Continue</span></button>
    </div>
  );
}

function Footer({ canCheck, onCheck, verdict, onContinue, recap, checkLabel = "Check" }) {
  useEffect(() => {
    if (verdict) return undefined;
    const k = (e) => {
      if (e.key !== "Enter" || e.repeat) return;
      if (canCheck) { e.preventDefault(); onCheck(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [canCheck, verdict, onCheck]);
  if (verdict) return <ResultSheet verdict={verdict} recap={recap} onContinue={onContinue} />;
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
    const chosen = ex.options.find((o) => o.id === sel);
    const ok = !!chosen?.correct;
    ok ? hap.correct() : hap.wrong();
    let explain = null;
    try { explain = explainChoice(ex, chosen); } catch (e) { console.error(e); explain = ex.explain ? { points: [ex.explain] } : null; }
    setVerdict({ correct: ok, answer: correct.text, explain });
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
      </div>
      <Footer canCheck={!!sel} onCheck={check} verdict={verdict} recap={ex.recap} onContinue={() => onDone(verdict.correct)} />
    </>
  );
}

/** A word tile; words you have not learned yet show their translation above. */
function Tile({ b, used, disabled, onClick, ...rest }) {
  return (
    <button type="button" className={`tilebtn ${used ? "used" : ""} ${b.gloss ? "has-g" : ""}`} lang="ja" disabled={disabled} onClick={onClick} data-tile={b.id} {...rest}>
      {b.gloss ? <span className="tk-g">{b.gloss}</span> : null}
      <span><Furi m={b.m} /></span>
    </button>
  );
}

/**
 * The tile board of "build the sentence": tap a tile to add or remove it, or drag it: from the bank into the
 * sentence (to any position), within the sentence to reorder, or out of the sentence to take it back.
 * Tiles slide to their new places (FLIP), and the gap where a dragged tile will land opens up.
 */
function TileBoard({ bank, picked, setPicked, locked }) {
  const byId = useMemo(() => Object.fromEntries(bank.map((b) => [b.id, b])), [bank]);
  const zoneRef = useRef(null);
  const boardRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, from: "bank" | "answer", x, y, w, h, dx, dy, at }
  const press = useRef(null);
  const rects = useRef(new Map());

  // FLIP: remember where tiles were, then slide them from there after a change
  useLayoutEffect(() => {
    const root = boardRef.current;
    if (!root) return;
    const prev = rects.current;
    const next = new Map();
    root.querySelectorAll("[data-tile]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const key = (el.closest(".answer-zone") ? "a:" : "b:") + el.dataset.tile;
      next.set(key, r);
      const was = prev.get(key) || prev.get((key.startsWith("a:") ? "b:" : "a:") + el.dataset.tile);
      if (!was || el.classList.contains("lifted")) return;
      const dx = was.left - r.left, dy = was.top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(0.2, 0.9, 0.25, 1.08)" });
    });
    rects.current = next;
  });

  const insertAt = (x, y) => {
    const zone = zoneRef.current;
    if (!zone) return picked.length;
    const els = [...zone.querySelectorAll("[data-tile]:not(.lifted)")];
    let i = 0;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const rowAbove = y > r.bottom;
      const sameRow = y >= r.top && y <= r.bottom;
      if (rowAbove || (sameRow && x > r.left + r.width / 2)) i++;
    }
    return i;
  };
  const overZone = (x, y) => {
    const r = zoneRef.current?.getBoundingClientRect();
    return !!r && x >= r.left - 16 && x <= r.right + 16 && y >= r.top - 28 && y <= r.bottom + 28;
  };

  const onDown = (e, id, from) => {
    if (locked || e.button > 0) return;
    if (e.pointerType === "mouse") e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    press.current = { id, from, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, el: e.currentTarget, pid: e.pointerId };
  };
  useEffect(() => {
    const mv = (e) => {
      const p = press.current;
      if (!p) return;
      if (!drag) {
        if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 7) return;
        try { p.el.setPointerCapture?.(p.pid); } catch { /* ignore */ }
        hap.tick();
      }
      e.preventDefault();
      const over = overZone(e.clientX, e.clientY);
      setDrag({ id: p.id, from: p.from, x: e.clientX - p.dx, y: e.clientY - p.dy, w: p.w, h: p.h, over, at: over ? insertAt(e.clientX, e.clientY) : -1 });
    };
    const upH = (e) => {
      const p = press.current;
      press.current = null;
      if (!p || !drag) return;
      const over = overZone(e.clientX, e.clientY);
      const without = picked.filter((x) => x !== p.id);
      if (over) {
        const at = Math.min(insertAt(e.clientX, e.clientY), without.length);
        setPicked([...without.slice(0, at), p.id, ...without.slice(at)]);
        hap.snap();
      } else if (p.from === "answer") {
        setPicked(without);
        hap.tap();
      }
      setDrag(null);
      // the click that follows a drag must not toggle the tile again
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 50);
    };
    window.addEventListener("pointermove", mv, { passive: false });
    window.addEventListener("pointerup", upH);
    window.addEventListener("pointercancel", upH);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", upH); window.removeEventListener("pointercancel", upH); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (id) => { if (!locked && !picked.includes(id)) { setPicked([...picked, id]); hap.tap(); } };
  const remove = (id) => { if (!locked) { setPicked(picked.filter((x) => x !== id)); hap.tap(); } };

  // the sentence as shown while dragging: the dragged tile's gap moves to where it would land
  const shown = picked.filter((id) => !(drag && drag.id === id));
  const slot = drag && drag.over ? Math.min(drag.at, shown.length) : -1;
  return (
    <div ref={boardRef} className={`tile-board ${drag ? "is-dragging" : ""}`}>
      <div ref={zoneRef} className={`tile-zone answer-zone ${drag && drag.over ? "hot" : ""}`} aria-label="Your sentence">
        {shown.map((id, i) => (
          <React.Fragment key={id}>
            {i === slot && <span className="tile-slot" style={{ width: drag.w }} />}
            <Tile b={byId[id]} onClick={() => remove(id)} onPointerDown={(e) => onDown(e, id, "answer")} />
          </React.Fragment>
        ))}
        {slot === shown.length && <span className="tile-slot" style={{ width: drag.w }} />}
        {!picked.length && !drag && <span className="zone-hint">Tap or drag the words here</span>}
      </div>
      <div className="tile-zone bank-zone" aria-label="Word bank">
        {bank.map((b) => {
          const used = picked.includes(b.id);
          return <Tile key={b.id} b={b} used={used} disabled={used || locked} onClick={() => add(b.id)} onPointerDown={(e) => !used && onDown(e, b.id, "bank")} />;
        })}
      </div>
      {drag && (
        <div className="tile-ghost" style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }} aria-hidden="true">
          <Tile b={byId[drag.id]} tabIndex={-1} />
        </div>
      )}
    </div>
  );
}

function Build({ ex, onDone }) {
  const [picked, setPicked] = useState([]); // bank ids in order
  const [verdict, setVerdict] = useState(null);
  const byId = useMemo(() => Object.fromEntries(ex.bank.map((b) => [b.id, b])), [ex]);
  const texts = picked.map((id) => byId[id].text);
  const check = () => {
    let explain = null;
    try { explain = explainBuild(ex, texts); } catch (e) { console.error(e); }
    const ok = checkBuild(ex, texts) || !!(explain && explain.alt);
    ok ? hap.correct() : hap.wrong();
    setVerdict({ correct: ok, answer: ex.answer.join(""), explain: explain || (ex.explain ? { points: [ex.explain] } : null) });
  };
  useRecapAudio(verdict, ex.recap);
  return (
    <>
      <div className="lesson-body">
      <div className="q-instr">{ex.instruction}</div>
      <div className="q-prompt"><span className="big">{ex.prompt.en}</span></div>
      <TileBoard bank={ex.bank} picked={picked} setPicked={setPicked} locked={!!verdict} />
      </div>
      <Footer canCheck={picked.length > 0} onCheck={check} verdict={verdict} recap={ex.recap || { jp: ex.answer.join("|"), en: ex.prompt.en }} onContinue={() => onDone(verdict.correct)} />
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
    if (sel.id === id) { setGone((g) => ({ ...g, [id]: true })); setSel(null); hap.match(); hear(id); return; }
    const key = side + id;
    setWrong(key); setMistakes((m) => m + 1); hap.wrong();
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
      {finished && <Footer verdict={{ correct: mistakes === 0, explain: mistakes ? { points: [`${mistakes} slip${mistakes === 1 ? "" : "s"}. Matching still helps you remember.`] } : null }} onContinue={() => onDone(mistakes === 0)} />}
    </>
  );
}

/**
 * Runs a list of exercises. Wrong answers come back once at the end.
 * onFinish({ correct, total, byLesson: {lessonId: {correct,total}}, ms })
 */
export function ExerciseRunner({ exercises, onFinish, onClose, title, resume = null, onProgress = null, onRestart = null }) {
  const [queue, setQueue] = useState(() => (resume && resume.queue) || exercises);
  const [i, setI] = useState(() => (resume && resume.i) || 0);
  const results = useRef(new Map(resume && resume.results ? resume.results : []));
  const started = useRef(Date.now() - ((resume && resume.ms) || 0));
  const total = (resume && resume.total) || exercises.length;
  const ex = queue[i];
  // remember the place after every answer (the caller stores it)
  useEffect(() => {
    if (onProgress) onProgress({ queue, i, results: [...results.current], ms: Date.now() - started.current, total });
  }, [queue, i]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {onRestart && i > 0 && <button className="icon-btn" onClick={onRestart} aria-label="Start this practice over"><Icon name="refresh" /></button>}
      </div>
      <div className="ex-frame" key={ex.id + ":" + i}>
        <Cmp ex={ex} onDone={done} />
      </div>
    </>
  );
}
