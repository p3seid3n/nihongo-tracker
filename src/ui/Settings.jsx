import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Switch, Seg, Stepper, Banner, useApp, PageHead, plural, scrollToTop } from "./common.jsx";
import { parseSteps } from "../lib/store.js";
import { signOut, cloudConfigured } from "../lib/auth.js";
import { setHaptics, canHaptic, onIOS } from "../lib/haptics.js";
import * as hap from "../lib/haptics.js";
import { sfx, unlockSound } from "../lib/sound.js";
import { supportsRefraction } from "../lib/liquidGlass.js";
import { GOALS } from "../lib/game.js";
import { SOURCE } from "../content/lessons.js";
import { loadVoices, pickVoice, say, getAudioInfo, clearAudio, ttsSupported, audioPlan } from "../lib/audio.js";
import { KANJI_FONTS, ensureFont } from "../lib/fonts.js";
import { recognitionSupported, recordingSupported } from "../lib/pronounce.js";
import MemoryModel from "./MemoryModel.jsx";
import { Library } from "./Library.jsx";
import { PACE, EARLY_LESSONS, grammarInterval } from "../lib/plan.js";

export const APP_VERSION = "5.0.0";

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
        <Row title="Native audio" sub="Importing a deck with audio (like Kaishi) under Settings → Backup and import adds the original recordings. Already imported? Import the same file again, your progress stays." />
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

function Sub({ title, onBack, children }) {
  return (
    <div className="page">
      <PageHead title={title} onBack={onBack} />
      {children}
    </div>
  );
}

function MenuRow({ icon, title, sub, onClick, id }) {
  return (
    <button className="list-item" onClick={onClick} data-page={id}>
      <span className="menu-icon"><Icon name={icon} size={22} /></span>
      <span className="grow"><div>{title}</div>{sub && <div className="small dim">{sub}</div>}</span>
      <Icon name="chevron" size={20} className="dim" />
    </button>
  );
}

const MINUTE_CHOICES = [10, 20, 30, 45, 60].map((m) => ({ value: m, label: String(m) }));

