// Starts a weight fit in a Web Worker (or on the main thread in small slices when workers are not available).
import { optimize } from "./optimize.js";

/** Returns { promise, cancel }. The promise resolves with optimize()'s result, or { cancelled: true }. */
export function runOptimize(rows, current, onProgress) {
  let cancelled = false;
  let worker = null;
  let finish;
  const promise = new Promise((resolve, reject) => {
    finish = { resolve, reject };
    const fallback = () => {
      optimize(rows, current, {
        onProgress,
        shouldStop: () => cancelled,
        yieldFn: () => new Promise((r) => setTimeout(r, 0)),
      }).then((res) => resolve(cancelled ? { cancelled: true } : res), reject);
    };
    if (typeof Worker === "undefined") { fallback(); return; }
    try {
      worker = new Worker(new URL("./optimize.worker.js", import.meta.url), { type: "module" });
    } catch { worker = null; fallback(); return; }
    let started = false;
    worker.onmessage = (e) => {
      started = true;
      const m = e.data || {};
      if (m.type === "progress") onProgress && onProgress(m.p);
      else if (m.type === "done") { worker.terminate(); resolve(m.res); }
      else if (m.type === "error") { worker.terminate(); reject(new Error(m.message)); }
    };
    worker.onerror = () => { // the worker could not start (blocked or unsupported): do it here instead
      if (started || cancelled) return;
      try { worker.terminate(); } catch {}
      worker = null; fallback();
    };
    worker.postMessage({ rows, current });
  });
  return {
    promise,
    cancel() {
      cancelled = true;
      if (worker) { try { worker.terminate(); } catch {} worker = null; finish.resolve({ cancelled: true }); }
    },
  };
}
