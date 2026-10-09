import React, { useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Banner, Stepper, Switch, useApp, plural, fmtNum } from "./common.jsx";
import { parseApkg, applyImport } from "../lib/importer/apkg.js";
import { loadSQL } from "../lib/importer/sqljs.js";
import { planAudio, extractAudio } from "../lib/importer/media.js";
import { putClip, addAudioInfo } from "../lib/audio.js";

const PHASES = { unzip: "Unpacking the file", open: "Starting the database engine", read: "Reading your cards", done: "Done" };
const KINDS = [{ v: "kanji", l: "Kanji" }, { v: "vocab", l: "Vocabulary" }, { v: "kana", l: "Kana" }];

export function ImportWizard({ onClose, onOpen }) {
  const { store, toast } = useApp();
  const [stage, setStage] = useState("pick"); // pick | parsing | choose | importing | done
  const [progress, setProgress] = useState({ phase: "unzip", value: 0 });
  const [parsed, setParsed] = useState(null);
  const [sel, setSel] = useState({});
  const [history, setHistory] = useState(true);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [added, setAdded] = useState(0);
  const [pausedDecks, setPausedDecks] = useState([]);
  const input = useRef(null);
  const fileRef = useRef(null);
  const [withAudio, setWithAudio] = useState(true);
  const [audioProg, setAudioProg] = useState({ value: 0, stored: 0 });
  const [audioDone, setAudioDone] = useState(null);

  const run = async (file) => {
    if (!file) return;
    fileRef.current = file;
    setName(file.name); setErr(""); setStage("parsing"); setProgress({ phase: "unzip", value: 0 });
    try {
      const p = await parseApkg(file, loadSQL, setProgress);
      if (!p.decks.length) throw new Error("No cards were found in this file. Export from Anki with “Anki Deck Package (*.apkg)”.");
      const s = {};
      for (const d of p.decks) s[d.id] = { include: true, known: 0, kind: d.kind };
      setParsed(p); setSel(s); setStage("choose");
    } catch (e) {
      console.error(e);
      setErr(e && e.message ? e.message : "Could not read this file.");
      setStage("pick");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const doImport = () => {
    setStage("importing");
    setTimeout(() => {
      try {
        const decks = parsed.decks.map((d) => ({ ...d, kind: sel[d.id]?.kind || d.kind }));
        const n = applyImport(store, { ...parsed, decks }, sel, { includeHistory: history });
        // an imported Hiragana/Katakana deck replaces the built-in one in the daily plan
        const paused = [];
        for (const d of decks) {
          if (!sel[d.id]?.include || d.kind !== "kana") continue;
          const builtin = /hiragana/i.test(d.name) ? "kana-hira" : /katakana/i.test(d.name) ? "kana-kata" : null;
          if (builtin && store.decks[builtin] && !store.decks[builtin].del && store.decks[builtin].enabled !== false) {
            store.updateDeck(builtin, { enabled: false });
            paused.push(store.decks[builtin].name);
          }
        }
        setPausedDecks(paused);
        setAdded(n);
        const wanted = plan && withAudio && plan.files.length ? plan : null;
        if (!wanted || !fileRef.current) { setStage("done"); return; }
        setStage("audio");
        setAudioProg({ value: 0, stored: 0 });
        extractAudio(fileRef.current, wanted.files, putClip, (value, stored) => setAudioProg({ value, stored }))
          .then(async (r) => { await addAudioInfo(r.stored, wanted.files.reduce((a, f) => a + f.size, 0)); setAudioDone(r); setStage("done"); })
          .catch((e) => { console.error(e); setAudioDone({ stored: 0, failed: wanted.files.length, error: true }); setStage("done"); });
      } catch (e) {
        console.error(e);
        setErr("Import failed: " + (e && e.message ? e.message : e));
        setStage("choose");
      }
    }, 40);
  };

  const chosen = parsed ? parsed.decks.filter((d) => sel[d.id]?.include) : [];
  const plan = useMemo(() => (parsed ? planAudio(chosen, parsed.mediaList || []) : null), [parsed, sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasRevlog = parsed && parsed.revlog.length > 0;

  return (
    <div className="fullscreen">
      <div className="lesson-top">
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <h2 className="grow">Import from Anki</h2>
      </div>
      <div className="lesson-body">
        {stage === "pick" && (
          <>
            <p className="dim">Choose an Anki export (.apkg). It is read on this device and never uploaded anywhere except your own account sync.</p>
            {err && <Banner kind="err" icon="warn">{err}</Banner>}
            <div className="dropzone">
              <Icon name="upload" size={36} />
              <b>Select your .apkg file</b>
              <span className="hint">Large files (100 MB+) are fine. Parsing takes a few seconds.</span>
              <button className="btn btn-primary btn-lg" onClick={() => input.current?.click()}>Choose file</button>
              <input ref={input} type="file" className="visually-hidden" aria-label="Anki package file" onChange={(e) => run(e.target.files?.[0])} />
            </div>
            <div className="card stack">
              <h3>How to export from Anki</h3>
              <ol className="dim small" style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>In Anki on your computer, choose File → Export.</li>
                <li>Format: Anki Deck Package (.apkg), all decks.</li>
                <li><b>Tick “Include scheduling information”</b> to keep your progress. Without it you can still tell the app how far you are.</li>
              </ol>
            </div>
          </>
        )}

        {stage === "parsing" && (
          <div className="stack center" style={{ alignItems: "center", paddingTop: 60 }}>
            <div className="ring" style={{ width: 96, height: 96 }}>
              <svg width="96" height="96" viewBox="0 0 96 96" style={{ animation: progress.phase === "unzip" ? undefined : "spin 1.1s linear infinite" }}>
                <circle className="track" cx="48" cy="48" r="42" strokeWidth="8" />
                <circle className="value" cx="48" cy="48" r="42" strokeWidth="8" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - (progress.phase === "unzip" ? progress.value : 0.25))} />
              </svg>
            </div>
            <h2>{PHASES[progress.phase] || "Working"}…</h2>
            <p className="dim small">{name}</p>
            <p className="hint">Keep this screen open. Big collections take a few seconds.</p>
          </div>
        )}

        {stage === "choose" && parsed && (
          <>
            {err && <Banner kind="err" icon="warn">{err}</Banner>}
            <p className="dim">Found {plural(parsed.decks.length, "deck")}. Choose what to bring in.</p>
            {parsed.decks.map((d) => {
              const s = sel[d.id];
              const exists = store.decks[d.id] && !store.decks[d.id].del;
              return (
                <div className="card stack" key={d.id}>
                  <div className="spread">
                    <div className="grow"><b>{d.name}</b><div className="small dim">{fmtNum(d.count)} cards{d.started ? ` · ${fmtNum(d.started)} with progress` : " · no progress info"}{exists ? " · already in library" : ""}</div></div>
                    <Switch checked={s.include} onChange={(v) => setSel({ ...sel, [d.id]: { ...s, include: v } })} label={`Import ${d.name}`} />
                  </div>
                  {s.include && (
                    <>
                      <div className="seg" role="group" aria-label="Deck type">
                        {KINDS.map((k) => <button key={k.v} aria-pressed={s.kind === k.v} onClick={() => setSel({ ...sel, [d.id]: { ...s, kind: k.v } })}>{k.l}</button>)}
                      </div>
                      {d.started === 0 ? (
                        <div className="stack" style={{ gap: 8 }}>
                          <div className="spread">
                            <span className="small">I already know the first</span>
                            <Stepper value={s.known} min={0} max={d.count} step={s.known >= 100 ? 50 : 5} label="cards known" onChange={(v) => setSel({ ...sel, [d.id]: { ...s, known: v } })} />
                          </div>
                          <span className="hint">This export has no scheduling information. Enter how many cards you have already learned in Anki, in order. They come back for a quick check over the next 10 days.</span>
                        </div>
                      ) : (
                        <span className="hint">Your {fmtNum(d.started)} learned cards keep their schedule.</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {hasRevlog && (
              <div className="card spread">
                <div className="grow"><b>Import review history</b><div className="small dim">{fmtNum(parsed.revlog.length)} past reviews for your stats and streak</div></div>
                <Switch checked={history} onChange={setHistory} label="Import review history" />
              </div>
            )}
            {plan && plan.files.length > 0 && (
              <div className="card spread">
                <div className="grow"><b>Include audio</b><div className="small dim">{fmtNum(plan.files.length)} recordings, about {Math.max(1, Math.round(plan.bytes / 1e6))} MB. Kept on this device only; other devices use the built-in voice.</div></div>
                <Switch checked={withAudio} onChange={setWithAudio} label="Include audio" />
              </div>
            )}
            {parsed.warnings?.length > 0 && <Banner icon="info">{parsed.warnings.slice(0, 3).join(" ")}</Banner>}
            <div className="sticky-actions">
              <button className="btn btn-primary btn-lg btn-block" disabled={!chosen.length} onClick={doImport}>Import {plural(chosen.length, "deck")}</button>
            </div>
          </>
        )}

        {stage === "importing" && (
          <div className="stack center" style={{ alignItems: "center", paddingTop: 60 }}>
            <h2>Adding cards…</h2>
            <p className="dim">Almost done.</p>
          </div>
        )}

        {stage === "audio" && (
          <div className="stack center" style={{ alignItems: "center", paddingTop: 60 }}>
            <div className="ring" style={{ width: 96, height: 96 }}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle className="track" cx="48" cy="48" r="42" strokeWidth="8" />
                <circle className="value" cx="48" cy="48" r="42" strokeWidth="8" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - audioProg.value)} />
              </svg>
              <div className="ring-label"><b>{Math.round(audioProg.value * 100)}%</b></div>
            </div>
            <h2>Saving audio…</h2>
            <p className="dim small">{fmtNum(audioProg.stored)} of {fmtNum(plan?.files.length || 0)} recordings</p>
            <p className="hint">Keep this screen open. Your cards are already imported.</p>
          </div>
        )}

        {stage === "done" && (
          <div className="stack center" style={{ alignItems: "center", paddingTop: 40 }}>
            <div className="big jp" lang="ja" style={{ fontSize: "4rem", color: "var(--primary)" }}>完了</div>
            <h1>Imported {fmtNum(added)} cards</h1>
            {audioDone && <p className="dim">{audioDone.error ? "The audio couldn't be saved, so cards will use the built-in voice." : `${fmtNum(audioDone.stored)} audio recordings saved${audioDone.failed ? `, ${fmtNum(audioDone.failed)} could not be read` : ""}.`}</p>}
            <p className="dim">Your decks are ready. Cards you marked as known will come back for a quick check over the next days.</p>
            {pausedDecks.length > 0 && <p className="hint">The built-in {pausedDecks.join(" and ")} deck{pausedDecks.length > 1 ? "s are" : " is"} paused so you don't study the same characters twice. You can turn {pausedDecks.length > 1 ? "them" : "it"} back on in Cards.</p>}
            <div className="stack" style={{ width: "100%", marginTop: 24 }}>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => onOpen({ type: "study" })}>Start studying</button>
              <button className="btn btn-soft btn-block" onClick={onClose}>Back to library</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
