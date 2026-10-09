// App data store: in-memory state + IndexedDB persistence + dirty tracking for sync.
// Every top-level "slice" (settings, decks, lessons, prog:<deck>, content:<deck>, log:<month>)
// is persisted under its own key and synced to the cloud under the same key.
import { createStore as idbCreateStore, keys as idbKeys, getMany, setMany, delMany } from "idb-keyval";
import { DEFAULT_CFG, review as fsrsReview, NEW, REVIEW } from "./fsrs.js";
import { addDays, dayKey, monthKey, DAY } from "./time.js";
import { mergeSlice, sliceKind } from "./merge.js";
import { uuid, deckOf } from "./ids.js";
import { KANA_DECKS, kanaContent } from "./kana.js";

export const SCHEMA_VERSION = 4;
const PREFIX = "nt4:";

export const DEFAULT_SETTINGS = {
  name: "",
  onboarded: false,
  level: "beginner", // beginner | basics | intermediate | advanced
  focus: "full", // full | conversation | kanji | vocab | maintain
  tracks: { kana: true, kanji: true, vocab: true, grammar: true },
  minutes: 20,
  retention: 0.9,
  maxReviews: 200,
  newPerDay: { kana: 10, kanji: 8, vocab: 8, generic: 8 },
  furigana: "auto", // auto | always | never
  theme: "dark", // dark | light | system
  haptics: true,
  motion: "full",
  u: 0,
};

// ---------------------------------------------------------------------------
// Storage backends
export function idbBackend() {
  const st = idbCreateStore("nihongo-tracker", "kv");
  return {
    persistent: true,
    async load() {
      const ks = (await idbKeys(st)).filter((k) => typeof k === "string" && k.startsWith(PREFIX));
      const vals = await getMany(ks, st);
      return new Map(ks.map((k, i) => [k.slice(PREFIX.length), vals[i]]));
    },
    async save(entries) {
      await setMany(entries.map(([k, v]) => [PREFIX + k, v]), st);
    },
    async remove(ks) {
      await delMany(ks.map((k) => PREFIX + k), st);
    },
  };
}

export function memoryBackend(initial) {
  const m = new Map(initial || []);
  return {
    persistent: false,
    async load() { return new Map(m); },
    async save(entries) { for (const [k, v] of entries) m.set(k, JSON.parse(JSON.stringify(v))); },
    async remove(ks) { ks.forEach((k) => m.delete(k)); },
    _map: m,
  };
}

// ---------------------------------------------------------------------------
export class Store {
  constructor(backend, { autosave = true } = {}) {
    this.backend = backend;
    this.autosave = autosave;
    this.version = 0;
    this.listeners = new Set();
    this.settings = { ...DEFAULT_SETTINGS };
    this.decks = {};
    this.lessons = {};
    this.prog = {}; // deckId -> { cardId: rec }
    this.content = {}; // deckId -> { cardId: {f,r,m,x,o} }
    this.log = {}; // "YYYY-MM" -> rows
    this.meta = { deviceId: uuid(), owner: null, revs: {}, dirty: {}, lastSync: 0, pendingDelete: [], v: SCHEMA_VERSION, createdAt: Date.now() };
    this.persistDirty = new Set();
    this.persistRemove = new Set();
    this.saveTimer = null;
    this.saveError = null;
    this._orderCache = new Map();
    this.seq = {}; // per-slice local change counter (used by sync)
    this.loaded = false;
  }

  // ---- reactivity
  subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getVersion = () => this.version;
  emit() { this.version++; this.listeners.forEach((l) => { try { l(); } catch (e) { console.error(e); } }); }

  // ---- load / save
  async load() {
    const all = await this.backend.load();
    for (const [key, data] of all) this._setSlice(key, data, false);
    const meta = all.get("meta");
    if (meta) this.meta = { ...this.meta, ...meta };
    this.settings = { ...DEFAULT_SETTINGS, ...this.settings, tracks: { ...DEFAULT_SETTINGS.tracks, ...(this.settings.tracks || {}) }, newPerDay: { ...DEFAULT_SETTINGS.newPerDay, ...(this.settings.newPerDay || {}) } };
    if (!all.has("meta")) this._persist("meta");
    this.loaded = true;
    this.emit();
  }

