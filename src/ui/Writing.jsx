import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons.jsx";
import { Sheet, Seg, Burst, useApp, plural } from "./common.jsx";
import { GRID, loadStrokes, pathPoints, pathLength, checkStroke, isWritable } from "../lib/strokes.js";
import { KANJI_RE } from "../lib/jp.js";
import * as hap from "../lib/haptics.js";

/**
 * Drawing pad for one character. You draw each stroke; it is accepted only if its shape, direction
 * and position fit the next stroke in the correct order. Trace mode shows a guide; memory mode doesn't.
 * onFinish({ mistakes, hints, ms }) fires once when the last stroke is accepted.
 */
export function WritePad({ char, title, sub, initialMode = "trace", nextLabel = "Next", onNext, onFinish }) {
  const [paths, setPaths] = useState(undefined); // undefined = loading, null = no data
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [done, setDone] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [misses, setMisses] = useState(0);
  const [msg, setMsg] = useState("");
  const [hint, setHint] = useState(false);
  const [ink, setInk] = useState(null);
  const [bad, setBad] = useState(null);
  const [demo, setDemo] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const svg = useRef(null);
  const pid = useRef(null);
  const pts = useRef([]);
  const started = useRef(Date.now());
  const badTimer = useRef(0);
  const reported = useRef(false);

  const load = useCallback(() => {
    let alive = true;
    setPaths(undefined); setFailed(false);
    loadStrokes(char).then((p) => alive && setPaths(p)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [char]);
  useEffect(load, [load]);
  useEffect(() => () => clearTimeout(badTimer.current), []);

  const models = useMemo(() => (paths ? paths.map((d) => pathPoints(d)) : []), [paths]);
  const total = models.length;
  const finished = total > 0 && done >= total;

  const reset = useCallback((nextMode) => {
    setDone(0); setMistakes(0); setHints(0); setMisses(0); setMsg(""); setHint(false); setInk(null); setBad(null); setDemo(null);
    setAttempt((a) => a + 1);
    started.current = Date.now(); reported.current = false;
    if (nextMode) setMode(nextMode);
  }, []);
  useEffect(() => { reset(initialMode); }, [char]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      hap.success();
      onFinish?.({ mistakes, hints, ms: Date.now() - started.current, strokes: total });
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // "show order" animation
  useEffect(() => {
    if (demo == null) return undefined;
    if (demo >= total) { const t = setTimeout(() => setDemo(null), 900); return () => clearTimeout(t); }
    const ms = 380 + pathLength(models[demo]) * 5;
    const t = setTimeout(() => setDemo(demo + 1), ms);
    return () => clearTimeout(t);
  }, [demo, total, models]);

  const toXY = (e) => {
    const r = svg.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * GRID, ((e.clientY - r.top) / r.height) * GRID];
  };
  const locked = finished || demo != null || !total;

  const down = (e) => {
    if (locked || pid.current != null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pid.current = e.pointerId;
    pts.current = [toXY(e)];
    setMsg("");
    setInk([...pts.current]);
  };
  const move = (e) => {
    if (pid.current !== e.pointerId) return;
    const evs = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
    let changed = false;
    for (const ev of evs) {
      const p = toXY(ev);
      const last = pts.current[pts.current.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.6) { pts.current.push(p); changed = true; }
    }
    if (changed) setInk(pts.current.slice());
  };
  const up = (e) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    const user = pts.current;
    pts.current = [];
    setInk(null);
    if (e.type === "pointercancel") return;
    const k = done;
    const model = models[k];
    if (!model) return;
    const isDot = pathLength(model) < 16;
    if (!isDot && pathLength(user) < 4) return; // an accidental tap, not a stroke
    const r = checkStroke(user, models, k, { leniency: mode === "trace" ? 1.15 : 1 });
    if (r.ok) {
      setDone(k + 1); setMisses(0); setHint(false); setMsg("");
      hap.snap();
      return;
    }
    hap.bad();
    setMistakes((m) => m + 1);
    const m = misses + 1;
    setMisses(m);
    setBad({ pts: user, key: Date.now() });
    clearTimeout(badTimer.current);
    badTimer.current = setTimeout(() => setBad(null), 500);
    setMsg(r.order != null ? `That's stroke ${r.order + 1}. Stroke ${k + 1} comes first.` : mode === "trace" ? "Follow the guide, start at the dot." : "Not quite. Check the direction and where it starts.");
    if (m >= 3) { setHint(true); setHints((h) => h + 1); }
  };

  const showHint = () => { if (locked) return; setHint(true); setHints((h) => h + 1); hap.tap(); };
  const showOrder = () => { reset(); setDemo(0); hap.tap(); };
  const nextStart = !finished && models[done] ? models[done][0] : null;
  const showGuide = mode === "trace" && demo == null;

  const poly = (p) => p.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ");

  if (failed) {
    return (
      <div className="stack center" style={{ alignItems: "center", textAlign: "center" }}>
        <div className="jp kanji-big" lang="ja" style={{ fontSize: "5rem" }}>{char}</div>
        <p className="dim">Couldn't load the stroke data. It downloads the first time you practise, so connect once and it works offline after that.</p>
        <button className="btn btn-primary" onClick={load}>Try again</button>
        {onNext && <button className="btn btn-ghost" onClick={() => onNext({ skipped: true })}>Skip</button>}
      </div>
    );
  }
  if (paths === null) {
    return (
      <div className="stack center" style={{ alignItems: "center", textAlign: "center" }}>
        <div className="jp kanji-big" lang="ja" style={{ fontSize: "5rem" }}>{char}</div>
        <p className="dim">There is no stroke order data for this character.</p>
        {onNext && <button className="btn btn-primary" onClick={() => onNext({ skipped: true })}>{nextLabel}</button>}
      </div>
    );
  }

  return (
    <div className="pad-block">
      {(title || sub) && (
        <div className="pad-head">
          <div className="grow">
            {title && <div className="pad-title">{title}</div>}
            {sub && <div className="dim small">{sub}</div>}
          </div>
          <span className="chip">{paths ? plural(total, "stroke") : "…"}</span>
        </div>
      )}
      <div className={`pad-wrap ${finished ? "finished" : ""}`}>
        <svg ref={svg} className="pad" viewBox={`0 0 ${GRID} ${GRID}`} role="img" aria-label={`Drawing area for ${char}`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <rect className="pad-bg" x="0" y="0" width={GRID} height={GRID} rx="5" />
          <g className="pad-grid"><line x1="54.5" y1="3" x2="54.5" y2="106" /><line x1="3" y1="54.5" x2="106" y2="54.5" /><line x1="3" y1="3" x2="106" y2="106" /><line x1="106" y1="3" x2="3" y2="106" /></g>
          {paths && showGuide && paths.map((d, i) => <path key={"g" + i} d={d} className="pad-stroke guide" />)}
          {paths && demo != null && paths.map((d, i) => (i <= demo ? <path key={"d" + attempt + i} d={d} pathLength="1" className="pad-stroke demo" /> : null))}
          {paths && demo == null && paths.map((d, i) => (i < done ? <path key={"o" + attempt + i} d={d} className="pad-stroke ok" /> : null))}
          {paths && hint && !finished && models[done] && <path key={"h" + attempt + done + hints} d={paths[done]} pathLength="1" className="pad-stroke hint" />}
          {nextStart && (showGuide || hint) && (
            <g className="pad-start" transform={`translate(${nextStart[0]} ${nextStart[1]})`}>
              <circle r="4.6" /><text y="1.7" textAnchor="middle">{done + 1}</text>
            </g>
          )}
          {ink && ink.length > 0 && <polyline className="pad-ink" points={poly(ink.length === 1 ? [ink[0], [ink[0][0] + 0.01, ink[0][1]]] : ink)} />}
          {bad && bad.pts.length > 0 && <polyline key={bad.key} className="pad-ink bad" points={poly(bad.pts.length === 1 ? [bad.pts[0], [bad.pts[0][0] + 0.01, bad.pts[0][1]]] : bad.pts)} />}
        </svg>
        {paths === undefined && <div className="pad-loading dim">Loading…</div>}
      </div>

      <div className="pad-status" role="status" aria-live="polite">
        {finished
          ? <b className="ok-text">{mistakes === 0 && hints === 0 ? "Perfect!" : mistakes <= 2 ? "Well done" : "Done. Practise it once more"}</b>
          : msg ? <span className="error-text">{msg}</span>
          : <span className="dim">{demo != null ? "Watch the stroke order…" : total ? `Stroke ${Math.min(done + 1, total)} of ${total}` : ""}</span>}
      </div>

      <Seg label="Practice mode" value={mode} onChange={(m) => m !== mode && reset(m)} options={[{ value: "trace", label: "Trace" }, { value: "memory", label: "From memory" }]} />
      <div className="pad-actions">
        {finished ? (
          <>
            <button className="btn btn-soft" onClick={() => reset()}><Icon name="refresh" /> Again</button>
            {onNext && <button className="btn btn-primary" onClick={() => onNext({ mistakes, hints })}>{nextLabel}</button>}
          </>
        ) : (
          <>
            <button className="btn btn-soft" onClick={showHint} disabled={locked}><Icon name="info" /> Hint</button>
            <button className="btn btn-soft" onClick={showOrder} disabled={demo != null || !total}><Icon name="play" /> Show order</button>
            <button className="btn btn-ghost" onClick={() => reset()} disabled={locked && demo == null}><Icon name="undo" /> Clear</button>
          </>
        )}
      </div>
    </div>
  );
}

/** Sheet used from a study card: writes each character of the word in turn. */
export function WriteSheet({ items, onClose, initialMode = "trace" }) {
  const [idx, setIdx] = useState(0);
  const it = items[idx];
  const last = idx >= items.length - 1;
  return (
    <Sheet title={items.length > 1 ? `Write it (${idx + 1}/${items.length})` : "Write it"} onClose={onClose}>
      <WritePad key={it.ch + idx} char={it.ch} title={it.title} sub={it.sub} initialMode={initialMode}
        nextLabel={last ? "Done" : "Next kanji"} onNext={() => (last ? onClose() : setIdx(idx + 1))} />
    </Sheet>
  );
}

/** Pen button for a card: opens the writing sheet for the writable characters of `text`. */
export function WriteBtn({ text, title, sub, className = "" }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => {
    const chars = [...new Set([...String(text || "")])];
    const kanji = chars.filter((c) => KANJI_RE.test(c));
    const pick = kanji.length ? kanji : chars.length === 1 && isWritable(chars[0]) ? chars : [];
    return pick.map((c) => ({ ch: c, title, sub }));
  }, [text, title, sub]);
  if (!items.length) return null;
  return (
    <>
      <button type="button" className={`icon-btn say-btn ${className}`} aria-label="Practise writing" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <Icon name="pen" size={22} />
      </button>
      {open && createPortal(<div style={{ display: "contents" }} onClick={(e) => e.stopPropagation()}><WriteSheet items={items} onClose={() => setOpen(false)} /></div>, document.body)}
    </>
  );
}

/** Full-screen writing session from the Today plan. */
export function WritingPlayer({ items, onClose }) {
  const { store } = useApp();
  const [i, setI] = useState(0);
  const results = useRef([]);
  const t0 = useRef(Date.now());
  const [finished, setFinished] = useState(false);

  const next = (r) => {
    results.current.push(r || {});
    if (i + 1 >= items.length) {
      const strokes = results.current.reduce((a, x) => a + (x.strokes || 0), 0);
      const slips = results.current.reduce((a, x) => a + (x.mistakes || 0), 0);
      const acc = strokes ? Math.max(0, 1 - slips / (strokes * 1.5)) : 1;
      store.logLesson("writing", acc, Date.now() - t0.current);
      hap.done();
      setFinished(true);
    } else setI(i + 1);
  };

  if (finished) {
    const r = results.current;
    const perfect = r.filter((x) => x.mistakes === 0 && !x.hints && !x.skipped).length;
    const slips = r.reduce((a, x) => a + (x.mistakes || 0), 0);
    const mins = Math.max(1, Math.round((Date.now() - t0.current) / 60000));
    return (
      <div className="fullscreen">
        <div className="lesson-body" style={{ alignItems: "center", textAlign: "center", paddingTop: 40 }}>
          {perfect > 0 && <Burst />}
          <div className="big jp" lang="ja" style={{ fontSize: "4rem", color: "var(--primary)" }}>書けた</div>
          <h1>Writing practice done</h1>
          <div className="stat-row">
            <div className="stat"><b>{items.length}</b><span>{items.length === 1 ? "character" : "characters"}</span></div>
            <div className="stat"><b>{perfect}</b><span>perfect</span></div>
            <div className="stat"><b>{slips}</b><span>{slips === 1 ? "slip" : "slips"}</span></div>
          </div>
          <p className="dim">{mins} min. Writing a character from memory is one of the best ways to make it stick.</p>
          <div className="stack" style={{ width: "100%", marginTop: "auto" }}>
            <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }
  const it = items[i];
  const pct = Math.round((i / items.length) * 100);
  return (
    <div className="fullscreen">
      <div className="lesson-top">
        <button className="icon-btn" onClick={onClose} aria-label="Leave writing practice"><Icon name="close" /></button>
        <div className="study-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <span className="chip">{i + 1}/{items.length}</span>
      </div>
      <div className="lesson-body" key={it.ch + i}>
        <WritePad char={it.ch} title={it.title} sub={it.sub} initialMode="memory" nextLabel={i + 1 >= items.length ? "Finish" : "Next"} onNext={next} />
      </div>
    </div>
  );
}
