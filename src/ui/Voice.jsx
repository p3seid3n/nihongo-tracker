import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons.jsx";
import { Sheet, Seg, Banner, Ring } from "./common.jsx";
import { say, stop as stopAudio, hasJapaneseVoice } from "../lib/audio.js";
import { PitchWord } from "./Pitch.jsx";
import { judge, listen, record, recognitionSupported, recordingSupported, ERRORS } from "../lib/pronounce.js";
import * as hap from "../lib/haptics.js";

/** Speaker button. part = { file, text }. Shows a pulse while playing. */
export function SpeakBtn({ part, label = "Play audio", className = "", size = 24 }) {
  const [playing, setPlaying] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const play = useCallback(async (e) => {
    e?.stopPropagation();
    if (!part) return;
    setPlaying(true);
    try { await say(part); } finally { if (alive.current) setPlaying(false); }
  }, [part]);
  if (!part) return null;
  return (
    <button type="button" className={`icon-btn say-btn ${playing ? "playing" : ""} ${className}`} aria-label={label} data-haptic="none" onClick={(e) => { hap.tap(); play(e); }}>
      <Icon name="volume" size={size} />
    </button>
  );
}

/** Opens the pronunciation sheet. items: [{ key, label, text, reading, part }] */
export function MicBtn({ items, label = "Check my pronunciation", className = "", recordOnly = false }) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;
  return (
    <>
      <button type="button" className={`icon-btn say-btn ${className}`} aria-label={label} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <Icon name="mic" size={22} />
      </button>
      {open && createPortal(<div style={{ display: "contents" }} onClick={(e) => e.stopPropagation()}><PronounceSheet items={items} recordOnly={recordOnly} onClose={() => setOpen(false)} /></div>, document.body)}
    </>
  );
}

const LEVEL = {
  great: { title: "Spot on", sub: "The recogniser understood every part." },
  close: { title: "Close", sub: "A few sounds were off. Listen again and retry." },
  retry: { title: "Not quite", sub: "Listen to it once more, then try again." },
};

