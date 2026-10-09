import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Store, idbBackend } from "./lib/store.js";
import { SyncController } from "./lib/syncController.js";
import { supabase, cloudConfigured } from "./lib/supabase.js";
import { supabaseRemote } from "./lib/sync.js";
import { getSession, onAuthChange, signOut } from "./lib/auth.js";
import { knownKanjiSet } from "./lib/personal.js";
import { setHaptics } from "./lib/haptics.js";
import { AppCtx, ConfirmSheet, Toasts, useToasts, Banner } from "./ui/common.jsx";
import { Icon } from "./ui/icons.jsx";
import { Auth } from "./ui/Auth.jsx";
import { Onboarding } from "./ui/Onboarding.jsx";
import { Home } from "./ui/Home.jsx";
import { Study } from "./ui/Study.jsx";
import { Learn, LessonPlayer, PracticePlayer } from "./ui/Learn.jsx";
import { Library } from "./ui/Library.jsx";
import { ImportWizard } from "./ui/ImportWizard.jsx";
import { Stats } from "./ui/Stats.jsx";
import { Settings } from "./ui/Settings.jsx";

const TABS = [
  { id: "home", label: "Today", icon: "home" },
  { id: "learn", label: "Grammar", icon: "learn" },
  { id: "cards", label: "Cards", icon: "cards" },
  { id: "stats", label: "Stats", icon: "stats" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function createRuntime() {
  const store = new Store(idbBackend());
  const sessionRef = { current: null };
  const sync = new SyncController(store, () => (cloudConfigured && sessionRef.current ? supabaseRemote(supabase) : null));
  return { store, sync, sessionRef };
}

function Splash({ text }) {
  return (
    <div className="welcome" style={{ alignItems: "center", textAlign: "center" }}>
      <div className="brand-kanji" lang="ja">学</div>
      {text && <p className="dim">{text}</p>}
    </div>
  );
}

async function resetCaches() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch { /* ignore */ }
  location.reload();
}

export default function App() {
  const rt = useRef(null);
  if (!rt.current) rt.current = createRuntime();
  const { store, sync, sessionRef } = rt.current;
  useSyncExternalStore(store.subscribe, store.getVersion);

  const [phase, setPhase] = useState("loading"); // loading | ready | fatal
  const [fatal, setFatal] = useState(null);
  const [session, setSession] = useState(null);
  const [recovery, setRecovery] = useState(false);
  const [tab, setTab] = useState("home");
  const [overlay, setOverlay] = useState(null);
  const [ownerPrompt, setOwnerPrompt] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [known, setKnown] = useState(() => new Set());
  const overlayRef = useRef(null);
  const keyRef = useRef(0);
  const { items: toastItems, toast, dismiss } = useToasts();

  // ---- boot
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await store.load();
        setHaptics(store.settings.haptics);
        const s = await getSession();
        sessionRef.current = s;
        if (!alive) return;
        setSession(s);
        setPhase("ready");
        window.__ntBooted = true;
        window.__ntStore = store;
        window.dispatchEvent(new Event("nt-booted"));
        try { navigator.storage?.persist?.(); } catch { /* ignore */ }
      } catch (e) {
        console.error("boot failed", e);
        if (alive) { setFatal(e); setPhase("fatal"); }
      }
    })();
    return () => { alive = false; };
  }, [store, sessionRef]);

  // ---- history-backed overlays
  useEffect(() => {
    if (window.history.state && window.history.state.nt) window.history.replaceState(null, "");
    const onPop = () => { overlayRef.current = null; setOverlay(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const open = useCallback((o) => {
    const had = !!overlayRef.current;
    overlayRef.current = { ...o, key: ++keyRef.current };
    if (!had) window.history.pushState({ nt: 1 }, "");
    setOverlay(overlayRef.current);
  }, []);
  const close = useCallback(() => {
    if (!overlayRef.current) return;
    if (window.history.state && window.history.state.nt) window.history.back();
    else { overlayRef.current = null; setOverlay(null); }
  }, []);
  const go = useCallback((t) => { setTab(t); window.scrollTo(0, 0); }, []);
  useEffect(() => {
    document.body.style.overflow = overlay ? "hidden" : "";
  }, [overlay]);

  // ---- auth
  useEffect(() => {
    if (phase !== "ready") return undefined;
    const off = onAuthChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      sessionRef.current = s;
      setSession((prev) => (prev?.user?.id === s?.user?.id && prev?.access_token === s?.access_token ? prev : s));
    });
    return off;
  }, [phase, sessionRef]);

  const uid = session?.user?.id || null;
  useEffect(() => {
    if (phase !== "ready") return;
    if (!uid) { sync.stop(); return; }
    const owner = store.meta.owner;
    const hasLocal = store.settings.onboarded || store.deckList().length > 0;
    if (owner === uid) { sync.start(); return; }
    if (!owner && !hasLocal) {
      store.setOwner(uid);
      setPulling(true);
      sync.start();
      sync.run().finally(() => setPulling(false));
      return;
    }
    setOwnerPrompt({ uid, mode: owner ? "other" : "merge" });
  }, [uid, phase, store, sync]);

  const resolveOwner = async (choice) => {
    const p = ownerPrompt;
    setOwnerPrompt(null);
    if (!p) return;
    if (choice === "cancel") { try { await signOut(); } catch { /* ignore */ } return; }
    if (choice === "replace") {
      setPulling(true);
      try { await store.resetAll(); } catch (e) { console.error(e); }
      store.setOwner(p.uid);
      sync.start();
      await sync.run();
      setPulling(false);
      return;
    }
    store.setOwner(p.uid);
    sync.start();
  };

  // ---- known kanji (drives furigana)
  useEffect(() => {
    if (phase !== "ready") return undefined;
    let t = null;
    const compute = () => {
      const next = knownKanjiSet(store);
      setKnown((prev) => (prev.size === next.size && [...next].every((k) => prev.has(k)) ? prev : next));
    };
    compute();
    const unsub = store.subscribe(() => { clearTimeout(t); t = setTimeout(compute, 1200); });
    return () => { clearTimeout(t); unsub(); };
  }, [phase, store]);

  // ---- persistence safety
  useEffect(() => {
    const flush = () => { store.flush(); };
    const vis = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("pagehide", flush); };
  }, [store]);

  // ---- appearance
  const themeSetting = store.settings.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = themeSetting || "dark";
    const apply = () => {
      const light = themeSetting === "light" || (themeSetting === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#fbf7f3" : "#151413");
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [themeSetting]);
  useEffect(() => { setHaptics(store.settings.haptics); }, [store.settings.haptics, store]);

  // ---- update notice
  useEffect(() => {
    const onUpdate = () => toast("A new version is ready.", { ms: 0, action: { label: "Reload", run: () => window.location.reload() } });
    window.addEventListener("nt-update-ready", onUpdate);
    return () => window.removeEventListener("nt-update-ready", onUpdate);
  }, [toast]);

  const confirm = useCallback((options) => new Promise((resolve) => setConfirmState({ options, resolve })), []);

  const ctx = useMemo(() => ({
    store, sync, session, cloud: cloudConfigured, known, open, close, go, toast, confirm, resetCaches,
  }), [store, sync, session, known, open, close, go, toast, confirm]);

  // ---- render
  if (phase === "loading") return <Splash />;
  if (phase === "fatal") {
    return (
      <div className="welcome">
        <h1>Couldn't open local storage</h1>
        <p className="dim">The browser blocked access to its storage (private browsing or a full disk can cause this). Try a normal window, or free up space.</p>
        <pre className="card small" style={{ whiteSpace: "pre-wrap" }}>{String(fatal?.message || fatal)}</pre>
        <button className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>Try again</button>
        <button className="btn btn-soft" onClick={resetCaches}>Reload with a fresh copy</button>
      </div>
    );
  }

  let body;
  if (recovery) {
    body = <Auth recovery onDone={() => { setRecovery(false); toast("Password updated."); }} />;
  } else if (pulling) {
    body = <Splash text="Loading your data…" />;
  } else if (!store.settings.onboarded) {
    body = <Onboarding store={store} onFinish={() => { setTab("home"); window.scrollTo(0, 0); }} onSignIn={() => open({ type: "auth" })} />;
  } else {
    body = (
      <div className="app">
        {store.saveError && <div style={{ position: "sticky", top: 0, zIndex: 40, padding: 8 }}><Banner kind="err" icon="warn">Can't save to this device (storage full or blocked). Export a backup from Settings.</Banner></div>}
        {!overlay && (
          <>
            {tab === "home" && <Home />}
            {tab === "learn" && <Learn />}
            {tab === "cards" && <Library />}
            {tab === "stats" && <Stats />}
            {tab === "settings" && <Settings />}
          </>
        )}
        {!overlay && (
          <nav className="nav" aria-label="Main">
            <div className="nav-inner">
              {TABS.map((t) => (
                <button key={t.id} className="nav-item" aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
                  <Icon name={t.icon} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    );
  }

  return (
    <AppCtx.Provider value={ctx}>
      {body}
      {overlay && !recovery && <OverlayView o={overlay} close={close} open={open} />}
      {ownerPrompt && <OwnerSheet prompt={ownerPrompt} onChoose={resolveOwner} email={session?.user?.email} />}
      {confirmState && <ConfirmSheet options={confirmState.options} onResolve={(v) => { confirmState.resolve(v); setConfirmState(null); }} />}
      <Toasts items={toastItems} dismiss={dismiss} />
    </AppCtx.Provider>
  );
}

function OverlayView({ o, close, open }) {
  switch (o.type) {
    case "study": return <Study key={o.key} opts={o.opts || {}} onClose={close} onOpen={open} />;
    case "lesson": return <LessonPlayer key={o.key} id={o.id} onClose={close} onOpen={open} />;
    case "review": return <PracticePlayer key={o.key} mode="review" onClose={close} />;
    case "sentences": return <PracticePlayer key={o.key} mode="sentences" onClose={close} />;
    case "testout": return <PracticePlayer key={o.key} mode="testout" unitId={o.unit} onClose={close} />;
    case "import": return <ImportWizard key={o.key} onClose={close} onOpen={(n) => open(n)} />;
    case "auth": return <div className="fullscreen" key={o.key}><Auth onDone={close} onSkip={close} skipLabel="Not now" /></div>;
    default: return null;
  }
}

function OwnerSheet({ prompt, onChoose, email }) {
  const merge = prompt.mode === "merge";
  return (
    <div className="scrim" style={{ zIndex: 90 }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Account data">
        <div className="sheet-grab" />
        <h2>{merge ? "Combine with your account?" : "This device has another account's data"}</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          <p className="dim">
            {merge
              ? `You signed in as ${email || "your account"}. This device already has study data. You can combine it with your account (nothing is lost), or replace it with what is saved in your account.`
              : `The data on this device belongs to a different account. To protect both accounts, replace it with the data from ${email || "this account"}, or cancel and sign out.`}
          </p>
          {merge && <button className="btn btn-primary btn-block" onClick={() => onChoose("merge")}>Combine both</button>}
          <button className={`btn btn-block ${merge ? "btn-soft" : "btn-primary"}`} onClick={() => onChoose("replace")}>Replace with account data</button>
          <button className="btn btn-ghost btn-block" onClick={() => onChoose("cancel")}>Cancel and sign out</button>
        </div>
      </div>
    </div>
  );
}
