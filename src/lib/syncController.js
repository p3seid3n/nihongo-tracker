// Keeps the store and the cloud in step: syncs on start, when you come back to the app,
// when the network returns, and a few seconds after you change something.
import { syncStore } from "./sync.js";

export class SyncController {
  constructor(store, getRemote) {
    this.store = store;
    this.getRemote = getRemote; // () => remote | null
    this.status = "off"; // off | idle | syncing | ok | offline | error
    this.error = null;
    this.ver = 0;
    this.listeners = new Set();
    this.timer = null;
    this.running = false;
    this.queued = false;
    this.enabled = false;
    this._unsub = null;
    this._onVisible = () => { if (document.visibilityState === "visible") this.schedule(500); };
    this._onOnline = () => this.schedule(300);
  }

  subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getVer = () => this.ver;
  _set(status, error = null) { this.status = status; this.error = error; this.ver++; this.listeners.forEach((l) => l()); }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this._set("idle");
    this._unsub = this.store.subscribe(() => {
      if (this.enabled && !this.running && Object.keys(this.store.meta.dirty || {}).length) this.schedule(8000);
    });
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._onVisible);
      window.addEventListener("online", this._onOnline);
    }
    this.schedule(200);
  }

  stop() {
    this.enabled = false;
    clearTimeout(this.timer);
    this._unsub?.();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this._onVisible);
      window.removeEventListener("online", this._onOnline);
    }
    this._set("off");
  }

  schedule(delay = 0) {
    if (!this.enabled) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), delay);
  }

  async run() {
    if (!this.enabled) return null;
    if (this.running) { this.queued = true; return null; }
    const remote = this.getRemote();
    if (!remote) return null;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { this._set("offline"); return null; }
    this.running = true;
    this._set("syncing");
    try {
      await this.store.flush();
      const report = await syncStore(this.store, remote);
      await this.store.flush();
      this._set("ok");
      return report;
    } catch (e) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      this._set(offline ? "offline" : "error", e);
      return null;
    } finally {
      this.running = false;
      if (this.queued) { this.queued = false; this.schedule(1000); }
    }
  }
}