  _persist(key) {
    this.persistDirty.add(key);
    this.persistRemove.delete(key);
    if (!this.autosave) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 700);
  }

  async flush() {
    clearTimeout(this.saveTimer);
    if (this.persistDirty.size === 0 && this.persistRemove.size === 0) return;
    const keys = [...this.persistDirty];
    const rem = [...this.persistRemove];
    this.persistDirty.clear();
    this.persistRemove.clear();
    try {
      const entries = keys.map((k) => [k, k === "meta" ? this.meta : this.getSlice(k)]).filter(([, v]) => v !== undefined);
      if (entries.length) await this.backend.save(entries);
      if (rem.length) await this.backend.remove(rem);
      if (this.saveError) { this.saveError = null; this.emit(); }
    } catch (e) {
      keys.forEach((k) => this.persistDirty.add(k));
      this.saveError = e;
      console.error("save failed", e);
      this.emit();
    }
  }

  /** Mark a slice as changed locally: persist it and queue it for sync. */
  touch(key) {
    this.meta.dirty[key] = true;
    this.seq[key] = (this.seq[key] || 0) + 1;
    this._persist(key);
    this._persist("meta");
  }

  // ---- slices (shared shape with the cloud)
  getSlice(key) {
    const kind = sliceKind(key);
    const id = key.slice(kind.length + 1);
    switch (kind) {
      case "settings": return this.settings;
      case "decks": return this.decks;
      case "lessons": return this.lessons;
      case "prog": return this.prog[id];
      case "content": return this.content[id];
      case "log": return this.log[id];
      default: return undefined;
    }
  }

  _setSlice(key, data, mark = true) {
    const kind = sliceKind(key);
    const id = key.slice(kind.length + 1);
    switch (kind) {
      case "settings": this.settings = data; break;
      case "decks": this.decks = data; break;
      case "lessons": this.lessons = data; break;
      case "prog": this.prog[id] = data; break;
      case "content": this.content[id] = data; this._orderCache.delete(id); break;
      case "log": this.log[id] = data; break;
      default: return;
    }
    if (mark) this._persist(key);
  }

  /** All slice keys that exist locally (for first upload and backups). */
  sliceKeys() {
    const ks = ["settings", "decks", "lessons"];
    Object.keys(this.prog).forEach((d) => ks.push(`prog:${d}`));
    Object.keys(this.content).forEach((d) => ks.push(`content:${d}`));
    Object.keys(this.log).forEach((m) => ks.push(`log:${m}`));
    return ks;
  }

  /** Merge data that arrived from the cloud or a backup. Returns the merged slice. */
  applyRemote(key, remote) {
    const local = this.getSlice(key);
    let merged = mergeSlice(key, local, remote);
    this._setSlice(key, merged);
    if (sliceKind(key) === "decks") this._applyDeckTombstones();
    this.emit();
    return merged;
  }

  _applyDeckTombstones() {
    for (const d of Object.values(this.decks)) {
      if (d.del) {
        if (this.content[d.id]) { delete this.content[d.id]; this._orderCache.delete(d.id); this.persistDirty.delete(`content:${d.id}`); this.persistRemove.add(`content:${d.id}`); }
        if (this.prog[d.id]) { delete this.prog[d.id]; this.persistDirty.delete(`prog:${d.id}`); this.persistRemove.add(`prog:${d.id}`); }
        delete this.meta.dirty[`content:${d.id}`];
        delete this.meta.dirty[`prog:${d.id}`];
      }
    }
  }

  // ---- helpers
  fsrsCfg() { return { ...DEFAULT_CFG, retention: this.settings.retention || 0.9 }; }
  lessonCfg() { return { ...DEFAULT_CFG, retention: this.settings.retention || 0.9, learningSteps: [], relearningSteps: [], fuzz: false }; }

  deckList({ includeDeleted = false } = {}) {
    return Object.values(this.decks)
      .filter((d) => includeDeleted || !d.del)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }

  /** Card ids of a deck in study order. */
  cardIds(deckId) {
    const c = this.content[deckId];
    if (!c) return [];
    const cached = this._orderCache.get(deckId);
    if (cached && cached.ref === c && cached.n === Object.keys(c).length) return cached.ids;
    const ids = Object.keys(c).sort((a, b) => (c[a].o ?? 0) - (c[b].o ?? 0) || (a < b ? -1 : 1));
    this._orderCache.set(deckId, { ref: c, n: ids.length, ids });
    return ids;
  }

  card(cardId) {
    const d = deckOf(cardId);
    return this.content[d]?.[cardId] || null;
  }
  rec(cardId) {
    return this.prog[deckOf(cardId)]?.[cardId] || null;
  }

  /** Remember which account this device's data belongs to. */
  setOwner(uid) {
    this.meta.owner = uid || null;
    this._persist("meta");
    this.emit();
  }

  // ---- settings
  updateSettings(patch) {
    this.settings = { ...this.settings, ...patch, u: Date.now() };
    this.touch("settings");
    this.emit();
  }

  // ---- decks
  addDeck(deck, content) {
    const now = Date.now();
    const order = deck.order ?? this.deckList({ includeDeleted: true }).length;
    const d = { newPerDay: null, enabled: true, ...deck, order, u: now };
    delete d.del;
    this.decks = { ...this.decks, [d.id]: d };
    this.touch("decks");
    if (content) {
      this.content[d.id] = { ...(this.content[d.id] || {}), ...content };
      this._orderCache.delete(d.id);
      this.touch(`content:${d.id}`);
    }
    this.emit();
    return d;
  }

  updateDeck(id, patch) {
    const d = this.decks[id];
    if (!d) return;
    this.decks = { ...this.decks, [id]: { ...d, ...patch, u: Date.now() } };
    this.touch("decks");
    this.emit();
  }

  deleteDeck(id) {
    const d = this.decks[id];
    if (!d) return;
    this.decks = { ...this.decks, [id]: { ...d, del: true, u: Date.now() } };
    this.touch("decks");
    delete this.content[id];
    delete this.prog[id];
    this._orderCache.delete(id);
    delete this.meta.dirty[`content:${id}`];
    delete this.meta.dirty[`prog:${id}`];
    this.persistDirty.delete(`content:${id}`);
    this.persistDirty.delete(`prog:${id}`);
    this.persistRemove.add(`content:${id}`);
    this.persistRemove.add(`prog:${id}`);
    this.meta.pendingDelete = [...new Set([...(this.meta.pendingDelete || []), `content:${id}`, `prog:${id}`])];
    this._persist("meta");
    this._persist("decks");
    this.emit();
  }

  ensureKanaDecks() {
    for (const k of KANA_DECKS) {
      if (this.decks[k.id] && !this.decks[k.id].del) continue;
      this.addDeck({ ...k, order: k.id === "kana-hira" ? 0 : 1 }, kanaContent(k.id));
    }
  }

  /** Mark the first n not-yet-started cards of a deck as already known. They come back for a
   *  quick check spread over the next `spreadDays` days instead of one big wall. */
  markKnown(deckId, n, { spreadDays = 10, stability = 6, now = Date.now(), extra = false } = {}) {
    const ids = this.cardIds(deckId);
    const prog = (this.prog[deckId] = this.prog[deckId] || {});
    let count = 0;
    for (let i = 0; i < ids.length && count < n; i++) {
      const id = ids[i];
      const cur = prog[id];
      if (cur && cur.st !== NEW) { if (!extra) count++; continue; }
      if (cur && cur.sus) continue;
      const k = count % spreadDays;
      const due = addDays(now, k);
      const last = Math.min(now, due - stability * DAY);
      prog[id] = { st: REVIEW, s: stability, d: 5, due, last, reps: 1, lapses: 0, step: 0, ivl: stability, imp: 1, u: now };
      count++;
    }
    this.touch(`prog:${deckId}`);
    this.emit();
    return count;
  }

  /** Remove "known" marks created by markKnown (never touches cards you actually reviewed). */
  clearKnown(deckId) {
    const prog = this.prog[deckId];
    if (!prog) return;
    const now = Date.now();
    for (const [id, r] of Object.entries(prog)) if (r.imp && r.reps <= 1) prog[id] = { st: NEW, s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0, step: 0, u: now };
    this.touch(`prog:${deckId}`);
    this.emit();
  }

  // ---- reviewing
  reviewCard(cardId, grade, ms = 0, now = Date.now()) {
    const deckId = deckOf(cardId);
    const prog = (this.prog[deckId] = this.prog[deckId] || {});
    const prev = prog[cardId] || null;
    const next = fsrsReview(prev, grade, now, this.fsrsCfg(), cardId);
    if (prev?.sus) next.sus = prev.sus;
    prog[cardId] = next;
    const month = monthKey(now);
    const row = [now, cardId, grade, Math.min(Math.max(0, Math.round(ms)), 120000), prev ? prev.st : NEW, next.ivl || 0];
    (this.log[month] = this.log[month] || []).push(row);
    this.touch(`prog:${deckId}`);
    this.touch(`log:${month}`);
    this.emit();
    return { cardId, prev, next, row, month, deckId };
  }

  undoReview(entry, now = Date.now()) {
    const { cardId, prev, row, month, deckId } = entry;
    const prog = (this.prog[deckId] = this.prog[deckId] || {});
    prog[cardId] = prev
      ? { ...prev, u: now }
      : { st: NEW, s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0, step: 0, u: now };
    const rows = this.log[month] || [];
    const i = rows.findIndex((r) => r[0] === row[0] && r[1] === row[1]);
    if (i >= 0) rows[i] = [row[0], row[1], 0, 0, row[4], 0];
    this.touch(`prog:${deckId}`);
    this.touch(`log:${month}`);
    this.emit();
  }

  toggleSuspend(cardId) {
    const deckId = deckOf(cardId);
    const prog = (this.prog[deckId] = this.prog[deckId] || {});
    const cur = prog[cardId] || { st: NEW, s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0, step: 0 };
    const next = { ...cur, u: Date.now() };
    if (next.sus) delete next.sus; else next.sus = 1;
    prog[cardId] = next;
    this.touch(`prog:${deckId}`);
    this.emit();
    return !!next.sus;
  }

  // ---- lessons / grammar
  /** accuracy 0..1. Returns the new lesson record. */
  recordLesson(lessonId, accuracy, { first = false, now = Date.now() } = {}) {
    const prev = this.lessons[lessonId] || null;
    let grade = accuracy < 0.6 ? 1 : accuracy < 0.8 ? 2 : accuracy < 1 ? 3 : 4;
    if (first && grade === 4) grade = 3;
    const base = prev && prev.st ? prev : null;
    const rec = fsrsReview(base, grade, now, this.lessonCfg(), lessonId);
    const passed = accuracy >= 0.6;
    const out = {
      ...rec,
      done: prev?.done || (passed ? now : 0),
      best: Math.max(prev?.best || 0, accuracy),
      tries: (prev?.tries || 0) + 1,
      u: now,
    };
    this.lessons = { ...this.lessons, [lessonId]: out };
    this.touch("lessons");
    this.emit();
    return out;
  }

  /** Record a finished lesson / grammar session in the activity log (for streaks and time). */
  logLesson(lessonId, accuracy, ms, now = Date.now()) {
    const month = monthKey(now);
    const grade = accuracy < 0.6 ? 1 : accuracy < 0.8 ? 2 : accuracy < 1 ? 3 : 4;
    (this.log[month] = this.log[month] || []).push([now, `g.${lessonId}`, grade, Math.min(Math.max(0, Math.round(ms)), 3600000), 9, 0]);
    this.touch(`log:${month}`);
    this.emit();
  }

  markLessonsDone(ids, now = Date.now()) {
    const next = { ...this.lessons };
    ids.forEach((id, i) => {
      if (next[id]?.done) return;
      const base = fsrsReview(null, 3, now, this.lessonCfg(), id);
      // assumed knowledge: due spread over the next week so a quick check follows
      const due = addDays(now, 3 + (i % 7));
      next[id] = { ...base, due, done: now, best: 1, tries: 0, imp: 1, u: now };
    });
    this.lessons = next;
    this.touch("lessons");
    this.emit();
  }

  // ---- backup
  exportBackup() {
    const slices = {};
    for (const k of this.sliceKeys()) slices[k] = this.getSlice(k);
    return { app: "nihongo-tracker", v: SCHEMA_VERSION, exportedAt: Date.now(), slices };
  }

  importBackup(json) {
    if (!json || json.app !== "nihongo-tracker" || typeof json.slices !== "object") throw new Error("This file is not a Nihongo Tracker backup.");
    let n = 0;
    for (const [key, data] of Object.entries(json.slices)) {
      if (!["settings", "decks", "lessons", "prog", "content", "log"].includes(sliceKind(key))) continue;
      if (data == null) continue;
      this.applyRemote(key, data);
      this.touch(key);
      n++;
    }
    this._applyDeckTombstones();
    return n;
  }

  async resetAll() {
    clearTimeout(this.saveTimer);
    const ks = [...(await this.backend.load()).keys()];
    await this.backend.remove(ks);
    this.settings = { ...DEFAULT_SETTINGS };
    this.decks = {}; this.lessons = {}; this.prog = {}; this.content = {}; this.log = {};
    this.meta = { deviceId: uuid(), owner: null, revs: {}, dirty: {}, lastSync: 0, pendingDelete: [], v: SCHEMA_VERSION, createdAt: Date.now() };
    this.persistDirty.clear(); this.persistRemove.clear();
    this._orderCache.clear();
    this._persist("meta");
    this.emit();
  }

  /** Total number of review rows (not undone). */
  logRows() {
    const out = [];
    for (const rows of Object.values(this.log)) for (const r of rows) if (r[2] > 0) out.push(r);
    return out.sort((a, b) => a[0] - b[0]);
  }
}

export { dayKey };
