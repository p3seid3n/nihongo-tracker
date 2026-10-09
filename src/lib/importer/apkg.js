// Anki .apkg importer. Everything happens on your device; the file is never uploaded.
//
// An .apkg is a zip file. Modern Anki (2.1.50+) stores the collection as
// "collection.anki21b" (a zstd-compressed SQLite database) and leaves a placeholder
// "collection.anki2" behind. Media files make up almost all of the size, so we stream
// through the zip in chunks and only keep the small collection file.
import { Unzip, UnzipInflate, UnzipPassThrough, unzipSync } from "fflate";
import { decompress as zstdDecompress } from "fzstd";
import { DAY, monthKey } from "../time.js";

const WANTED = ["collection.anki21b", "collection.anki21", "collection.anki2"];

function concat(chunks) {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export async function extractCollection(file, onProgress = () => {}) {
  const found = {};
  let failure = null;
  try {
    const un = new Unzip();
    un.register(UnzipInflate);
    un.register(UnzipPassThrough);
    un.onfile = (f) => {
      if (!WANTED.includes(f.name)) return;
      const chunks = [];
      f.ondata = (err, chunk, final) => {
        if (err) { failure = err; return; }
        chunks.push(chunk);
        if (final) found[f.name] = concat(chunks);
      };
      f.start();
    };
    const CH = 8 * 1024 * 1024;
    for (let off = 0; off < file.size; off += CH) {
      const buf = new Uint8Array(await file.slice(off, Math.min(file.size, off + CH)).arrayBuffer());
      un.push(buf, off + CH >= file.size);
      if (failure) throw failure;
      onProgress(Math.min(1, (off + CH) / file.size));
    }
  } catch (e) {
    // Fallback: whole-file unzip (works for odd zips, needs more memory)
    if (file.size > 600 * 1024 * 1024) throw new Error("This file is too large to open on this device. Export your decks one by one instead.");
    try {
      const all = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => WANTED.includes(f.name) });
      Object.assign(found, all);
    } catch (e2) {
      throw new Error("Could not open this file as an Anki package (.apkg): " + (e2.message || e2));
    }
  }
  onProgress(1);
  return found;
}

export function pickDatabase(found) {
  if (found["collection.anki21b"]) {
    try {
      return { bytes: zstdDecompress(found["collection.anki21b"]), name: "collection.anki21b" };
    } catch (e) {
      throw new Error("The collection inside the package is damaged (could not decompress).");
    }
  }
  if (found["collection.anki21"]) return { bytes: found["collection.anki21"], name: "collection.anki21" };
  if (found["collection.anki2"]) return { bytes: found["collection.anki2"], name: "collection.anki2" };
  throw new Error("No Anki collection found in this file. Is it an .apkg export?");
}

// ---------------------------------------------------------------------------
const ENT = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
export function cleanText(s, { breaks = false } = {}) {
  s = String(s ?? "");
  s = s.replace(/\[sound:[^\]]*\]/g, "").replace(/<img[^>]*>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, breaks ? "\n" : " ").replace(/<\/(div|p|li)>/gi, breaks ? "\n" : " ");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENT[m]);
  s = s.replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, "$1");
  s = s.replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