export function PronounceSheet({ items, onClose, recordOnly = false }) {
  const [idx, setIdx] = useState(0);
  const item = items[Math.min(idx, items.length - 1)];
  const [mode, setMode] = useState(recordOnly && recordingSupported ? "record" : recognitionSupported ? "recognise" : recordingSupported ? "record" : "none");
  const [phase, setPhase] = useState("idle"); // idle | listening | result | error | recording | recorded
  const [interim, setInterim] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [take, setTake] = useState(null); // { url } for record mode
  const ctl = useRef(null);
  const alive = useRef(true);
  const takeAudio = useRef(null);

  const cleanup = useCallback(() => {
    ctl.current?.abort?.(); ctl.current?.cancel?.(); ctl.current = null;
    if (takeAudio.current) { takeAudio.current.pause(); takeAudio.current = null; }
  }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cleanup(); stopAudio(); }; }, [cleanup]);
  useEffect(() => { cleanup(); setPhase("idle"); setResult(null); setInterim(""); setErr(""); setTake((t) => { if (t) URL.revokeObjectURL(t.url); return null; }); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const targets = useMemo(() => {
    const seen = new Set();
    return [item.text, item.reading, ...(item.alt || [])].filter((t) => t && !seen.has(t) && seen.add(t)).map((text) => ({ text }));
  }, [item]);

  const startRecognise = () => {
    stopAudio();
    hap.tap();
    setErr(""); setResult(null); setInterim(""); setPhase("listening");
    ctl.current = listen({
      onInterim: (t) => alive.current && setInterim(t),
      onResult: (alts) => {
        if (!alive.current) return;
        const r = judge(targets, alts, { units: item.units });
        setResult(r); setPhase("result");
        r.level === "great" ? hap.success() : r.level === "close" ? hap.medium() : hap.bad();
      },
      onError: (code) => {
        if (!alive.current) return;
        if ((code === "service-not-allowed" || code === "language-not-supported") && recordingSupported) { setMode("record"); setPhase("idle"); setErr(""); return; }
        setErr(ERRORS[code] || "Something went wrong with the microphone."); setPhase("error"); hap.bad();
      },
    });
  };
  const stopListening = () => { ctl.current?.stop?.(); };

  const startRecord = async () => {
    stopAudio();
    hap.tap();
    setErr(""); setTake(null);
    try {
      ctl.current = await record();
      if (!alive.current) { ctl.current.cancel(); return; }
      setPhase("recording");
    } catch (e) {
      setErr(e && e.name === "NotAllowedError" ? ERRORS["not-allowed"] : ERRORS["audio-capture"]); setPhase("error");
    }
  };
  const stopRecord = async () => {
    const c = ctl.current;
    ctl.current = null;
    if (!c) return;
    try { const t = await c.stop(); if (alive.current) { setTake(t); setPhase("recorded"); hap.medium(); } } catch { setPhase("idle"); }
  };
  const playTake = () => {
    if (!take) return;
    stopAudio();
    if (takeAudio.current) takeAudio.current.pause();
    const a = new Audio(take.url);
    takeAudio.current = a;
    a.play().catch(() => {});
  };
  const compare = async () => { await say(item.part); setTimeout(() => { if (alive.current) playTake(); }, 350); };

  const mic = (() => {
    if (mode === "recognise") {
      const on = phase === "listening";
      return { on, click: on ? stopListening : startRecognise };
    }
    const on = phase === "recording";
    return { on, click: on ? stopRecord : startRecord };
  })();

  return (
    <Sheet title="Say it" onClose={onClose}>
      {items.length > 1 && (
        <Seg label="What to say" value={item.key} onChange={(k) => setIdx(Math.max(0, items.findIndex((i) => i.key === k)))} options={items.map((i) => ({ value: i.key, label: i.label }))} />
      )}
      <div className="say-target">
        <div className="say-text" lang="ja">
          {result ? result.chars.map((c, i) => <span key={i} className={c.skip ? "" : c.ok ? "hit" : "miss"}>{c.c}</span>) : item.text}
        </div>
        {item.reading && item.reading !== item.text && !result && <div className="dim jp" lang="ja">{item.reading}</div>}
        {item.pitch && <div style={{ marginTop: 6 }}><PitchWord k={item.pitch.k} a={item.pitch.a} /></div>}
        {item.en && <div className="dim small">{item.en}</div>}
      </div>

      {mode === "none" && <Banner kind="err" icon="warn">This browser can't use the microphone. Try Chrome on Android or Safari on iPhone.</Banner>}
      {mode === "record" && phase !== "error" && <Banner icon="info">{recordOnly ? "Listen, say it, then compare the two by ear. Follow the melody: where does it step down?" : "This browser can't check pronunciation automatically, so record yourself and compare with the original by ear."}</Banner>}
      {phase === "error" && <Banner kind="err" icon="warn">{err}</Banner>}

      {phase === "result" && result && (
        <div className="say-result" role="status">
          <Ring size={72} stroke={7} value={result.score}><b>{Math.round(result.score * 100)}</b></Ring>
          <div className="grow">
            <b>{LEVEL[result.level].title}</b>
            <div className="dim small">{LEVEL[result.level].sub}</div>
            {result.heard && <div className="small" style={{ marginTop: 4 }}><span className="dim">Heard: </span><span lang="ja">{result.heard}</span></div>}
          </div>
        </div>
      )}
      {phase === "listening" && <div className="say-live" aria-live="polite">{interim || "Listening…"}</div>}
      {phase === "recording" && <div className="say-live" aria-live="polite">Recording… tap to stop</div>}

      {mode !== "none" && (
        <div className="say-controls">
          {item.part && <button type="button" className="btn btn-soft" onClick={() => { hap.tap(); say(item.part); }} data-haptic="none"><Icon name="volume" /> Listen</button>}
          <button type="button" className={`mic-btn ${mic.on ? "on" : ""}`} onClick={mic.click} aria-label={mic.on ? "Stop" : "Start speaking"} data-haptic="none"><Icon name={mic.on ? "stop" : "mic"} size={30} /></button>
          {mode === "record" && phase === "recorded" ? (
            <button type="button" className="btn btn-soft" onClick={compare}><Icon name="play" /> Compare</button>
          ) : <span className="say-spacer" />}
        </div>
      )}
      {phase === "result" && <button type="button" className="btn btn-primary btn-block" onClick={startRecognise}>Try again</button>}
      {mode === "record" && phase === "recorded" && (
        <div className="row-wrap" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={playTake}><Icon name="play" /> Play yours</button>
        </div>
      )}
    </Sheet>
  );
}

/** For Settings: is there a Japanese voice? */
export function useVoiceAvailable() {
  const [ok, setOk] = useState(null);
  useEffect(() => { let alive = true; hasJapaneseVoice().then((v) => alive && setOk(v)); return () => { alive = false; }; }, []);
  return ok;
}