export function Settings() {
  const { store, sync, session, open, confirm, toast, resetCaches } = useApp();
  const s = store.settings;
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [page, setPageRaw] = useState(null);
  const setPage = (p) => { setPageRaw(p); scrollToTop(); };
  const back = () => setPage(null);
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
  const deckCount = store.deckList().length;

  // ---------------------------------------------------------------- pages
  if (page === "account") {
    return (
      <Sub title="Account and sync" onBack={back}>
        <section className="stack" style={{ gap: 10 }}>
          {!cloudConfigured && <Banner icon="info">Cloud sync isn't connected for this copy of the app. Everything is saved on this device. Easiest way: in Vercel open your project → Storage → add Supabase, then redeploy. The app creates its own table. The README has the steps.</Banner>}
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
      </Sub>
    );
  }

  if (page === "plan") {
    const every = s.grammarEvery ?? PACE.def;
    const quick = grammarInterval(s, 0);
    return (
      <Sub title="Daily plan" onBack={back}>
        <Section title="Time" hint="Today lists cards first, then fits other practice into this many minutes. What does not fit waits under “If you have time”.">
          <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
            <div><div>Minutes per day</div></div>
            <Seg label="Minutes per day" value={s.minutes ?? 20} onChange={(v) => set({ minutes: v })} options={MINUTE_CHOICES} />
          </div>
        </Section>
        <Section title="New grammar" hint={s.grammarEarlyFast !== false ? `A new lesson opens every ${every} day${every === 1 ? "" : "s"}. The first ${EARLY_LESSONS} lessons are easy, so they come every ${quick} day${quick === 1 ? "" : "s"}. In between, grammar days hold a review or sentence practice. You can always start a lesson early from the Grammar tab.` : `A new lesson opens every ${every} day${every === 1 ? "" : "s"}. In between, grammar days hold a review or sentence practice. You can always start a lesson early from the Grammar tab.`}>
          <Row title="Days between new lessons"><Stepper value={every} min={PACE.min} max={PACE.max} label="days between new lessons" onChange={(v) => set({ grammarEvery: v })} /></Row>
          <Row title="Early lessons are quicker" sub={`The first ${EARLY_LESSONS} lessons come about three times as often.`}><Switch checked={s.grammarEarlyFast !== false} onChange={(v) => set({ grammarEarlyFast: v })} label="Early lessons are quicker" /></Row>
        </Section>
        <Section title="What you study" hint="Turn tracks off to focus. A kanji-only learner can switch off everything else.">
          <Row title="Kana"><Switch checked={s.tracks.kana} onChange={(v) => setTrack("kana", v)} label="Kana" /></Row>
          <Row title="Kanji"><Switch checked={s.tracks.kanji} onChange={(v) => setTrack("kanji", v)} label="Kanji" /></Row>
          <Row title="Vocabulary"><Switch checked={s.tracks.vocab} onChange={(v) => setTrack("vocab", v)} label="Vocabulary" /></Row>
          <Row title="Grammar lessons"><Switch checked={s.tracks.grammar} onChange={(v) => setTrack("grammar", v)} label="Grammar lessons" /></Row>
        </Section>
      </Sub>
    );
  }

  if (page === "pace") {
    return (
      <Sub title="New cards and reviews" onBack={back}>
        <Section title="Per day" hint="Reviews always come before new cards.">
          <Row title="New kana per day"><Stepper value={s.newPerDay.kana} min={0} max={46} label="new kana" onChange={(v) => setPer("kana", v)} /></Row>
          <Row title="New kanji per day"><Stepper value={s.newPerDay.kanji} min={0} max={60} label="new kanji" onChange={(v) => setPer("kanji", v)} /></Row>
          <Row title="New words per day"><Stepper value={s.newPerDay.vocab} min={0} max={60} label="new words" onChange={(v) => setPer("vocab", v)} /></Row>
          <Row title="Other decks per day"><Stepper value={s.newPerDay.generic} min={0} max={60} label="new cards" onChange={(v) => setPer("generic", v)} /></Row>
          <Row title="Review limit per day"><Stepper value={s.maxReviews} min={25} max={1000} step={25} label="review limit" onChange={(v) => set({ maxReviews: v })} /></Row>
          <Row title="Daily effort budget" sub="Every answer costs points: a review 1, a new card 2, a recall review 3, a new recall card 4. When the points run out, the rest waits for tomorrow."><Stepper value={s.effortBudget ?? 200} min={40} max={1000} step={20} label="effort points" onChange={(v) => set({ effortBudget: v })} /></Row>
          <Row title="Slow down new cards when busy" sub="Fewer new cards while many reviews are due or your recall this week is below 80%."><Switch checked={s.autoThrottle !== false} onChange={(v) => set({ autoThrottle: v })} label="Slow down new cards when busy" /></Row>
        </Section>
        <Section title="Recall cards" hint="Once you recognise a word well, you also get asked to say it in Japanese: you see the meaning and type the word.">
          <Row title="Recall cards"><Switch checked={s.recall !== false} onChange={(v) => set({ recall: v })} label="Recall cards" /></Row>
          {s.recall !== false && <Row title="New recall cards per day"><Stepper value={s.recallNewPerDay ?? 5} min={0} max={30} label="new recall cards" onChange={(v) => set({ recallNewPerDay: v })} /></Row>}
          {s.recall !== false && <Row title="Start recall after" sub="How many days a word must stay in your memory first."><Stepper value={s.recallAfter ?? 4} min={1} max={60} label="days before recall" onChange={(v) => set({ recallAfter: v })} /></Row>}
        </Section>
        <Section title="How you learn" hint="A lower retention target means fewer reviews but more forgetting.">
          <Row title="Guess before you see it" sub="Before a new word or kanji is shown, you get a moment to guess what it means. A wrong guess still helps it stick (the pretesting effect), but it makes new cards slower. Off by default."><Switch checked={s.pretest === true} onChange={(v) => set({ pretest: v })} label="Guess before you see it" /></Row>
          <Row title="Weak spots round" sub="At the end of a session, a few cards you missed twice in the last three days come back once more."><Switch checked={s.weakSpots !== false} onChange={(v) => set({ weakSpots: v })} label="Weak spots round" /></Row>
          <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
            <div><div>Target retention</div><div className="small dim">How often you want to remember a card when it comes back</div></div>
            <Seg label="Target retention" value={s.retention} onChange={(v) => set({ retention: v })} options={[0.85, 0.9, 0.95, ...([0.85, 0.9, 0.95].includes(s.retention) ? [] : [s.retention])].sort().map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))} />
          </div>
        </Section>
        <SchedulingSection s={s} set={set} />
      </Sub>
    );
  }

  if (page === "cards") return <Library onBack={back} />;

  if (page === "memory") {
    return <Sub title="Memory model" onBack={back}><MemoryModel Section={Section} Row={Row} /></Sub>;
  }

  if (page === "sound") return <Sub title="Listening and speaking" onBack={back}><AudioSection s={s} set={set} /></Sub>;

  if (page === "look") {
    return (
      <Sub title="Look and feel" onBack={back}>
        <Section title="Reading">
          <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
            <div><div>Furigana</div><div className="small dim">Auto hides readings for kanji you already know</div></div>
            <Seg label="Furigana" value={s.furigana} onChange={(v) => set({ furigana: v })} options={[{ value: "auto", label: "Auto" }, { value: "always", label: "Always" }, { value: "never", label: "Never" }]} />
          </div>
          <KanjiFontPicker value={s.kanjiFont || "mincho"} onChange={(v) => set({ kanjiFont: v })} />
        </Section>
        <Section title="Design" hint={s.surface === "glass" ? (supportsRefraction() ? "This browser renders real refraction: the dock, sheets and panels bend the light behind them." : "This browser can't bend light through the page (that needs Chrome, Brave, Edge or Samsung Internet), so the glass is frosted instead.") : "Material You: solid, tonal surfaces. The original look."}>
          <DesignPicker value={s.surface === "glass" ? "glass" : "material"} onChange={(v) => { set({ surface: v }); hap.snap(); }} />
          <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
            <div>Theme</div>
            <Seg label="Theme" value={s.theme} onChange={(v) => set({ theme: v })} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }]} />
          </div>
          <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
            <div><div>Animations</div><div className="small dim">Springy motion, blade slashes and falling sakura. Reduced keeps screens still. Follows your device's reduce-motion setting too.</div></div>
            <Seg label="Animations" value={s.motion || "full"} onChange={(v) => set({ motion: v })} options={[{ value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }]} />
          </div>
        </Section>
        <Section title="Dojo" hint="Experience points come from every answer, lesson and practice set. Ranks go from 十級 (white belt) to 十段.">
          <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
            <div><div>Daily goal</div><div className="small dim">{GOALS.find((g) => g.value === (s.xpGoal || 50))?.jp} · {s.xpGoal || 50} XP a day. About {Math.round((s.xpGoal || 50) / 3)} answers.</div></div>
            <Seg label="Daily goal" value={s.xpGoal || 50} onChange={(v) => set({ xpGoal: v })} options={GOALS.map((g) => ({ value: g.value, label: g.label }))} />
          </div>
          <Row title="Samurai" sub="Your little companion on Today and at the end of sessions"><Switch checked={s.mascot !== false} onChange={(v) => set({ mascot: v })} label="Samurai" /></Row>
        </Section>
        <Section title="Sound" hint="Everything is played by instruments synthesised on the device: koto, shamisen, taiko, shakuhachi, wind chimes and the ring of a blade.">
          <Row title="Sound effects" sub="Koto notes that climb with your combo, taiko for big moments"><Switch checked={s.sound !== false} onChange={(v) => { set({ sound: v }); if (v) setTimeout(() => { unlockSound(); sfx.good(2); }, 30); }} label="Sound effects" /></Row>
          <Row title="Music" sub="Quiet koto in the background, never over spoken words"><Switch checked={!!s.music} onChange={(v) => { set({ music: v }); setTimeout(unlockSound, 30); }} label="Music" /></Row>
          {(s.sound !== false || s.music) && (
            <>
              <div className="list-item stack" style={{ alignItems: "stretch", gap: 6 }}>
                <div className="spread"><span>Volume</span><span className="small dim num">{Math.round((s.volume ?? 0.8) * 100)}%</span></div>
                <input type="range" className="range" min="0.1" max="1" step="0.05" value={s.volume ?? 0.8} onChange={(e) => set({ volume: Number(e.target.value) })} aria-label="Volume" />
              </div>
              <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }} data-haptic="none">
                <div>Try sounds</div>
                <div className="row-wrap">
                  {[["Correct", () => sfx.correct(3)], ["Wrong", () => sfx.wrong()], ["Combo", () => sfx.combo(10)], ["Finished", () => sfx.finish()], ["New rank", () => sfx.levelUp()], ["Achievement", () => sfx.badge()]].map(([label, run]) => (
                    <button key={label} className="btn btn-soft btn-sm" onClick={() => { unlockSound(); run(); }}>{label}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </Section>
        <Section title="Touch">
          <Row title="Haptic feedback" sub={canHaptic ? (onIOS ? "Taps and answers play a light tick (iOS 17.4 or newer)" : "A different feel for each grade, combos and big moments") : "This browser can't vibrate. Works on Android Chrome and iPhone Safari."}><Switch checked={s.haptics} onChange={(v) => { set({ haptics: v }); setHaptics(v); if (v) hap.medium(); }} label="Haptics" /></Row>
          {s.haptics && canHaptic && !onIOS && (
            <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
              <div><div>Strength</div><div className="small dim">Some phones (Samsung Galaxy among them) skip very short pulses. Stronger makes every pulse long enough to be felt.</div></div>
              <Seg label="Haptic strength" value={s.hapticStrength || "normal"} onChange={(v) => { set({ hapticStrength: v }); hap.setHapticStrength(v); hap.good(); }} options={[{ value: "light", label: "Light" }, { value: "normal", label: "Normal" }, { value: "strong", label: "Strong" }]} />
            </div>
          )}
          {s.haptics && canHaptic && <HapticTry />}
        </Section>
      </Sub>
    );
  }

  if (page === "data") {
    return (
      <Sub title="Backup and import" onBack={back}>
        <Section title="Anki" hint="Bring your decks along with your progress, audio and pictures, or take them back to AnkiDroid.">
          <button className="list-item" onClick={() => open({ type: "import" })}><Icon name="cards" /><span className="grow">Import Anki deck</span></button>
          <button className="list-item" onClick={() => open({ type: "ankiExport" })}><Icon name="download" /><span className="grow"><div>Export to Anki (.apkg)</div><div className="small dim">Continue in AnkiDroid with your progress</div></span></button>
        </Section>
        <Section title="Backup" hint="A backup file holds every deck, card and review. Restoring merges it with what is on this device.">
          <button className="list-item" onClick={exportBackup}><Icon name="download" /><span className="grow">Export backup</span></button>
          <button className="list-item" onClick={() => fileRef.current?.click()}><Icon name="upload" /><span className="grow">Restore from backup</span></button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="visually-hidden" aria-label="Backup file" onChange={(e) => restore(e.target.files?.[0])} />
        </Section>
      </Sub>
    );
  }

  if (page === "about") {
    return (
      <Sub title="About" onBack={back}>
        <Section title="Kotoba">
          <Row title="Version" sub={`Kotoba ${APP_VERSION}`} />
          <button className="list-item" onClick={resetCaches}><Icon name="refresh" /><span className="grow"><div>Reload with a fresh copy</div><div className="small dim">Fixes a stuck or outdated app. Your data is kept.</div></span></button>
        </Section>
        <Section title="Danger zone">
          <button className="list-item" style={{ color: "var(--rose)" }} onClick={doReset}><Icon name="trash" /><span className="grow">Erase all data on this device</span></button>
        </Section>
        <p className="tiny faint" style={{ padding: "0 8px" }}>Grammar lessons follow the order of <a href={SOURCE.url} target="_blank" rel="noreferrer">{SOURCE.name}</a> by Tae Kim, licensed {SOURCE.license}. Spaced repetition uses the open FSRS algorithm. Stroke order data is from <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">KanjiVG</a> (CC BY-SA 3.0). Noto Sans JP and Klee One fonts are licensed under the SIL Open Font License.</p>
      </Sub>
    );
  }

  // ---------------------------------------------------------------- menu
  const accountSub = session ? `${session.user?.email} · ${statusText}` : cloudConfigured ? "Not signed in" : "Saved on this device only";
  return (
    <div className="page">
      <PageHead title="Settings" />

      <div className="list">
        <MenuRow id="account" icon={session ? "cloud" : "user"} title={s.name ? `${s.name}` : "Account and sync"} sub={accountSub} onClick={() => setPage("account")} />
      </div>

      <section className="stack" style={{ gap: 10 }}>
        <div className="section-title"><h2>Learning</h2></div>
        <div className="list">
          <MenuRow id="plan" icon="clock" title="Daily plan" sub={`${s.minutes ?? 20} min a day · lesson every ${s.grammarEvery ?? PACE.def} days`} onClick={() => setPage("plan")} />
          <MenuRow id="pace" icon="bolt" title="New cards and reviews" sub={`${s.newPerDay.kanji} kanji, ${s.newPerDay.vocab} words a day · up to ${s.maxReviews} reviews`} onClick={() => setPage("pace")} />
          <MenuRow id="cards" icon="cards" title="Cards and decks" sub={deckCount ? `${deckCount} deck${deckCount === 1 ? "" : "s"}` : "No decks yet"} onClick={() => setPage("cards")} />
          <MenuRow id="memory" icon="target" title="Memory model" sub="How well the app predicts your forgetting" onClick={() => setPage("memory")} />
        </div>
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <div className="section-title"><h2>App</h2></div>
        <div className="list">
          <MenuRow id="sound" icon="volume" title="Listening and speaking" sub="Audio, voice, pronunciation check" onClick={() => setPage("sound")} />
          <MenuRow id="look" icon="eye" title="Look and feel" sub="Design, dojo, sound, haptics, furigana" onClick={() => setPage("look")} />
          <MenuRow id="data" icon="download" title="Backup and import" sub="Anki decks, backup file" onClick={() => setPage("data")} />
          <MenuRow id="about" icon="info" title="About" sub={`Kotoba ${APP_VERSION}`} onClick={() => setPage("about")} />
        </div>
      </section>
    </div>
  );
}

