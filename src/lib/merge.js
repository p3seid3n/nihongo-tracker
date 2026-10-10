// Pure merge functions used by sync and by backup import.
// Every synced slice can be merged in any order and any number of times (idempotent,
// commutative) so two devices converge without a server-side merge.

/** Compare two JSON-like values structurally. */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false;
  return true;
}

/** Pick the winner between two records: newest `u`; on a tie a deletion wins, then a stable order,
 *  so every device ends up with the same record no matter which side it merges from. */
function pickRecord(l, r) {
  if (!l) return r;
  if (!r) return l;
  const lu = l.u || 0, ru = r.u || 0;
  if (ru !== lu) return ru > lu ? r : l;
  if (!!r.del !== !!l.del) return r.del ? r : l;
  if (deepEqual(l, r)) return l;
  return JSON.stringify(r) > JSON.stringify(l) ? r : l;
}

/** Map of id -> record with a numeric `u` (updated-at). The record with the newest `u` wins. */
export function mergeLWWMap(local = {}, remote = {}) {
  const out = { ...local };
  for (const [id, r] of Object.entries(remote)) out[id] = pickRecord(out[id], r);
  return out;
}

/** A single record with `u`; the newest wins. */
export function mergeLWWObject(local, remote) {
  return pickRecord(local, remote);
}

/** Union by id; existing local entries are kept. */
export function mergeUnion(local = {}, remote = {}) {
  const out = { ...local };
  for (const [id, r] of Object.entries(remote)) if (!(id in out)) out[id] = r;
  return out;
}

/** Card content: union by id, and a card present on both sides gains the fields only the other side has
 *  (for example pitch accent after one device re-imports its deck). Where both sides have a value, local wins. */
export function mergeContent(local = {}, remote = {}) {
  const out = { ...local };
  for (const [id, r] of Object.entries(remote)) {
    const l = out[id];
    if (!l) { out[id] = r; continue; }
    if (!r || typeof r !== "object") continue;
    let changed = false;
    const merged = { ...l };
    for (const [k, v] of Object.entries(r)) {
      if (k === "x") continue;
      if (!(k in merged) || merged[k] === "" || merged[k] == null) { merged[k] = v; changed = true; }
    }
    if (r.x && typeof r.x === "object") {
      const x = { ...(l.x || {}) };
      let xc = false;
      for (const [k, v] of Object.entries(r.x)) if (!(k in x) || x[k] === "" || x[k] == null) { x[k] = v; xc = true; }
      if (xc) { merged.x = x; changed = true; }
    }
    if (changed) out[id] = merged;
  }
  return out;
}

/** Review-log rows are [ts, cardId, grade, ms, stateBefore, ivlDays]. Union by ts+card.
 *  A grade of 0 marks a row that was undone; it wins over the original. */
export function mergeLog(local = [], remote = []) {
  const map = new Map();
  const put = (row) => {
    const key = `${row[0]}|${row[1]}`;
    const cur = map.get(key);
    if (!cur || (row[2] === 0 && cur[2] !== 0)) map.set(key, row);
  };
  local.forEach(put);
  remote.forEach(put);
  return [...map.values()].sort((a, b) => a[0] - b[0] || String(a[1]).localeCompare(String(b[1])));
}

/** Pick the right merge for a slice key like "prog:kaishi" or "settings". */
export function sliceKind(key) {
  const i = key.indexOf(":");
  return i < 0 ? key : key.slice(0, i);
}

export function mergeSlice(key, local, remote) {
  switch (sliceKind(key)) {
    case "settings": return mergeLWWObject(local, remote);
    case "decks":
    case "lessons":
    case "prog": return mergeLWWMap(local, remote);
    case "content": return mergeContent(local, remote);
    case "log": return mergeLog(local, remote);
    default: return local ?? remote;
  }
}
