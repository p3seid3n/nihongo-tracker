// Export to Anki: pick decks, then download an .apkg for AnkiDroid or Anki.
import React, { useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import { Switch, Banner, useApp, plural, fmtNum } from "./common.jsx";
import { InkWord, Hanko } from "./Ink.jsx";
import { loadSQL } from "../lib/importer/sqljs.js";
import { buildAnkiCollection, packApkg } from "../lib/exporter/anki.js";
import { getClipBytes } from "../lib/audio.js";

export function AnkiExport({ onClose }) {
  const { store } = useApp();
  const decks = useMemo(() => store.deckList().filter((d) => Object.keys(store.content[d.id] || {}).length), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState(() => Object.fromEntries(decks.map((d) => [d.id, !d.builtin || d.enabled !== false])));
  const [scheduling, setScheduling] = useState(true);
  const [history, setHistory] = useState(true);
  const [withMedia, setWithMedia] = useState(true);
  const [stage, setStage] = useState("choose"); // choose | working | done
  const [prog, setProg] = useState(0);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const chosen = decks.filter((d) => sel[d.id]);
  const cardCount = chosen.reduce((n, d) => n + Object.keys(store.content[d.id] || {}).length, 0);

  const run = async () => {
    setStage("working"); setErr(""); setProg(0.02);
    try {
      const [SQL, zip] = await Promise.all([loadSQL(), import("fflate")]);
      setProg(0.08);
      const out = buildAnkiCollection(SQL, store, { deckIds: chosen.map((d) => d.id), scheduling, history });
      setProg(0.2);
      const { blob, mediaCount } = await packApkg(zip, out.bytes, withMedia ? out.media : [], getClipBytes, (v) => setProg(0.2 + v * 0.75));
      const name = `Kotoba-${new Date().toISOString().slice(0, 10)}.apkg`;
      const url = URL.createObjectURL(blob);
      setResult({ ...out.counts, mediaCount, size: blob.size, url, name, blob });
      setProg(1);
      setStage("done");
      download(url, name);
    } catch (e) {
      console.error(e);
      setErr("The export failed: " + (e && e.message ? e.message : e));
      setStage("choose");
    }
  };

  const share = async () => {
    const file = new File([result.blob], result.name, { type: "application/octet-stream" });
    try { await navigator.share({ files: [file], title: result.name }); } catch { /* cancelled */ }
  };
  const canShare = !!(result && navigator.canShare && (() => { try { return navigator.canShare({ files: [new File([""], "x.apkg", { type: "application/octet-stream" })] }); } catch { return false; } })());

  return (
    <div className="fullscreen">
      <div className="lesson-top">
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <h2 className="grow">Export to Anki</h2>
      </div>
      <div className="lesson-body stack" style={{ gap: 12 }}>
        {stage === "choose" && (
          <>
            <p className="dim">Makes an .apkg file you can open in AnkiDroid or Anki to carry on there, with your progress.</p>
            {err && <Banner kind="err" icon="warn">{err}</Banner>}
            <div className="card stack" style={{ gap: 4 }}>
              <b>Decks</b>
              {decks.map((d) => (
                <label key={d.id} className="spread pick" style={{ padding: "8px 0" }}>
                  <span className="grow">{d.name}<span className="small dim"> · {fmtNum(Object.keys(store.content[d.id] || {}).length)} cards</span></span>
                  <input type="checkbox" checked={!!sel[d.id]} onChange={(e) => setSel({ ...sel, [d.id]: e.target.checked })} />
                </label>
              ))}
            </div>
            <div className="card spread">
              <div className="grow"><b>Progress</b><div className="small dim">Due dates, intervals and FSRS memory state, so AnkiDroid carries on where you are. Off: every card starts as new.</div></div>
              <Switch checked={scheduling} onChange={setScheduling} label="Include progress" />
            </div>
            {scheduling && (
              <div className="card spread">
                <div className="grow"><b>Review history</b><div className="small dim">Every past answer, for Anki's statistics and its FSRS optimiser.</div></div>
                <Switch checked={history} onChange={setHistory} label="Include review history" />
              </div>
            )}
            <div className="card spread">
              <div className="grow"><b>Audio and pictures</b><div className="small dim">The recordings and pictures saved on this device. Makes the file larger.</div></div>
              <Switch checked={withMedia} onChange={setWithMedia} label="Include audio and pictures" />
            </div>
            <Banner icon="info">If these decks are already in AnkiDroid, delete them there first (or import into a new profile). Otherwise every card would be there twice. In AnkiDroid, switch FSRS on (Deck options → FSRS) so it uses the memory state.</Banner>
            <div className="sticky-actions">
              <button className="btn btn-primary btn-lg btn-block" disabled={!chosen.length} onClick={run}><Icon name="download" /> Export {plural(cardCount, "card")}</button>
            </div>
          </>
        )}
        {stage === "working" && (
          <div className="stack center" style={{ alignItems: "center", paddingTop: 60 }}>
            <div className="ring-wrap"><div className="meter" style={{ width: 220 }}><i className="done" style={{ width: `${Math.round(prog * 100)}%` }} /></div></div>
            <h2>Building your Anki package…</h2>
            <p className="dim small">{Math.round(prog * 100)}%</p>
          </div>
        )}
        {stage === "done" && result && (
          <div className="stack center" style={{ alignItems: "center", paddingTop: 40 }}>
            <div className="big jp ink-host" lang="ja" style={{ fontSize: "4rem", color: "var(--primary)" }}><InkWord>完了</InkWord><Hanko className="hanko-corner" size={30} delay={300} haptic /></div>
            <h1>{fmtNum(result.notes)} notes exported</h1>
            <p className="dim">{fmtNum(result.cards)} cards{result.reviews ? `, ${fmtNum(result.reviews)} past reviews` : ""}{result.mediaCount ? `, ${fmtNum(result.mediaCount)} audio files and pictures` : ""} · {Math.max(1, Math.round(result.size / 1e6))} MB</p>
            <p className="dim small">Open the downloaded file with AnkiDroid (or in AnkiDroid: Import → the file).</p>
            <div className="stack" style={{ width: "100%", marginTop: 24 }}>
              {canShare && <button className="btn btn-tonal btn-block" onClick={share}><Icon name="upload" /> Share to AnkiDroid</button>}
              <button className="btn btn-soft btn-block" onClick={() => download(result.url, result.name)}><Icon name="download" /> Download again</button>
              <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function download(url, name) {
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
}
