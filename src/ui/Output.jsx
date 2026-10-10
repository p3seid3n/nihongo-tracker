import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Switch, useApp, plural } from "./common.jsx";
import { Sentence } from "./Furi.jsx";
import { SpeakBtn } from "./Voice.jsx";
import { buildLexicon } from "../lib/lexicon.js";
import { checkOutput, wordsToTry } from "../lib/outputCheck.js";
import { toKana } from "../lib/romaji.js";
import { PROMPTS } from "../content/prompts.js";
import { READER_WORDS } from "../content/reader.js";
import { markupPart } from "../lib/audio.js";
import * as hap from "../lib/haptics.js";

const LEVEL = { 1: "Starter", 2: "Easy", 3: "Medium" };

export function Output({ onClose }) {
  const { store, toast } = useApp();
  const lex = useMemo(() => buildLexicon(store, Date.now(), { extra: READER_WORDS }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState(null);
  const done = (id) => !!store.lessons[`out.${id}`]?.done;
  const cur = sel ? PROMPTS.find((p) => p.id === sel) : null;
  if (cur) return <Prompt p={cur} lex={lex} onBack={() => setSel(null)} toast={toast} />;
  const list = PROMPTS.slice().sort((a, b) => done(a.id) - done(b.id) || a.level - b.level);
  return (
    <div className="fullscreen">
      <div className="study-top">
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <h1 className="grow" style={{ fontSize: "1.25rem" }}>Writing prompts</h1>
      </div>
      <div className="reader-body">
        <p className="dim">Write a few sentences in Japanese. Producing the language yourself is what makes words stick. The app checks which words and grammar you used and whether you have met them, then shows one way to say it.</p>
        <div className="rd-list">
          {list.map((p) => (
            <button key={p.id} className="rd-card" onClick={() => { hap.tap(); setSel(p.id); }}>
              <span className="grow">
                <span className="rd-sub" style={{ color: "var(--text)" }}>{p.en}</span>
                <span className="rd-sub">{LEVEL[p.level]}</span>
              </span>
              <span className="rd-side">{done(p.id) ? <small>Done ✓</small> : <Icon name="chevron" size={20} />}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Prompt({ p, lex, onBack, toast }) {
  const { store } = useApp();
  const romaji = store.settings.outputRomaji !== false;
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [model, setModel] = useState(false);
  const start = useRef(Date.now());
  const ref = useRef(null);
  const wanted = useMemo(() => wordsToTry(lex, store), [lex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => ref.current && ref.current.focus({ preventScroll: true }), 80); return () => clearTimeout(t); }, []);

  const check = () => {
    const out = checkOutput(romaji ? toKana(text, { final: true, punct: true }) : text, lex, wanted);
    if (romaji) setText(toKana(text, { final: true, punct: true }));
    setRes(out);
    hap.tap();
  };
  const finish = () => {
    store.markPractice("out", p.id, { ms: Date.now() - start.current });
    hap.done();
    toast("Saved to your practice");
    onBack();
  };
  return (
    <div className="fullscreen">
      <div className="study-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back to the prompts"><Icon name="back" /></button>
        <div className="grow" />
        <span className="chip">{LEVEL[p.level]}</span>
      </div>
      <div className="reader-body">
        <h1 style={{ fontSize: "1.35rem", lineHeight: 1.3 }}>{p.en}</h1>
        {p.tip && <div className="faint small">Useful: <span lang="ja">{p.tip}</span></div>}
        {wanted.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="label">Words you could try to use</span>
            <div className="row-wrap">
              {wanted.map((w) => (
                <span key={w.cardId} className={`chip ${res && res.wantedUsed.some((x) => x.cardId === w.cardId) ? "chip-primary" : ""}`}>
                  <span lang="ja">{w.f}</span><span className="dim"> · {w.m}</span>
                  {res && res.wantedUsed.some((x) => x.cardId === w.cardId) ? " ✓" : ""}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="ow">Your Japanese</label>
          <textarea id="ow" ref={ref} className="input" rows={5} lang="ja" value={text} onChange={(e) => { setText(romaji ? toKana(e.target.value, { punct: true }) : e.target.value); if (res) setRes(null); }}
            placeholder={romaji ? "Type in romaji or kana. Use ha for は and wo for を." : "Type in Japanese"} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </div>
        <label className="rd-toggles" style={{ marginTop: -4 }}><Switch checked={romaji} onChange={(v) => store.updateSettings({ outputRomaji: v })} label="Turn romaji into kana as I type" /> Turn romaji into kana as I type</label>

        {res && (
          <section className="out-res" aria-label="Check">
            <div className="stat-row">
              <div className="stat"><b>{res.total}</b><span>words</span></div>
              <div className="stat"><b>{Math.round(res.share * 100)}%</b><span>you know</span></div>
              <div className="stat"><b>{res.sentences}</b><span>{res.sentences === 1 ? "sentence" : "sentences"}</span></div>
            </div>
            {res.notFound.length > 0 && (
              <div className="out-box warn"><span className="label">Not found in your decks or lessons</span>
                <div className="row-wrap">{res.notFound.map((t, i) => <span key={i} className="chip" lang="ja">{t}</span>)}</div>
                <div className="small dim">Check the spelling, or it is a word you have not met. Anything typed in letters or with a slip shows up here.</div>
              </div>
            )}
            {res.notYet.length > 0 && (
              <div className="out-box"><span className="label">Words and forms you have not learned yet</span>
                {res.notYet.map((w, i) => <div key={i}><b lang="ja">{w.text}</b> <span className="dim">{w.form || w.meaning}</span></div>)}
              </div>
            )}
            {res.grammarNew.length > 0 && (
              <div className="out-box"><span className="label">Grammar from lessons you have not done</span>
                {res.grammarNew.map((g, i) => <div key={i}><b lang="ja">{g.text}</b> <span className="dim">{g.meaning}{g.lesson ? ` · ${g.lesson}` : ""}</span></div>)}
              </div>
            )}
            {!res.notFound.length && !res.notYet.length && !res.grammarNew.length && <div className="out-box ok">Everything you wrote is something you have learned.</div>}
            {wanted.length > 0 && <div className="small dim">{res.wantedUsed.length} of {wanted.length} suggested words used.</div>}
            <div className="small faint">This checks what you used, not whether it is correct Japanese. Compare with the model answer below.</div>
            <button className="btn btn-tonal btn-block" onClick={() => setModel((m) => !m)}>{model ? "Hide" : "Show"} one way to say it</button>
            {model && (
              <div className="out-box">
                {p.model.map(([jp, en], i) => (
                  <div key={i} className="leech-sent">
                    <div className="spread"><Sentence jp={jp} punct={false} /><SpeakBtn part={markupPart(jp)} label="Play" className="small-btn" size={20} /></div>
                    <div className="dim small">{en}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      <div className="lesson-foot foot-row">
        {!res
          ? <button className="btn btn-primary btn-block" disabled={!text.trim()} onClick={check}>Check</button>
          : <><button className="btn btn-soft" onClick={() => setRes(null)}>Edit</button><button className="btn btn-primary grow" onClick={finish}>Done</button></>}
      </div>
    </div>
  );
}

export { plural };