const MAX_IVL = [{ value: 365, label: "1 y" }, { value: 730, label: "2 y" }, { value: 1825, label: "5 y" }, { value: 3650, label: "10 y" }, { value: 36500, label: "No limit" }];
const EASY_LEVELS = [1, 0.5, 0];
const EASY_NAMES = { 1: "Normal", 0.5: "Reduced", 0: "Minimum" };

/** Anki's scheduling options: learning steps, maximum interval, load balancer, easy days, burying siblings. */
function SchedulingSection({ s, set }) {
  const [learn, setLearn] = React.useState(s.learnSteps ?? "1m 10m");
  const [relearn, setRelearn] = React.useState(s.relearnSteps ?? "10m");
  const okSteps = (t) => t.trim() === "" || parseSteps(t, null) !== null;
  const easy = Array.isArray(s.easyDays) && s.easyDays.length === 7 ? s.easyDays : [1, 1, 1, 1, 1, 1, 1];
  const maxOpts = MAX_IVL.some((o) => o.value === (s.maxInterval ?? 36500)) ? MAX_IVL : [...MAX_IVL, { value: s.maxInterval, label: `${s.maxInterval} d` }];
  return (
    <Section title="Scheduling" hint="The same options as Anki's deck options. Steps are written like Anki's: 1m 10m 1h 1d.">
      <div className="list-item stack" style={{ alignItems: "stretch", gap: 8 }}>
        <div className="field"><label htmlFor="ls">Learning steps</label>
          <input id="ls" className={`input ${okSteps(learn) ? "" : "bad"}`} value={learn} onChange={(e) => setLearn(e.target.value)} onBlur={() => { if (okSteps(learn)) set({ learnSteps: learn.trim() }); }} inputMode="text" autoCapitalize="off" spellCheck={false} />
        </div>
        <div className="field"><label htmlFor="rs">Relearning steps</label>
          <input id="rs" className={`input ${okSteps(relearn) ? "" : "bad"}`} value={relearn} onChange={(e) => setRelearn(e.target.value)} onBlur={() => { if (okSteps(relearn)) set({ relearnSteps: relearn.trim() }); }} inputMode="text" autoCapitalize="off" spellCheck={false} />
        </div>
        {(!okSteps(learn) || !okSteps(relearn)) && <div className="small" style={{ color: "var(--rose)" }}>Use numbers with m, h or d, separated by spaces.</div>}
      </div>
      <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
        <div><div>Maximum interval</div><div className="small dim">The longest a card may wait before it comes back</div></div>
        <Seg label="Maximum interval" value={s.maxInterval ?? 36500} onChange={(v) => set({ maxInterval: v })} options={maxOpts} />
      </div>
      <Row title="Load balancer" sub="When a card's next date can vary by a few days, it goes to the day with fewer reviews, so busy and quiet days even out (as in Anki 24.11)."><Switch checked={s.loadBalance !== false} onChange={(v) => set({ loadBalance: v })} label="Load balancer" /></Row>
      <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }}>
        <div><div>Easy days</div><div className="small dim">Days with fewer reviews. Tap a day to cycle normal, reduced and minimum.</div></div>
        <div className="easy-days" role="group" aria-label="Easy days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
            <button key={d} type="button" className={`easy-day lvl-${String(easy[i]).replace(".", "")}`} aria-label={`${d}: ${EASY_NAMES[easy[i]] || "Normal"}`}
              onClick={() => { const next = [...easy]; next[i] = EASY_LEVELS[(EASY_LEVELS.indexOf(easy[i]) + 1) % EASY_LEVELS.length]; set({ easyDays: next }); }}>
              <b>{d}</b><small>{EASY_NAMES[easy[i]] || "Normal"}</small>
            </button>
          ))}
        </div>
      </div>
      <Row title="Bury siblings" sub="A word's recognition card and its recall card never come up on the same day."><Switch checked={s.burySiblings !== false} onChange={(v) => set({ burySiblings: v })} label="Bury siblings" /></Row>
    </Section>
  );
}


