// Pitch accent practice: hear a word and say which one it was (minimal pairs) or which pattern it has, then shadow.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { useApp, plural } from "./common.jsx";
import { SpeakBtn, MicBtn } from "./Voice.jsx";
import { PitchWord } from "./Pitch.jsx";
import { say, stop as stopAudio, hasClip } from "../lib/audio.js";
import { pitchWords, buildPitchSession } from "../lib/pitchDrill.js";
import { pitchType, morae } from "../lib/pitch.js";
import { recordingSupported } from "../lib/pronounce.js";
import * as hap from "../lib/haptics.js";

const NATIVE = (w) => ({ file: w.part.file, text: "" }); // a recording or nothing: the synthetic voice does not get the accent right

function Empty({ onClose, kind }) {
  return (
    <div className="fullscreen">
      <div className="study-top">
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <h1 className="grow" style={{ fontSize: "1.25rem" }}>Pitch practice</h1>
      </div>
      <div className="reader-body">
        {kind === "nopitch" && <p>Your vocabulary decks have no pitch accent data yet. Kaishi includes it: import the .apkg again (your progress is kept) and the pitch is read in.</p>}
        {kind === "noaudio" && <p>Pitch practice plays the original recordings, because a phone's synthetic voice does not reliably put the accent in the right place. Import your deck again with "Include audio" ticked (your progress is kept), then come back.</p>}
        {kind === "few" && <p>Not enough words with both a pitch pattern and a recording on this device yet. Keep learning words, then come back.</p>}
        <button className="btn btn-primary btn-block" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

export default function PitchPractice({ onClose }) {
  const { store } = useApp();
  const [phase, setPhase] = useState("loading"); // loading | empty | intro | quiz | summary | shadow
  const [empty, setEmpty] = useState("");
  const [session, setSession] = useState(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]);
  const [shadow, setShadow] = useState({ list: [], at: 0 });
  const started = useRef(0);
  const alive = useRef(true);
  const wordsRef = useRef([]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopAudio(); }; }, []);

  const build = useCallback(async () => {
    const words = pitchWords(store);
    wordsRef.current = words;
    if (!words.length) { setEmpty("nopitch"); setPhase("empty"); return; }
    if (!words.some((w) => w.hasFile)) { setEmpty("noaudio"); setPhase("empty"); return; }
    const s = await buildPitchSession(words, { count: 10, has: hasClip });
    if (!alive.current) return;
    if (s.questions.length < 4) { setEmpty("few"); setPhase("empty"); return; }
    setSession(s); setI(0); setPicked(null); setResults([]); setPhase("intro");
  }, [store]);
  useEffect(() => { build(); }, [build]);

  const q = session && session.questions[i];
  // play the question's recording as soon as it appears
  useEffect(() => {
    if (phase !== "quiz" || !q) return;
    const w = q.kind === "pair" ? q.heard : q.word;
    const t = setTimeout(() => { if (alive.current) say(NATIVE(w)); }, 250);
    return () => clearTimeout(t);
  }, [phase, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => { hap.tap(); started.current = Date.now(); setPhase("quiz"); };
  const answer = (value) => {
    if (picked != null || !q) return;
    const right = value === q.answer;
    setPicked(value);
    setResults((r) => [...r, { q, right }]);
    right ? hap.good() : hap.bad();
  };
  const next = () => {
    hap.tap();
    stopAudio();
    if (i + 1 >= session.questions.length) { finish(); return; }
    setI(i + 1); setPicked(null);
  };
  const finish = () => {
    store.markPractice("pitch", "session", { ms: Date.now() - started.current });
    setPhase("summary");
  };
  const startShadow = () => {
    const missed = results.filter((r) => !r.right).map((r) => (r.q.kind === "pair" ? r.q.heard : r.q.word));
    const seen = new Set();
    let list = missed.filter((w) => !seen.has(w.cardId) && seen.add(w.cardId));
    if (list.length < 6) {
      const extra = wordsRef.current.filter((w) => w.hasFile && !seen.has(w.cardId));
      extra.sort(() => Math.random() - 0.5);
      list = [...list, ...extra].slice(0, 6);
    }
    setShadow({ list, at: 0 }); setPhase("shadow");
  };

  if (phase === "loading") return <div className="fullscreen"><div className="pad-loading dim" role="status">Loading…</div></div>;
  if (phase === "empty") return <Empty onClose={onClose} kind={empty} />;

  const top = (title, right) => (
    <div className="study-top">
      <button className="icon-btn" onClick={() => { stopAudio(); onClose(); }} aria-label="Close"><Icon name="close" /></button>
      <h1 className="grow" style={{ fontSize: "1.25rem" }}>{title}</h1>
      {right}
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="fullscreen">
        {top("Pitch practice")}
        <div className="reader-body">
          <p>Japanese words have a melody: the pitch goes up after the first sound and steps down at one place, or never. Two words with the same sounds can differ only in that melody (橋 and 箸, 雨 and 飴).</p>
          <p className="dim">You will hear a recording from your deck and answer {session.questions.length} questions, then shadow a few words: say them right after the recording and compare by ear. {session.pairCount > 0 ? `${plural(session.pairCount, "pair")} of look-alike words from your decks are in the mix.` : ""}</p>
          <div className="row" style={{ gap: 18 }}>
            <span style={{ fontSize: "1.4rem" }}><PitchWord k="ハシ" a={1} /></span><span className="dim" lang="ja">箸 chopsticks</span>
          </div>
          <div className="row" style={{ gap: 18 }}>
            <span style={{ fontSize: "1.4rem" }}><PitchWord k="ハシ" a={2} /></span><span className="dim" lang="ja">橋 bridge</span>
          </div>
        </div>
        <div className="lesson-foot"><button className="btn btn-primary btn-block" onClick={start}>Start</button></div>
      </div>
    );
  }

  if (phase === "quiz" && q) {
    const w = q.kind === "pair" ? q.heard : q.word;
    const answered = picked != null;
    const right = answered && picked === q.answer;
    return (
      <div className="fullscreen">
        {top("Pitch practice", <span className="chip">{i + 1} / {session.questions.length}</span>)}
        <div className="reader-body">
          <div className="q-prompt" style={{ alignItems: "center", textAlign: "center" }}>
            <div className="q-instr">{q.kind === "pair" ? "Which word did you hear?" : "Which melody did you hear?"}</div>
            <SpeakBtn part={NATIVE(w)} label="Play again" className="big-say" size={36} />
            {q.kind === "shape" && answered && <div className="word" lang="ja">{w.f}</div>}
            {q.kind === "shape" && answered && <div className="dim small">{w.r} · {w.m}</div>}
          </div>
          <div className="opts" role="group" aria-label="Answers">
            {q.kind === "pair" && q.options.map((o) => {
              const cls = answered ? (o.cardId === q.answer ? "right" : picked === o.cardId ? "wrong" : "dimmed") : "";
              return (
                <button key={o.cardId} className={`opt ${cls}`} disabled={answered} onClick={() => answer(o.cardId)} data-haptic="none">
                  <span className="grow"><span className="jp-line" lang="ja">{o.f}</span><span className="dim small"> · {o.m}</span>
                    {answered && <span style={{ display: "block" }}><PitchWord k={o.k} a={o.a} /> <small className="faint">{pitchType(o.k, o.a)}</small></span>}
                  </span>
                </button>
              );
            })}
            {q.kind === "shape" && q.options.map((a) => {
              const cls = answered ? (a === q.answer ? "right" : picked === a ? "wrong" : "dimmed") : "";
              return (
                <button key={a} className={`opt ${cls}`} disabled={answered} onClick={() => answer(a)} data-haptic="none" aria-label={`${pitchType(w.k, a)}, accent ${a}`}>
                  <span className="grow"><PitchWord k={w.k} a={a} /></span>
                  {answered && <small className="faint">{pitchType(w.k, a)}</small>}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className={`feedback-inline ${right ? "ok" : "no"}`} role="status">
              <b>{right ? "Right" : "Not quite"}</b>
              <span className="small"> {q.kind === "pair" ? `${w.f} (${w.r}) is ${pitchType(w.k, w.a)}.` : `${w.f} is ${pitchType(w.k, w.a)}: ${w.a === 0 ? "it never steps down" : `it steps down after sound ${w.a} of ${morae(w.k).length}`}.`}</span>
            </div>
          )}
        </div>
        <div className="lesson-foot foot-row">
          <button className="btn btn-soft" onClick={() => { hap.tap(); say(NATIVE(w)); }} data-haptic="none"><Icon name="volume" /> Again</button>
          <button className="btn btn-primary btn-block" disabled={!answered} onClick={next}>{i + 1 >= session.questions.length ? "Finish" : "Continue"}</button>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    const n = results.length, ok = results.filter((r) => r.right).length;
    const missed = results.filter((r) => !r.right);
    return (
      <div className="fullscreen">
        {top("Pitch practice")}
        <div className="reader-body">
          <div className="stat-row">
            <div className="stat"><b>{ok} / {n}</b><span>right</span></div>
          </div>
          {missed.length > 0 && (
            <section className="rd-new">
              <span className="label">To listen to again</span>
              {missed.map((r, k) => {
                const w = r.q.kind === "pair" ? r.q.heard : r.q.word;
                return (
                  <div key={k} className="spread">
                    <span><b lang="ja">{w.f}</b> <PitchWord k={w.k} a={w.a} /> <small className="faint">{pitchType(w.k, w.a)}</small></span>
                    <SpeakBtn part={NATIVE(w)} label={`Play ${w.f}`} className="small-btn" size={20} />
                  </div>
                );
              })}
            </section>
          )}
          {ok === n && <p className="dim">All right. Shadowing is the next step: say each word right after the recording.</p>}
        </div>
        <div className="lesson-foot foot-row">
          <button className="btn btn-soft" onClick={() => { hap.tap(); build(); }}>Again</button>
          <button className="btn btn-primary btn-block" onClick={startShadow}>Shadow words</button>
        </div>
      </div>
    );
  }

  if (phase === "shadow") {
    const w = shadow.list[shadow.at];
    if (!w) { setPhase("summary"); return null; }
    const items = [{ key: "w", label: w.f, text: w.f, reading: w.r, en: w.m, part: NATIVE(w), pitch: { k: w.k, a: w.a }, units: undefined }];
    const last = shadow.at + 1 >= shadow.list.length;
    return (
      <div className="fullscreen">
        {top("Shadowing", <span className="chip">{shadow.at + 1} / {shadow.list.length}</span>)}
        <div className="reader-body" style={{ alignItems: "center", textAlign: "center" }}>
          <div className="word" lang="ja" style={{ fontFamily: "var(--font-jp)", fontSize: "2.6rem" }}>{w.f}</div>
          <div className="dim">{w.r} · {w.m}</div>
          <div style={{ fontSize: "1.6rem" }}><PitchWord k={w.k} a={w.a} /></div>
          <div className="faint small">{pitchType(w.k, w.a)}</div>
          <div className="row" style={{ gap: 16, justifyContent: "center" }}>
            <SpeakBtn part={NATIVE(w)} label="Listen" className="big-say" size={36} />
            {recordingSupported ? <MicBtn items={items} recordOnly label="Record yourself and compare" className="big-say" /> : null}
          </div>
          <p className="dim small">{recordingSupported ? "Listen, then record yourself saying it and compare the two. The melody matters more than the speed." : "Listen and say it out loud, copying the melody. This browser cannot record you, so compare by ear."}</p>
        </div>
        <div className="lesson-foot foot-row">
          <button className="btn btn-soft" disabled={shadow.at === 0} onClick={() => { stopAudio(); setShadow({ ...shadow, at: shadow.at - 1 }); }}>Back</button>
          <button className="btn btn-primary btn-block" onClick={() => { hap.tap(); stopAudio(); if (last) onClose(); else setShadow({ ...shadow, at: shadow.at + 1 }); }}>{last ? "Done" : "Next"}</button>
        </div>
      </div>
    );
  }
  return null;
}
