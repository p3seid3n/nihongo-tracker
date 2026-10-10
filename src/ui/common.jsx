import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons.jsx";
import { springAnimate } from "../lib/motion.js";
import * as hap from "../lib/haptics.js";
import { lockScroll } from "../lib/scrollLock.js";

export const AppCtx = createContext(null);
/** True while a full-screen view covers the tabs: they stay mounted underneath (so closing is instant and
 *  keeps the scroll position) but stop reacting to the store until you come back. */
export const PauseCtx = createContext(false);
export const useApp = () => {
  const ctx = useContext(AppCtx);
  const paused = useContext(PauseCtx);
  const frozen = useRef(null);
  if (paused) { if (!frozen.current) frozen.current = { store: ctx.store.getVersion(), sync: ctx.sync.getVer() }; } else frozen.current = null;
  const f = frozen.current;
  // re-render on every store change
  useSyncExternalStore(ctx.store.subscribe, f ? () => f.store : ctx.store.getVersion);
  useSyncExternalStore(ctx.sync.subscribe, f ? () => f.sync : ctx.sync.getVer);
  return ctx;
};

/** Re-renders every `ms` so "due now" and the study day stay current. */
export function useNow(ms = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    const v = () => { if (document.visibilityState === "visible") setNow(Date.now()); };
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, [ms]);
  return now;
}

