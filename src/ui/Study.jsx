import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Furi, Sentence } from "./Furi.jsx";
import { useApp, plural, Burst } from "./common.jsx";
import { buildSession, buildCounts, LEARN_AHEAD } from "../lib/queue.js";
import { previewDelays, LEARNING, RELEARNING, NEW } from "../lib/fsrs.js";
import { fmtSpan } from "../lib/time.js";
import { deckOf } from "../lib/ids.js";
import { kanjiOf } from "../lib/jp.js";
import { computeStats } from "../lib/stats.js";
import * as hap from "../lib/haptics.js";

/** Decide which card comes next. Due learning cards first, then the main list, then waiting learning cards. */
function pickNext(store, main, learnQ, now = Date.now()) {
  const ok = (id) => !!store.card(id);
  const learn = learnQ.filter((x) => ok(x.id)).sort((a, b) => a.due - b.due);
  const due = learn.find((x) => x.due <= now);
  if (due) return { id: due.id, src: "learn" };
  const m = main.find(ok);
  if (m) return { id: m, src: "main" };
  if (learn.length) return { id: learn[0].id, src: "learn" };
  return null;
}

export function Study({ opts = {}, onClose, onOpen }) {
  const { store } = useApp();
  const [initial] = useState(() => {
    const s = buildSession(store, Date.now(), opts);
    const learnQ = s.learning.map((id) => ({ id, due: store.rec(id)?.due || 0 }));
    return { main: s.main, learnQ, total: s.main.length + s.learning.length };
  });
  const [main, setMain] = useState(initial.main);
  const [learnQ, setLearnQ] = useState(initial.learnQ);
  const [finished, setFinished] = useState(0);
  const [cur, setCur] = useState(() => pickNext(store, initial.main, initial.learnQ));
  const [shown, setShown] = useState(false);
  const [history, setHistory] = useState([]);
  const [tally, setTally] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, ms: 0 });
  const startRef = useRef(Date.now());
  const wordIndex = useRef(null);

  const card = cur ? store.card(cur.id) : null;
  const deck = cur ? store.decks[deckOf(cur.id)] : null;
  const rec = cur ? store.rec(cur.id) : null;

  useEffect(() => { startRef.current = Date.now(); }, [cur?.id]);

  const delays = useMemo(() => {
    if (!cur || !shown) return null;
    try { return previewDelays(rec, Date.now(), store.fsrsCfg(), cur.id); } catch { return null; }
  }, [cur, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = useCallback(() => { if (cur && !shown) { setShown(true); hap.tap(); } }, [cur, shown]);

  const grade = useCallback((g) => {
    if (!cur || !shown) return;
    const ms = Date.now() - startRef.current;
    const entry = store.reviewCard(cur.id, g, ms);
    const snap = { entry, main, learnQ, finished, tally, cur };
    let nm = main;
    let nl = learnQ.filter((x) => x.id !== cur.id);
    if (cur.src === "main") nm = main.filter((x) => x !== cur.id);
    const nx = entry.next;
    let requeued = false;
    if ((nx.st === LEARNING || nx.st === RELEARNING) && nx.due <= Date.now() + LEARN_AHEAD) { nl = [...nl, { id: cur.id, due: nx.due }]; requeued = true; }
    setHistory((h) => [...h.slice(-19), snap]);
    setTally((t) => ({ ...t, [g]: t[g] + 1, ms: t.ms + Math.min(ms, 120000) }));
    if (!requeued) setFinished((f) => f + 1);
    setMain(nm);
    setLearnQ(nl);
    setCur(pickNext(store, nm, nl));
    setShown(false);
    if (g === 1) hap.bad(); else if (g === 2) hap.medium(); else if (g === 3) hap.good(); else hap.success();
  }, [cur, shown, main, learnQ, finished, tally, store]);

  const undo = useCallback(() => {
    const snap = history[history.length - 1];
    if (!snap) return;
    store.undoReview(snap.entry);
    setHistory((h) => h.slice(0, -1));
    setMain(snap.main); setLearnQ(snap.learnQ); setFinished(snap.finished); setTally(snap.tally);
    setCur(snap.cur); setShown(false);
    hap.tap();
  }, [history, store]);

  const suspend = useCallback(() => {
    if (!cur) return;
    store.toggleSuspend(cur.id);
    const nm = main.filter((x) => x !== cur.id);
    const nl = learnQ.filter((x) => x.id !== cur.id);
    setFinished((f) => f + 1);
    setMain(nm); setLearnQ(nl); setCur(pickNext(store, nm, nl)); setShown(false);
  }, [cur, main, learnQ, store]);

  useEffect(() => {
    const k = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!shown) reveal(); else grade(3); }
      else if (shown && ["1", "2", "3", "4"].includes(e.key)) grade(Number(e.key));
      else if (e.key === "z" || e.key === "Backspace") undo();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [shown, reveal, grade, undo, onClose]);

  // counters
  const counters = useMemo(() => {
    let nw = 0, rv = 0;
    const ids = main.filter((x) => x !== cur?.id);
    for (const id of ids) { const r = store.rec(id); if (!r || r.st === NEW) nw++; else rv++; }
    return { nw, rv, ln: learnQ.length };
  }, [main, learnQ, cur]); // eslint-disable-line react-hooks/exhaustive-deps

  const related = useMemo(() => {
    if (!card || deck?.kind !== "kanji") return [];
    if (!wordIndex.current) {
      const m = new Map();
      for (const d of store.deckList()) {
        if (d.kind !== "vocab") continue;
        const content = store.content[d.id] || {};
        for (const id of store.cardIds(d.id)) {
          const c = content[id];
          for (const ch of new Set(kanjiOf(c.f))) { if (!m.has(ch)) m.set(ch, []); const a = m.get(ch); if (a.length < 12) a.push(c); }
        }
      }
      wordIndex.current = m;
    }
    const list = wordIndex.current.get(card.f) || [];
    return list.filter((w) => w.f !== card.f).slice(0, 4);
  }, [card, deck]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cur) return <Summary store={store} tally={tally} total={finished} onClose={onClose} onOpen={onOpen} opts={opts} />;
  if (!card) return null;

  const pct = initial.total ? Math.min(100, Math.round((finished / initial.total) * 100)) : 0;
  const kind = deck?.kind;
  const curIsNew = cur.src === "main" && (!rec || rec.st === NEW);
  const curIsRev = cur.src === "main" && !curIsNew;

  return (
    <div className="fullscreen">
      <div className="study">
        <div className="study-top">
          <button className="icon-btn" onClick={onClose} aria-label="Close session"><Icon name="close" /></button>
          <div className="study-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
          <button className="icon-btn" onClick={undo} disabled={!history.length} aria-label="Undo last answer"><Icon name="undo" /></button>
          <button className="icon-btn" onClick={suspend} aria-label="Suspend this card"><Icon name="pause" /></button>
        </div>
        <div className="counts" aria-label="Cards left">
          <span className={`c-new ${curIsNew ? "cur" : ""}`}>{counters.nw + (curIsNew ? 1 : 0)} new</span>
          <span className={`c-learn ${cur.src === "learn" ? "cur" : ""}`}>{counters.ln} learning</span>
          <span className={`c-rev ${curIsRev ? "cur" : ""}`}>{counters.rv + (curIsRev ? 1 : 0)} review</span>
        </div>

        <div className="study-body">
          <div className="flash card-in" key={`${cur.id}-${tally[1] + tally[2] + tally[3] + tally[4]}`} onClick={!shown ? reveal : undefined}>
            <span className="chip tag">{deck?.name || ""}</span>
            <Front kind={kind} card={card} />
            {shown && <Back kind={kind} card={card} related={related} />}
            {!shown && <span className="reveal-hint">Tap to show the answer</span>}
          </div>
          {!shown ? (
            <button className="btn btn-primary show-btn btn-block" data-haptic="none" onClick={reveal}>Show answer</button>
          ) : (
            <div className="grades">
              {[["Again", 1], ["Hard", 2], ["Good", 3], ["Easy", 4]].map(([label, g]) => (
                <button key={g} className={`grade g${g}`} data-haptic="none" onClick={() => grade(g)}>
                  <span>{label}</span>
                  <small>{delays ? fmtSpan(delays[g]) : ""}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Front({ kind, card }) {
  if (kind === "kanji") return <div className="kanji-big" lang="ja">{card.f}</div>;
  if (kind === "kana") return <div className="kana-big" lang="ja">{card.f}</div>;
  if (kind === "vocab") return <div className="word-big" lang="ja">{card.f}</div>;
  return <div className="word-big" lang="ja">{card.f}</div>;
}

function Back({ kind, card, related }) {
  const x = card.x || {};
  if (kind === "vocab") {
    return (
      <div className="answer">
        {card.r && <div className="reading" lang="ja">{card.r}</div>}
        <div className="main">{card.m}</div>
        {(x.sentF || x.sent) && (
          <div className="box">
            <span className="label">Example</span>
            <div><Sentence jp={x.sentF || x.sent} punct={false} /></div>
            {x.sentE && <div className="dim small" style={{ marginTop: 4 }}>{x.sentE}</div>}
          </div>
        )}
        {x.notes && <div className="extra">{x.notes}</div>}
      </div>
    );
  }
  if (kind === "kanji") {
    return (
      <div className="answer">
        <div className="main">{card.m}</div>
        {x.story && <div className="extra">{x.story}</div>}
        {related.length > 0 && (
          <div className="box">
            <span className="label">In words you study</span>
            <div className="related">{related.map((w, i) => (
              <div key={i}><b lang="ja">{w.f}</b>{w.r ? <span lang="ja" className="dim"> {w.r}</span> : null}{w.m ? <span className="dim"> · {String(w.m).length > 30 ? String(w.m).slice(0, 29) + "…" : w.m}</span> : null}</div>
            ))}</div>
          </div>
        )}
        {(x.strokes || x.num) && <div className="faint small">{x.strokes ? `${x.strokes} stroke${x.strokes === "1" || x.strokes === 1 ? "" : "s"}` : ""}{x.strokes && x.num ? " · " : ""}{x.num ? `#${x.num}` : ""}</div>}
      </div>
    );
  }
  return (
    <div className="answer">
      <div className="main">{card.m}</div>
      {x.story && <div className="extra">{x.story}</div>}
    </div>
  );
}

function Summary({ store, tally, total, onClose, onOpen, opts }) {
  const n = tally[1] + tally[2] + tally[3] + tally[4];
  const accuracy = n ? Math.round(((n - tally[1]) / n) * 100) : 0;
  const stats = useMemo(() => computeStats(store), []); // eslint-disable-line react-hooks/exhaustive-deps
  const tomorrow = stats.forecast[1]?.n || 0;
  const counts = useMemo(() => buildCounts(store, Date.now(), { deckId: opts.deckId }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (n > 0) hap.done(); }, [n]);
  const mins = Math.max(1, Math.round(tally.ms / 60000));
  return (
    <div className="fullscreen">
      <div className="study">
        <div className="study-body summary">
          {n === 0 ? (
            <>
              <div className="big jp" lang="ja" style={{ fontSize: "4rem", color: "var(--primary)" }}>空</div>
              <h1>Nothing to study right now</h1>
              <p className="dim">You're all caught up. {tomorrow ? `Tomorrow ${plural(tomorrow, "review")} are due.` : "Come back later."}</p>
            </>
          ) : (
            <>
              <Burst />
              <div className="big jp" lang="ja" style={{ fontSize: "4rem", color: "var(--primary)" }}>完了</div>
              <h1>Session complete</h1>
              <div className="stat-row">
                <div className="stat"><b>{n}</b><span>answers</span></div>
                <div className="stat"><b>{accuracy}%</b><span>recalled</span></div>
                <div className="stat"><b>{mins}</b><span>min</span></div>
              </div>
              <p className="dim">{tomorrow ? `${plural(tomorrow, "review")} due tomorrow.` : "Nothing due tomorrow."}</p>
            </>
          )}
          <div className="stack" style={{ width: "100%", marginTop: "auto" }}>
            {counts.newAvailable > 0 && (
              <button className="btn btn-tonal btn-block" onClick={() => onOpen({ type: "study", opts: { ...opts, extraNew: (opts.extraNew || 0) + 5 } })}>Learn 5 more new cards</button>
            )}
            <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