function hash36(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
export function deckIdFor(name) {
  const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
  return `imp-${slug || "deck"}-${hash36(name)}`;
}

/** Map one note to our card shape. */
export function mapNote(modelName, fieldNames, fields, deckName) {
  const by = {};
  fieldNames.forEach((n, i) => { by[n.toLowerCase()] = fields[i] ?? ""; });
  const get = (...names) => { for (const n of names) if (by[n] != null && by[n] !== "") return by[n]; return ""; };
  const mn = (modelName || "").toLowerCase();
  const dn = (deckName || "").toLowerCase();

  if ("kanji" in by && "keyword" in by || mn.includes("heisig")) {
    return {
      kind: "kanji",
      f: cleanText(get("kanji", fieldNames[0]?.toLowerCase())),
      r: "",
      m: cleanText(get("keyword", "meaning")),
      x: compact({
        story: cleanText(get("my story", "story"), { breaks: true }),
        strokes: cleanText(get("stroke count")),
        num: cleanText(get("heisig number", "number")),
      }),
    };
  }
  if ("word" in by && ("word meaning" in by || "meaning" in by)) {
    return {
      kind: "vocab",
      f: cleanText(by["word"]),
      r: cleanText(get("word reading", "reading")),
      m: cleanText(get("word meaning", "meaning")),
      x: compact({
        sent: cleanText(get("sentence")),
        sentF: cleanText(get("sentence furigana")),
        sentE: cleanText(get("sentence meaning")),
        notes: cleanText(get("notes"), { breaks: true }),
        freq: cleanText(get("frequency")),
      }),
    };
  }
  if (("kana" in by && "romaji" in by) || mn.includes("hiragana") || mn.includes("katakana") || dn.includes("hiragana") || dn.includes("katakana")) {
    const f = cleanText(fields[0]);
    const back = cleanText(fields[1], { breaks: true });
    const first = back.split("\n")[0] || "";
    const romaji = first.normalize("NFKC").toLowerCase().replace(/[^a-z]/g, "") || first;
    const story = back.split("\n").slice(1).join("\n") || cleanText(get("mnemonic text"), { breaks: true });
    return { kind: "kana", f, r: romaji, m: romaji, x: compact({ story }) };
  }
  const kindByDeck = /kanji|rtk|heisig|kodansha/.test(dn) ? "kanji" : "vocab";
  const front = cleanText(fields[0]);
  const back = cleanText(fields[1] ?? "", { breaks: true });
  return { kind: kindByDeck, f: front || cleanText(fields[1] ?? ""), r: "", m: back, x: {} };
}

function compact(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v) out[k] = v;
  return out;
}

function easeToD(factor, lapses) {
  const ease = factor > 0 ? factor / 1000 : 2.5;
  const d = 10 - ((Math.min(3.0, Math.max(1.3, ease)) - 1.3) / 1.7) * 9; // 1.3 -> 10, 3.0 -> 1
  return Math.min(10, Math.max(1, d + Math.min(2, (lapses || 0) * 0.3)));
}