export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={!!checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ "--n": options.length, "--i": Math.max(0, options.findIndex((o) => o.value === value)) }}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label }) {
  const [text, setText] = useState(null); // null while not typing
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const commit = () => {
    if (text == null) return;
    const n = parseInt(text, 10);
    if (!Number.isNaN(n)) onChange(clamp(n));
    setText(null);
  };
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label || ""}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>−</button>
      <input
        className="stepper-input" inputMode="numeric" pattern="[0-9]*" aria-label={label}
        value={text ?? String(value)}
        onFocus={(e) => { setText(String(value)); e.target.select(); }}
        onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      />
      <button type="button" aria-label={`Increase ${label || ""}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}

export function Ring({ size = 84, stroke = 8, value = 0, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  // draw from empty on mount so the ring springs in
  const [armed, setArmed] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setArmed(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle className="value" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - (armed ? v : 0))} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

/** Drag a sheet down by its handle: it follows the finger, then springs away or back using the release velocity. */
function useSheetDrag(onClose) {
  const sheet = useRef(null);
  const st = useRef(null);
  const down = (e) => {
    if (e.button) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const now = performance.now();
    st.current = { y0: e.clientY, y: e.clientY, t: now, v: 0, dy: 0, past: false, h: sheet.current?.offsetHeight || 400 };
  };
  const move = (e) => {
    const s = st.current;
    if (!s || !sheet.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - s.t);
    s.v = 0.6 * s.v + 0.4 * (((e.clientY - s.y) / dt) * 1000);
    s.y = e.clientY; s.t = now;
    const raw = e.clientY - s.y0;
    s.dy = raw >= 0 ? raw : -Math.sqrt(-raw) * 2.5; // resists pulling up
    sheet.current.style.transform = `translateY(${s.dy}px)`;
    const scrim = sheet.current.parentElement;
    if (scrim) scrim.style.background = `rgb(0 0 0 / ${(0.55 * (1 - Math.min(1, Math.max(0, s.dy) / s.h))).toFixed(3)})`;
    const past = s.dy > s.h * 0.35;
    if (past !== s.past) { s.past = past; hap.tick(); }
  };
  const up = () => {
    const s = st.current;
    st.current = null;
    const el = sheet.current;
    if (!s || !el) return;
    const dismiss = s.dy > s.h * 0.35 || (s.v > 900 && s.dy > 12);
    const scrim = el.parentElement;
    if (dismiss) {
      hap.snap();
      el.dataset.gone = "1"; // already animated away by the finger: no extra exit animation
      if (scrim) { scrim.style.transition = "background 0.2s"; scrim.style.background = "rgb(0 0 0 / 0)"; }
      springAnimate(el, { from: s.dy, to: s.h + 60, velocity: Math.max(0, s.v), stiffness: 420, damping: 1, build: (v) => `translateY(${v}px)` }).then(onClose);
    } else {
      if (scrim) { scrim.style.transition = "background 0.3s"; scrim.style.background = ""; }
      springAnimate(el, { from: s.dy, to: 0, velocity: s.v, stiffness: 700, damping: 0.8, build: (v) => `translateY(${v}px)` }).then(() => { el.style.transform = ""; });
      if (Math.abs(s.dy) > 6) hap.snap();
    }
  };
  return { sheet, handlers: { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up } };
}

/** Bottom sheet. Closes on scrim tap, Escape and drag-down. */
/** When a sheet is removed by its parent, leave a short-lived copy behind that slides away and fades. */
function useSheetExit(scrimRef) {
  useLayoutEffect(() => () => {
    const el = scrimRef.current;
    if (!el || typeof document === "undefined") return;
    const sheet = el.querySelector(".sheet");
    if (!sheet || sheet.dataset.gone) return;
    const root = document.documentElement;
    if (root.dataset.motion === "reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const copy = el.cloneNode(true);
    copy.className = "scrim-ghost";
    copy.setAttribute("aria-hidden", "true");
    copy.setAttribute("inert", "");
    const cs = copy.querySelector(".sheet");
    if (cs) cs.className = "sheet-ghost";
    copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    document.body.appendChild(copy);
    setTimeout(() => copy.remove(), 230);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Sheet({ title, onClose, children, actions }) {
  const scrimRef = useRef(null);
  useSheetExit(scrimRef);
  useEffect(() => lockScroll(), []);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }; // the view underneath must not also react
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const { sheet, handlers } = useSheetDrag(onClose);
  return (
    <div className="scrim" ref={scrimRef} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={sheet}>
        <div className="sheet-head" {...handlers}>
          <div className="sheet-grab" />
          {title && <h2>{title}</h2>}
        </div>
        <div className="stack">{children}</div>
        {actions && <div className="stack" style={{ marginTop: 18 }}>{actions}</div>}
      </div>
    </div>
  );
}

/** Promise-style confirm dialog via context. */
export function ConfirmSheet({ options, onResolve }) {
  const { title, body, confirm = "Confirm", cancel = "Cancel", danger } = options;
  return (
    <Sheet title={title} onClose={() => onResolve(false)}
      actions={<>
        <button className={`btn btn-block ${danger ? "btn-danger" : "btn-primary"}`} onClick={() => onResolve(true)}>{confirm}</button>
        {cancel && <button className="btn btn-block btn-soft" onClick={() => onResolve(false)}>{cancel}</button>}
      </>}>
      {typeof body === "string" ? <p className="dim">{body}</p> : body}
    </Sheet>
  );
}

export function Toasts({ items, dismiss }) {
  return (
    <div className="toast-wrap" aria-live="polite">
      {items.slice(-1).map((t) => (
        <div className="toast" key={t.id} role="status">
          <span>{t.text}</span>
          {t.action && <button onClick={() => { t.action.run(); dismiss(t.id); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());
  const dismiss = useCallback((id) => {
    setItems((x) => x.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);
  const toast = useCallback((text, { action, ms = 4500 } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, text, action }]);
    if (ms > 0) timers.current.set(id, setTimeout(() => dismiss(id), ms));
    return id;
  }, [dismiss]);
  return { items, toast, dismiss };
}

/** One-shot confetti burst for finished sessions. */
export function Burst({ n = 22 }) {
  const bits = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (-90 + (Math.random() - 0.5) * 150) * (Math.PI / 180);
    const d = 110 + Math.random() * 190;
    return {
      "--x": `${Math.cos(a) * d}px`, "--y": `${Math.sin(a) * d + 90}px`, "--r": `${(Math.random() - 0.5) * 720}deg`,
      "--d": `${Math.round(Math.random() * 90)}ms`, "--c": ["var(--primary)", "var(--sage)", "var(--sky)", "var(--sand)", "var(--rose)"][i % 5],
    };
  }), [n]);
  return <div className="burst" aria-hidden="true">{bits.map((s, i) => <i key={i} style={s} />)}</div>;
}

export function Banner({ kind = "", icon = "info", children }) {
  return (
    <div className={`banner ${kind}`} role={kind === "err" ? "alert" : undefined}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}

export function PageHead({ title, right, onBack }) {
  return (
    <div className="page-head">
      <div className="row">
        {onBack && <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon name="back" /></button>}
        <h1>{title}</h1>
      </div>
      <div className="row">{right}</div>
    </div>
  );
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
export const fmtNum = (n) => Number(n).toLocaleString("en-US");
export function fmtMinutes(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = m / 60;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)} h`;
}
