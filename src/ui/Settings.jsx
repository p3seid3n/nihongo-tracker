import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Switch, Seg, Stepper, Banner, useApp, PageHead, plural } from "./common.jsx";
import { signOut, cloudConfigured } from "../lib/auth.js";
import { setHaptics, canHaptic, onIOS } from "../lib/haptics.js";
import * as hap from "../lib/haptics.js";
import { SOURCE } from "../content/lessons.js";
import { loadVoices, pickVoice, say, getAudioInfo, clearAudio, ttsSupported } from "../lib/audio.js";
import { recognitionSupported, recordingSupported } from "../lib/pronounce.js";

export const APP_VERSION = "4.1.0";

function Row({ title, sub, children }) {
  return (
    <div className="list-item">
      <div className="grow"><div>{title}</div>{sub && <div className="small dim">{sub}</div>}</div>
      {children}
    </div>
  );
}

function Section({ title, children, hint }) {
  return (
    <section className="stack" style={{ gap: 10 }}>
      <div className="section-title"><h2>{title}</h2></div>
      <div className="list">{children}</div>
      {hint && <p className="hint" style={{ margin: "0 8px" }}>{hint}</p>}
    </section>
  );
}

function AudioSection({ s, set }) {
  const { confirm, toast } = useApp();
  const [voices, setVoices] = useState(null);
  const [info, setInfo] = useState({ count: 0, bytes: 0 });
  useEffect(() => {
    let alive = true;
    loadVoices().then((v) => alive && setVoices(v));
    getAudioInfo().then((i) => alive && setInfo(i));
    return () => { alive = false; };
  }, []);
  const cur = pickVoice(voices || [], s.voiceURI);
  const removeAudio = async () => {
    const ok = await confirm({ title: "Remove downloaded audio?", body: "The native audio clips are deleted from this device. Cards will use the built-in Japanese voice instead. Re-import your Anki file to get them back.", confirm: "Remove", danger: true });
    if (!ok) return;
    await clearAudio();
    setInfo({ count: 0, bytes: 0 });
    toast("Audio removed.");
  };
  const mb = Math.max(1, Math.round(info.bytes / 1e6));
  return (
    <Section title="Listening and speaking" hint={voices && !voices.length && ttsSupported ? "No Japanese voice was found on this device. Android: Settings → System → Languages → Text-to-speech → install Japanese. iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese." : "Imported decks with audio (like Kaishi) use the original recordings. Everything else uses your device's Japanese voice."}>
      <Row title="Play audio automatically" sub="Reads the word when a card appears and the example sentence when you reveal it"><Switch checked={s.autoplay} onChange={(v) => set({ autoplay: v })} label="Play audio automatically" /></Row>
      <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
        <div><div>Voice speed</div><div className="small dim">For the built-in voice and playback of clips</div></div>
        <Seg label="Voice speed" value={String(s.speechRate)} onChange={(v) => set({ speechRate: Number(v) })} options={[{ value: "0.75", label: "Slow" }, { value: "1", label: "Normal" }, { value: "1.15", label: "Fast" }]} />
      </div>
      {ttsSupported && voices && voices.length > 0 && (
        <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
          <div><div>Voice</div><div className="small dim">{cur ? cur.name : ""}</div></div>
          <div className="row-wrap">
            {voices.length > 1 && (
              <select className="input input-sm" style={{ width: "100%", textAlign: "left" }} aria-label="Japanese voice" value={cur?.voiceURI || ""} onChange={(e) => set({ voiceURI: e.target.value })}>
                {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? "" : " (online)"}</option>)}
              </select>
            )}
            <button className="btn btn-soft btn-sm" onClick={() => say({ file: "", text: "こんにちは。日本語を勉強しています。" })}><Icon name="volume" /> Test voice</button>
          </div>
        </div>
      )}
      <Row title="Pronunciation check" sub={recognitionSupported ? "Uses your browser's speech recognition. It may need an internet connection." : recordingSupported ? "This browser can't recognise speech, so you record yourself and compare by ear." : "Not available in this browser."} />
      {info.count > 0 ? (
        <div className="list-item">
          <div className="grow"><div>Downloaded audio</div><div className="small dim">{info.count.toLocaleString("en-US")} clips · about {mb} MB on this device</div></div>
          <button className="btn btn-soft btn-sm" onClick={removeAudio}>Remove</button>
        </div>
      ) : (
        <Row title="Native audio" sub="Importing a deck with audio (like Kaishi) in Cards → Import Anki deck adds the original recordings. Already imported? Import the same file again, your progress stays." />
      )}
    </Section>
  );
}