/** Material You or liquid glass, each shown as a little picture of the dock. */
function DesignPicker({ value, onChange }) {
  const opts = [
    { value: "material", label: "Material You", sub: "Solid and tonal" },
    { value: "glass", label: "Liquid glass", sub: "Bends the light" },
  ];
  return (
    <div className="design-pick" role="radiogroup" aria-label="Design">
      {opts.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={`dp ${o.value} ${value === o.value ? "on" : ""}`} onClick={() => onChange(o.value)}>
          <span className="dp-view" aria-hidden="true">
            <i className="dp-blob a" /><i className="dp-blob b" /><i className="dp-lines" />
            <span className="dp-dock"><span className="dp-pill" /><i /><i /><i /><i /></span>
          </span>
          <b>{o.label}</b>
          <small>{o.sub}</small>
        </button>
      ))}
    </div>
  );
}

/** Try the patterns, and say plainly whether the browser accepted them. */
function HapticTry() {
  const [res, setRes] = useState(null);
  const run = (name) => { const ok = hap.play(name); setRes(onIOS ? "ios" : ok ? "ok" : hap.lastResult); };
  const msg = {
    ok: "The browser accepted it. If you felt nothing, try Strong, and check that vibration for touch is on in your phone's sound and vibration settings (power saving can switch it off).",
    refused: "The browser refused to vibrate. Tap anywhere on the page once and try again; if it still refuses, vibration is blocked for this site or by the phone.",
    none: "This browser has no vibration support.",
    ios: "iPhone plays a system tick for each pulse.",
  }[res];
  return (
    <div className="list-item stack" style={{ alignItems: "stretch", gap: 10 }} data-haptic="none">
      <div><div>Try haptics</div><div className="small dim">Each answer and moment has its own rhythm</div></div>
      <div className="row-wrap">
        {[["Tap", "tap"], ["Again", "again"], ["Hard", "hard"], ["Good", "good"], ["Easy", "easy"], ["Combo", "combo"], ["Slash", "slash"], ["New rank", "levelUp"], ["Finished", "done"]].map(([label, name]) => (
          <button key={name} className="btn btn-soft btn-sm" onClick={() => run(name)}>{label}</button>
        ))}
      </div>
      {msg && <div className={`small ${res === "refused" ? "error-text" : "dim"}`} role="status">{msg}</div>}
    </div>
  );
}
