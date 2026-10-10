import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Switch, useApp, plural } from "./common.jsx";
import { TokLine } from "./WordTap.jsx";
import { SpeakBtn } from "./Voice.jsx";
import { buildLexicon } from "../lib/lexicon.js";
import { analyzePassage, coverageBand, BAND_LABEL, BANDS, recommend, orderPassages } from "../lib/reader.js";
import { PASSAGES, READER_LEVELS, READER_WORDS } from "../content/reader.js";
import { say, stop as stopAudio, markupPart } from "../lib/audio.js";
import * as hap from "../lib/haptics.js";

const pct = (c) => `${Math.floor(c * 100 + 1e-9)}%`;

/** Read how much of a text you know, as a bar with a marked sweet spot (95-98%). */
export function Coverage({ r }) {
  const band = coverageBand(r.coverage);
  return (
    <div className={`cov cov-${band}`}>
      <div className="cov-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.coverage * 100)} aria-label="Words you know">
        <i style={{ width: `${r.coverage * 100}%` }} />
        <span className="cov-goal" style={{ left: `${BANDS.sweet * 100}%`, width: `${(BANDS.easy - BANDS.sweet) * 100}%` }} />
      </div>
      <div className="cov-txt"><b>{pct(r.coverage)}</b> known · {BAND_LABEL[band]}</div>
    </div>
  );
}

export function Reader({ onClose, startId = null }) {
  const { store, toast } = useApp();
  const lex = useMemo(() => buildLexicon(store, Date.now(), { extra: READER_WORDS }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => PASSAGES.map((p) => analyzePassage(p, lex)), [lex]);
  const [sel, setSel] = useState(startId);
  const isRead = (id) => !!store.lessons[`read.${id}`]?.done;
  const cur = sel ? results.find((r) => r.id === sel) : null;

  if (cur) return <Passage r={cur} onBack={() => setSel(null)} onDone={() => { setSel(null); }} toast={toast} />;

  const rec = recommend(results, isRead);
  const list = orderPassages(results, isRead);
  return (
    <div className="fullscreen">
      <div className="study-top">
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <h1 className="grow" style={{ fontSize: "1.25rem" }}>Reading</h1>
      </div>
      <div className="reader-body">
        <p className="dim">Short texts written for this app. Each shows how much of it you already know. Research says about 95–98% known words makes reading comfortable; these texts are short and every new word is glossed, so 90–97% is a good fit here (the shaded part of the bar). Tap any word for its meaning.</p>
        <div className="rd-list">
          {list.map((r) => {
            const band = coverageBand(r.coverage);
            const read = isRead(r.id);
            return (
              <button key={r.id} className={`rd-card ${rec && rec.id === r.id ? "rec" : ""}`} onClick={() => { hap.tap(); setSel(r.id); }}>
                <span className="grow">
                  <span className="rd-title" lang="ja">{r.passage.jp}</span>
                  <span className="rd-sub">{r.passage.en} · {READER_LEVELS[r.passage.level]}</span>
                </span>
                <span className="rd-side">
                  <b>{pct(r.coverage)}</b>
                  <small>{read ? "Read ✓" : rec && rec.id === r.id ? "Next up" : BAND_LABEL[band]}</small>
                </span>
                  <span className={`cov cov-${band} mini`}><span className="cov-bar"><i style={{ width: `${r.coverage * 100}%` }} /><span className="cov-goal" style={{ left: `${BANDS.sweet * 100}%`, width: `${(BANDS.easy - BANDS.sweet) * 100}%` }} /></span></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Passage({ r, onBack, onDone, toast }) {
  const { store } = useApp();
  const s = store.settings;
  const gloss = s.readerGloss !== false;
  const trans = !!s.readerTrans;
  const [openEn, setOpenEn] = useState(() => new Set());
  const [playing, setPlaying] = useState(-1);
  const start = useRef(Date.now());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopAudio(); }; }, []);

  const listen = async () => {
    if (playing >= 0) { stopAudio(); setPlaying(-1); return; }
    for (let i = 0; i < r.lines.length; i++) {
      if (!alive.current) return;
      setPlaying(i);
      const part = markupPart(r.lines[i].jp);
      if (part) await say(part);
      if (!alive.current) return;
    }
    if (alive.current) setPlaying(-1);
  };
  const toggleEn = (i) => setOpenEn((o) => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const finish = () => {
    store.markPractice("read", r.id, { ms: Date.now() - start.current });
    hap.done();
    toast("Marked as read");
    onDone();
  };
  const words = r.fresh.filter((f) => f.kind !== "form");
  return (
    <div className="fullscreen">
      <div className="study-top">
        <button className="icon-btn" onClick={() => { stopAudio(); onBack(); }} aria-label="Back to the list"><Icon name="back" /></button>
        <div className="grow" />
        <span className="chip">{READER_LEVELS[r.passage.level]}</span>
      </div>
      <div className="reader-body">
        <div>
          <h1 lang="ja" className="rd-h">{r.passage.jp}</h1>
          <div className="dim">{r.passage.en}</div>
        </div>
        <Coverage r={r} />
        <div className="rd-toggles">
          <label><Switch checked={gloss} onChange={(v) => store.updateSettings({ readerGloss: v })} label="Show short translations above new words" /> New words glossed</label>
          <label><Switch checked={trans} onChange={(v) => store.updateSettings({ readerTrans: v })} label="Show English under each line" /> English under lines</label>
        </div>
        <div className="rd-lines">
          {r.lines.map((l, i) => (
            <div key={i} className={`rd-line ${playing === i ? "on" : ""}`}>
              <div className="rd-jp"><TokLine toks={l.toks} glosses={gloss} /></div>
              <div className="rd-tools">
                <SpeakBtn part={markupPart(l.jp)} label="Play this line" className="small-btn" size={20} />
                <button type="button" className="small-btn icon-btn" aria-label={openEn.has(i) ? "Hide the English" : "Show the English"} aria-pressed={openEn.has(i)} onClick={() => toggleEn(i)}><Icon name="eye" size={20} /></button>
              </div>
              {(trans || openEn.has(i)) && <div className="rd-en">{l.en}</div>}
            </div>
          ))}
        </div>
        {words.length > 0 && (
          <section className="rd-new">
            <span className="label">New in this text ({words.length})</span>
            <ul>
              {words.map((f, i) => (
                <li key={i}><b lang="ja">{f.text}</b>{f.reading && f.reading !== f.text ? <span lang="ja" className="dim"> {f.reading}</span> : null}{f.meaning ? <span className="dim"> · {f.kind === "word" ? f.gloss || f.meaning : f.meaning}{f.lesson ? ` (${f.lesson})` : ""}</span> : null}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="lesson-foot foot-row">
        <button className="btn btn-soft" onClick={listen}><Icon name={playing >= 0 ? "stop" : "volume"} /> {playing >= 0 ? "Stop" : "Listen"}</button>
        <button className="btn btn-primary grow" onClick={finish}>{store.lessons[`read.${r.id}`]?.done ? "Read it again" : "I read it"}</button>
      </div>
    </div>
  );
}

export { plural };
