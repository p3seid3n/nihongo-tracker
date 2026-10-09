import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons.jsx";

export const AppCtx = createContext(null);
export const useApp = () => {
  const ctx = useContext(AppCtx);
  // re-render on every store change
  useSyncExternalStore(ctx.store.subscribe, ctx.store.getVersion);
  useSyncExternalStore(ctx.sync.subscribe, ctx.sync.getVer);
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
    <div className="seg" role="group" aria-label={label}>
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
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle className="value" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

/** Bottom sheet. Closes on scrim tap and Escape. */
export function Sheet({ title, onClose, children, actions }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" />
        {title && <h2 style={{ marginBottom: 12 }}>{title}</h2>}
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