function safeJSON(s) {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

/** Convert an Anki card row to our scheduling record (null for new cards). */
export function convertSchedule(c, crtSec) {
  const dayMs = (d) => (crtSec + d * 86400) * 1000;
  const data = safeJSON(c.data);
  const mod = (c.mod || 0) * 1000;
  const sus = c.queue === -1 ? 1 : 0;
  if (c.type === 0) return sus ? { st: 0, s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0, step: 0, sus: 1, u: mod } : null;
  const ivl = c.ivl > 0 ? c.ivl : 1;
  const s = Math.max(0.1, typeof data.s === "number" ? data.s : ivl);
  const d = Math.min(10, Math.max(1, typeof data.d === "number" ? data.d : easeToD(c.factor, c.lapses)));
  let due;
  if (c.type === 1 && c.queue === 1) due = c.due * 1000;
  else due = dayMs(c.due);
  if (!(due > 0) || !isFinite(due)) due = Date.now();
  const st = c.type === 1 ? 1 : c.type === 3 ? 3 : 2;
  const last = typeof data.lrt === "number" ? data.lrt * 1000 : st === 2 ? due - ivl * DAY : due - 10 * 60 * 1000;
  const rec = { st, s, d, due, last: Math.min(last, due), reps: c.reps || 0, lapses: c.lapses || 0, step: 0, ivl: st === 2 ? ivl : 0, imp: 1, u: mod || Date.now() };
  if (sus) rec.sus = 1;
  return rec;
}

// ---------------------------------------------------------------------------
/**
 * Read an opened SQLite database (sql.js) and produce importable decks.
 * Returns { decks: [{id,name,kind,content,prog,count,newCount,reviewedCount}], revlog, warnings }
 */
export function parseCollection(SQL, bytes, { maxRevlog = 200000 } = {}) {
  const db = new SQL.Database(bytes);
  try {
    const exec = (sql) => { const r = db.exec(sql); return r.length ? r[0].values : []; };
    const hasTable = (n) => exec(`select 1 from sqlite_master where name='${n}'`).length > 0;
    const warnings = [];

    // decks and note types (new schema has tables, old schema stores JSON in `col`)
    const deckNames = new Map();
    const models = new Map();
    let crt = 0;
    if (hasTable("notetypes")) {
      exec("select id, name from decks").forEach(([id, name]) => deckNames.set(Number(id), String(name)));
      const fieldsBy = new Map();
      exec("select ntid, ord, name from fields order by ntid, ord").forEach(([ntid, , name]) => {
        const k = Number(ntid);
        if (!fieldsBy.has(k)) fieldsBy.set(k, []);
        fieldsBy.get(k).push(String(name));
      });
      exec("select id, name from notetypes").forEach(([id, name]) => models.set(Number(id), { name: String(name), fields: fieldsBy.get(Number(id)) || [] }));
      crt = Number(exec("select crt from col")[0]?.[0] || 0);
    } else {
      const row = exec("select crt, decks, models from col")[0];
      if (!row) throw new Error("This collection has no data.");
      crt = Number(row[0]);
      const d = JSON.parse(row[1]), m = JSON.parse(row[2]);
      Object.entries(d).forEach(([id, v]) => deckNames.set(Number(id), v.name));
      Object.entries(m).forEach(([id, v]) => models.set(Number(id), { name: v.name, fields: (v.flds || []).map((f) => f.name) }));
    }

    const notes = new Map();
    exec("select id, mid, flds from notes").forEach(([id, mid, flds]) => notes.set(Number(id), { mid: Number(mid), flds: String(flds).split("\x1f") }));

    if (notes.size === 1) {
      const only = [...notes.values()][0];
      if (/update to the latest anki/i.test(only.flds.join(" "))) {
        throw new Error("This export only contains a placeholder. Re-export from Anki and untick “Support older Anki versions”.");
      }
    }

    const cardRows = exec("select id, nid, did, odid, ord, type, queue, due, ivl, factor, reps, lapses, data, mod from cards");
    // one card per note: the lowest template number
    const best = new Map();
    for (const r of cardRows) {
      const [id, nid, did, odid, ord, type, queue, due, ivl, factor, reps, lapses, data, mod] = r;
      const cur = best.get(Number(nid));
      if (!cur || Number(ord) < cur.ord) {
        best.set(Number(nid), { id: Number(id), nid: Number(nid), did: Number(odid) ? Number(odid) : Number(did), ord: Number(ord), type: Number(type), queue: Number(queue), due: Number(due), ivl: Number(ivl), factor: Number(factor), reps: Number(reps), lapses: Number(lapses), data: String(data || ""), mod: Number(mod) });
      }
    }

    // group by top-level deck
    const groups = new Map();
    for (const c of best.values()) {
      const note = notes.get(c.nid);
      if (!note) continue;
      const full = deckNames.get(c.did) || "Imported";
      const top = full.split("\x1f")[0];
      if (!groups.has(top)) groups.set(top, []);
      groups.get(top).push({ c, note, full });
    }

    const decks = [];
    for (const [name, items] of groups) {
      const id = deckIdFor(name);
      // study order: cards already started first (by note id), then new cards by their position
      items.sort((a, b) => {
        const an = a.c.type === 0 ? 1 : 0, bn = b.c.type === 0 ? 1 : 0;
        if (an !== bn) return an - bn;
        if (an === 1) return a.c.due - b.c.due || a.c.nid - b.c.nid;
        return a.c.nid - b.c.nid;
      });
      const content = {}, prog = {};
      const kinds = {};
      let o = 0, newCount = 0, started = 0;
      for (const { c, note } of items) {
        const model = models.get(note.mid) || { name: "", fields: [] };
        const m = mapNote(model.name, model.fields, note.flds, name);
        if (!m.f) continue;
        const cid = `${id}.${c.nid}`;
        content[cid] = { f: m.f, r: m.r, m: m.m, x: m.x, o: o++ };
        kinds[m.kind] = (kinds[m.kind] || 0) + 1;
        const rec = convertSchedule(c, crt);
        if (rec) { prog[cid] = rec; if (rec.st !== 0) started++; }
        if (c.type === 0) newCount++;
      }
      const count = Object.keys(content).length;
      if (!count) continue;
      const kind = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0];
      decks.push({ id, name: name === "Default" ? "Imported cards" : name, kind, content, prog, count, newCount, started });
    }

    // review history
    const revlog = [];
    if (hasTable("revlog")) {
      const seen = new Set();
      const nidByCid = new Map();
      for (const r of cardRows) nidByCid.set(Number(r[0]), { nid: Number(r[1]), did: Number(r[3]) ? Number(r[3]) : Number(r[2]) });
      const deckIdByCid = new Map();
      for (const [cid, { did, nid }] of nidByCid) {
        const top = (deckNames.get(did) || "Imported").split("\x1f")[0];
        deckIdByCid.set(cid, `${deckIdFor(top)}.${nid}`);
      }
      const rows = exec(`select id, cid, ease, ivl, time, type from revlog order by id limit ${maxRevlog}`);
      for (const [id, cid, ease, ivl, time, type] of rows) {
        const ease_ = Number(ease), type_ = Number(type);
        if (ease_ < 1 || ease_ > 4 || type_ > 2) continue;
        const key = deckIdByCid.get(Number(cid));
        if (!key) continue;
        const first = !seen.has(key);
        seen.add(key);
        const stBefore = type_ === 1 ? 2 : type_ === 2 ? 3 : first ? 0 : 1;
        revlog.push([Number(id), key, ease_, Math.min(Number(time) || 0, 120000), stBefore, Number(ivl) > 0 ? Number(ivl) : 0]);
      }
    }

    return { decks, revlog, warnings };
  } finally {
    db.close();
  }
}