export function Settings() {
  const { store, sync, session, open, confirm, toast, resetCaches } = useApp();
  const s = store.settings;
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => store.updateSettings(patch);
  const setTrack = (k, v) => set({ tracks: { ...s.tracks, [k]: v } });
  const setPer = (k, v) => set({ newPerDay: { ...s.newPerDay, [k]: v } });

  const last = store.meta.lastSync ? new Date(store.meta.lastSync).toLocaleString() : "never";

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store.exportBackup())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nihongo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const restore = async (file) => {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const n = store.importBackup(json);
      toast(`Backup restored (${plural(n, "part")})`);
    } catch (e) {
      toast(e && e.message ? e.message : "Could not read that file.");
    } finally { if (fileRef.current) fileRef.current.value = ""; }
  };

  const doSignOut = async () => {
    const ok = await confirm({ title: "Sign out?", body: "Your cards and progress stay on this device. Sync pauses until you sign in again.", confirm: "Sign out" });
    if (!ok) return;
    setBusy(true);
    try { await signOut(); } catch { /* ignore */ }
    setBusy(false);
  };

  const doReset = async () => {
    const ok = await confirm({
      title: "Erase everything on this device?",
      body: session ? "All decks, progress and lessons are removed from this device. Your account in the cloud is not touched; signing in again brings your data back." : "All decks, progress and lessons are removed. This cannot be undone. Export a backup first if you might want it back.",
      confirm: "Erase data", danger: true,
    });
    if (!ok) return;
    await store.resetAll();
    toast("All data erased");
  };

  const statusText = { off: "Off", idle: "Waiting", syncing: "Syncing…", ok: "Up to date", offline: "Offline. Will sync when you're back online", error: "Sync problem" }[sync.status] || "";

  return (
    <div className="page">
      <PageHead title="Settings" />

      <section className="stack" style={{ gap: 10 }}>
        <div className="section-title"><h2>Account and sync</h2></div>
        {!cloudConfigured && <Banner icon="info">Cloud sync isn't set up for this copy of the app. Everything is saved on this device. The README explains how to connect a free Supabase project.</Banner>}
        {cloudConfigured && !session && (
          <div className="card stack">
            <p className="dim">Sign in to keep your progress in sync between your phone and computer.</p>
            <button className="btn btn-primary" onClick={() => open({ type: "auth" })}><Icon name="user" /> Sign in or create account</button>
          </div>
        )}
        {session && (
          <div className="card stack">
            <div className="spread">
              <div className="grow" style={{ minWidth: 0 }}><b style={{ overflowWrap: "anywhere" }}>{session.user?.email}</b><div className="small dim"><span className={`sync-dot ${sync.status}`} /> {statusText}</div></div>
            </div>
            <div className="small dim">Last synced: {last}</div>
            {sync.status === "error" && <Banner kind="err" icon="warn">{sync.error?.message || "Could not reach the server."}</Banner>}
            <div className="row">
              <button className="btn btn-tonal grow" disabled={sync.status === "syncing"} onClick={() => sync.run()}><Icon name="refresh" /> Sync now</button>
              <button className="btn btn-soft" disabled={busy} onClick={doSignOut}><Icon name="logout" /> Sign out</button>
            </div>
          </div>
        )}
      </section>

      <Section title="Profile">
        <div className="list-item">
          <div className="grow field"><label htmlFor="nm">Your name</label><input id="nm" className="input" defaultValue={s.name} maxLength={30} onBlur={(e) => { if (e.target.value.trim() !== s.name) set({ name: e.target.value.trim() }); }} /></div>
        </div>
      </Section>

      <Section title="What you study" hint="Turn tracks off to focus. A kanji-only learner can switch off everything else.">
        <Row title="Kana"><Switch checked={s.tracks.kana} onChange={(v) => setTrack("kana", v)} label="Kana" /></Row>
        <Row title="Kanji"><Switch checked={s.tracks.kanji} onChange={(v) => setTrack("kanji", v)} label="Kanji" /></Row>
        <Row title="Vocabulary"><Switch checked={s.tracks.vocab} onChange={(v) => setTrack("vocab", v)} label="Vocabulary" /></Row>
        <Row title="Grammar lessons"><Switch checked={s.tracks.grammar} onChange={(v) => setTrack("grammar", v)} label="Grammar lessons" /></Row>
      </Section>

      <Section title="Pace" hint="Reviews always come before new cards. A lower retention target means fewer reviews but more forgetting.">
        <Row title="New kana per day"><Stepper value={s.newPerDay.kana} min={0} max={46} label="new kana" onChange={(v) => setPer("kana", v)} /></Row>
        <Row title="New kanji per day"><Stepper value={s.newPerDay.kanji} min={0} max={60} label="new kanji" onChange={(v) => setPer("kanji", v)} /></Row>
        <Row title="New words per day"><Stepper value={s.newPerDay.vocab} min={0} max={60} label="new words" onChange={(v) => setPer("vocab", v)} /></Row>
        <Row title="Other decks per day"><Stepper value={s.newPerDay.generic} min={0} max={60} label="new cards" onChange={(v) => setPer("generic", v)} /></Row>
        <Row title="Review limit per day"><Stepper value={s.maxReviews} min={25} max={1000} step={25} label="review limit" onChange={(v) => set({ maxReviews: v })} /></Row>
        <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
          <div><div>Target retention</div><div className="small dim">How often you want to remember a card when it comes back</div></div>
          <Seg label="Target retention" value={s.retention} onChange={(v) => set({ retention: v })} options={[{ value: 0.85, label: "85%" }, { value: 0.9, label: "90%" }, { value: 0.95, label: "95%" }]} />
        </div>
      </Section>

      <AudioSection s={s} set={set} />

      <Section title="Reading and look">
        <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
          <div><div>Furigana</div><div className="small dim">Auto hides readings for kanji you already know</div></div>
          <Seg label="Furigana" value={s.furigana} onChange={(v) => set({ furigana: v })} options={[{ value: "auto", label: "Auto" }, { value: "always", label: "Always" }, { value: "never", label: "Never" }]} />
        </div>
        <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
          <div>Theme</div>
          <Seg label="Theme" value={s.theme} onChange={(v) => set({ theme: v })} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }]} />
        </div>
        <Row title="Haptic feedback" sub={canHaptic ? (onIOS ? "Taps and answers play a light tick (iOS 17.4 or newer)" : "Short vibrations on taps and answers") : "This browser can't vibrate. Works on Android Chrome and iPhone Safari."}><Switch checked={s.haptics} onChange={(v) => { set({ haptics: v }); setHaptics(v); if (v) hap.medium(); }} label="Haptics" /></Row>
        {s.haptics && canHaptic && (
          <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }} data-haptic="none">
            <div><div>Try haptics</div><div className="small dim">Tap, good, wrong, finished</div></div>
            <div className="row-wrap">
              <button className="btn btn-soft btn-sm" onClick={hap.tap}>Tap</button>
              <button className="btn btn-soft btn-sm" onClick={hap.good}>Good</button>
              <button className="btn btn-soft btn-sm" onClick={hap.bad}>Wrong</button>
              <button className="btn btn-soft btn-sm" onClick={hap.done}>Finished</button>
            </div>
          </div>
        )}
        <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
          <div><div>Animations</div><div className="small dim">Springy motion. Reduced keeps screens still. Follows your device's reduce-motion setting too.</div></div>
          <Seg label="Animations" value={s.motion || "full"} onChange={(v) => set({ motion: v })} options={[{ value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }]} />
        </div>
      </Section>

      <Section title="Your data" hint="A backup file holds every deck, card and review. Restoring merges it with what is on this device.">
        <button className="list-item" onClick={exportBackup}><Icon name="download" /><span className="grow">Export backup</span></button>
        <button className="list-item" onClick={() => fileRef.current?.click()}><Icon name="upload" /><span className="grow">Restore from backup</span></button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="visually-hidden" aria-label="Backup file" onChange={(e) => restore(e.target.files?.[0])} />
        <button className="list-item" onClick={() => open({ type: "import" })}><Icon name="cards" /><span className="grow">Import Anki deck</span></button>
      </Section>

      <Section title="App">
        <Row title="Version" sub={`Kotoba ${APP_VERSION}`} />
        <button className="list-item" onClick={resetCaches}><Icon name="refresh" /><span className="grow"><div>Reload with a fresh copy</div><div className="small dim">Fixes a stuck or outdated app. Your data is kept.</div></span></button>
        <button className="list-item" style={{ color: "var(--rose)" }} onClick={doReset}><Icon name="trash" /><span className="grow">Erase all data on this device</span></button>
      </Section>

      <p className="tiny faint" style={{ padding: "0 8px" }}>Grammar lessons follow the order of <a href={SOURCE.url} target="_blank" rel="noreferrer">{SOURCE.name}</a> by Tae Kim, licensed {SOURCE.license}. Spaced repetition uses the open FSRS algorithm. Stroke order data is from <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">KanjiVG</a> (CC BY-SA 3.0).</p>
    </div>
  );
}
