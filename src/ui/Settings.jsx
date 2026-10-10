import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Switch, Seg, Stepper, Banner, useApp, PageHead, plural } from "./common.jsx";
import { signOut, cloudConfigured } from "../lib/auth.js";
import { setHaptics, canHaptic, onIOS } from "../lib/haptics.js";
import * as hap from "../lib/haptics.js";
import { SOURCE } from "../content/lessons.js";
import { loadVoices, pickVoice, say, getAudioInfo, clearAudio, ttsSupported, audioPlan } from "../lib/audio.js";
import { KANJI_FONTS, ensureFont } from "../lib/fonts.js";
import { recognitionSupported, recordingSupported } from "../lib/pronounce.js";
import MemoryModel from "./MemoryModel.jsx";

export const APP_VERSION = "4.6.0";

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
  const plan = audioPlan(s);
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
      <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
        <div><div>Read the word aloud</div><div className="small dim">The speaker button always plays it on demand</div></div>
        <Seg label="Word audio" value={plan.word} onChange={(v) => set({ audioWord: v })} options={[{ value: "front", label: "On card open" }, { value: "reveal", label: "With the answer" }, { value: "off", label: "Off" }]} />
      </div>
      <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
        <div><div>Read the example sentence aloud</div><div className="small dim">Vocabulary cards with a sentence</div></div>
        <Seg label="Sentence audio" value={plan.sentence} onChange={(v) => set({ audioSentence: v })} options={[{ value: "reveal", label: "With the answer" }, { value: "off", label: "Off" }]} />
      </div>
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

function KanjiFontPicker({ value, onChange }) {
  useEffect(() => { KANJI_FONTS.forEach((f) => ensureFont(f.id)); }, []); // so each choice previews in its own face
  return (
    <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
      <div><div>Kanji font</div><div className="small dim">For the big characters on cards. Pick the one where small parts, like the water drops in 泊, are easiest to see.</div></div>
      <div className="font-picks" role="radiogroup" aria-label="Kanji font">
        {KANJI_FONTS.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={value === f.id} className={`font-pick ${value === f.id ? "on" : ""}`} onClick={() => onChange(f.id)}>
            <span className="font-sample" lang="ja" style={{ fontFamily: `var(--kf-${f.id})` }}>泊書魚</span>
            <b>{f.label}</b>
            <span className="small dim">{f.sub}</span>
          </button>
        ))}
      </div>
    </div>
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
        <Row title="Daily effort budget" sub="Every answer costs points: a review 1, a new card 2, a recall review 3, a new recall card 4. When the points run out, the rest waits for tomorrow."><Stepper value={s.effortBudget ?? 200} min={40} max={1000} step={20} label="effort points" onChange={(v) => set({ effortBudget: v })} /></Row>
        <Row title="Slow down new cards when busy" sub="Fewer new cards while many reviews are due or your recall this week is below 80%."><Switch checked={s.autoThrottle !== false} onChange={(v) => set({ autoThrottle: v })} label="Slow down new cards when busy" /></Row>
        <Row title="Recall cards" sub="Once you recognise a word well, you also get asked to say it in Japanese: you see the meaning and type the word."><Switch checked={s.recall !== false} onChange={(v) => set({ recall: v })} label="Recall cards" /></Row>
        {s.recall !== false && <Row title="New recall cards per day"><Stepper value={s.recallNewPerDay ?? 5} min={0} max={30} label="new recall cards" onChange={(v) => set({ recallNewPerDay: v })} /></Row>}
        {s.recall !== false && <Row title="Start recall after" sub="How many days a word must stay in your memory first."><Stepper value={s.recallAfter ?? 4} min={1} max={60} label="days before recall" onChange={(v) => set({ recallAfter: v })} /></Row>}
        <Row title="Guess before you see it" sub="Before a new word or kanji is shown, you get a moment to guess what it means. A wrong guess still helps it stick (the pretesting effect), but it makes new cards slower. Off by default."><Switch checked={s.pretest === true} onChange={(v) => set({ pretest: v })} label="Guess before you see it" /></Row>
        <Row title="Weak spots round" sub="At the end of a session, a few cards you missed twice in the last three days come back once more."><Switch checked={s.weakSpots !== false} onChange={(v) => set({ weakSpots: v })} label="Weak spots round" /></Row>
        <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
          <div><div>Target retention</div><div className="small dim">How often you want to remember a card when it comes back</div></div>
          <Seg label="Target retention" value={s.retention} onChange={(v) => set({ retention: v })} options={[{ value: 0.85, label: "85%" }, { value: 0.9, label: "90%" }, { value: 0.95, label: "95%" }]} />
        </div>
      </Section>

      <MemoryModel Section={Section} Row={Row} />

      <AudioSection s={s} set={set} />

      <Section title="Reading and look">
        <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
          <div><div>Furigana</div><div className="small dim">Auto hides readings for kanji you already know</div></div>
          <Seg label="Furigana" value={s.furigana} onChange={(v) => set({ furigana: v })} options={[{ value: "auto", label: "Auto" }, { value: "always", label: "Always" }, { value: "never", label: "Never" }]} />
        </div>
        <KanjiFontPicker value={s.kanjiFont || "mincho"} onChange={(v) => set({ kanjiFont: v })} />
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

      <p className="tiny faint" style={{ padding: "0 8px" }}>Grammar lessons follow the order of <a href={SOURCE.url} target="_blank" rel="noreferrer">{SOURCE.name}</a> by Tae Kim, licensed {SOURCE.license}. Spaced repetition uses the open FSRS algorithm. Stroke order data is from <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">KanjiVG</a> (CC BY-SA 3.0). Noto Sans JP and Klee One fonts are licensed under the SIL Open Font License.</p>
    </div>
  );
}