/** Full pipeline used by the UI. `loadSQL` returns the sql.js module. */
export async function parseApkg(file, loadSQL, onProgress = () => {}) {
  onProgress({ phase: "unzip", value: 0 });
  const found = await extractCollection(file, (v) => onProgress({ phase: "unzip", value: v }));
  onProgress({ phase: "open", value: 0 });
  const { bytes } = pickDatabase(found);
  let SQL;
  try {
    SQL = await loadSQL();
  } catch (e) {
    throw new Error("The database engine failed to start: " + (e && e.message ? e.message : e));
  }
  onProgress({ phase: "read", value: 0 });
  const result = parseCollection(SQL, bytes);
  onProgress({ phase: "done", value: 1 });
  return result;
}

/** Add the parsed data to the store. selection: { [deckId]: { include, known } } */
export function applyImport(store, parsed, selection, { includeHistory = true } = {}) {
  const chosen = parsed.decks.filter((d) => selection[d.id]?.include);
  let added = 0;
  const importedIds = new Set();
  chosen.forEach((d, i) => {
    const existing = store.decks[d.id] && !store.decks[d.id].del;
    store.addDeck({ id: d.id, name: d.name, kind: d.kind, order: existing ? store.decks[d.id].order : store.deckList().length + i }, d.content);
    importedIds.add(d.id);
    // scheduling info from Anki (only fills cards that have no newer local state)
    if (Object.keys(d.prog).length) {
      const prog = (store.prog[d.id] = store.prog[d.id] || {});
      for (const [cid, rec] of Object.entries(d.prog)) {
        const cur = prog[cid];
        if (!cur || cur.st === 0 || (rec.u || 0) > (cur.u || 0)) prog[cid] = rec;
      }
      store.touch(`prog:${d.id}`);
    }
    const known = selection[d.id]?.known || 0;
    if (known > 0) store.markKnown(d.id, known);
    added += d.count;
  });
  if (includeHistory && parsed.revlog.length) {
    const byMonth = new Map();
    for (const row of parsed.revlog) {
      if (!importedIds.has(row[1].slice(0, row[1].indexOf(".")))) continue;
      const m = monthKey(row[0]);
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push(row);
    }
    for (const [m, rows] of byMonth) {
      store.applyRemote(`log:${m}`, rows);
      store.touch(`log:${m}`);
    }
  }
  store.emit();
  return added;
}

