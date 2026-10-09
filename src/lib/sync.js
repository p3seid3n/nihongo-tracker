// Cloud sync. Offline-first: the app always works from local data; sync merges slices
// with the server (one row per slice) using optimistic concurrency (rev numbers).
import { deepEqual } from "./merge.js";

const TABLE = "app_data";
const clone = (x) => JSON.parse(JSON.stringify(x));

/** In-memory remote, used by tests and as a reference implementation. */
export function memoryRemote() {
  const rows = new Map();
  return {
    rows,
    failNextPut: 0,
    async list() { return [...rows].map(([key, v]) => ({ key, rev: v.rev })); },
    async get(keys) { return keys.filter((k) => rows.has(k)).map((k) => ({ key: k, rev: rows.get(k).rev, data: clone(rows.get(k).data) })); },
    async put(key, data, expectedRev) {
      if (this.failNextPut > 0) { this.failNextPut--; return { ok: false }; }
      const cur = rows.get(key);
      if (expectedRev == null) {
        if (cur) return { ok: false };
        rows.set(key, { rev: 1, data: clone(data) });
        return { ok: true, rev: 1 };
      }
      if (!cur || cur.rev !== expectedRev) return { ok: false };
      rows.set(key, { rev: expectedRev + 1, data: clone(data) });
      return { ok: true, rev: expectedRev + 1 };
    },
    async del(keys) { keys.forEach((k) => rows.delete(k)); },
  };
}

/** Supabase-backed remote. Table schema: see supabase.sql */
export function supabaseRemote(client) {
  return {
    async list() {
      const { data, error } = await client.from(TABLE).select("key,rev");
      if (error) throw error;
      return data;
    },
    async get(keys) {
      const out = [];
      for (let i = 0; i < keys.length; i += 6) {
        const { data, error } = await client.from(TABLE).select("key,rev,data").in("key", keys.slice(i, i + 6));
        if (error) throw error;
        out.push(...data);
      }
      return out;
    },
    async put(key, data, expectedRev) {
      if (expectedRev == null) {
        const { error } = await client.from(TABLE).insert({ key, data, rev: 1 });
        if (!error) return { ok: true, rev: 1 };
        if (error.code === "23505") return { ok: false };
        throw error;
      }
      const { data: rows, error } = await client.from(TABLE).update({ data, rev: expectedRev + 1 }).eq("key", key).eq("rev", expectedRev).select("rev");
      if (error) throw error;
      return rows && rows.length ? { ok: true, rev: expectedRev + 1 } : { ok: false };
    },
    async del(keys) {
      const { error } = await client.from(TABLE).delete().in("key", keys);
      if (error) throw error;
    },
  };
}

/**
 * Two-way sync. Safe to call repeatedly and concurrently with local edits.
 * Returns { pulled, pushed }.
 */
export async function syncStore(store, remote) {
  const report = { pulled: 0, pushed: 0 };
  const meta = store.meta;
  meta.revs = meta.revs || {};
  meta.dirty = meta.dirty || {};

  if (meta.pendingDelete?.length) {
    await remote.del(meta.pendingDelete);
    for (const k of meta.pendingDelete) delete meta.revs[k];
    meta.pendingDelete = [];
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const list = await remote.list();
    const remoteRevs = new Map(list.map((x) => [x.key, x.rev]));

    // Pull everything that changed on the server since we last saw it.
    const toPull = list.filter((x) => meta.revs[x.key] !== x.rev).map((x) => x.key);
    if (toPull.length) {
      const rows = await remote.get(toPull);
      for (const row of rows) {
        const merged = store.applyRemote(row.key, row.data);
        meta.revs[row.key] = row.rev;
        remoteRevs.set(row.key, row.rev);
        report.pulled++;
        if (!deepEqual(merged, row.data)) meta.dirty[row.key] = true;
      }
    }

    // Anything we have that the server has never seen must be uploaded.
    for (const key of store.sliceKeys()) {
      if (!remoteRevs.has(key) && store.getSlice(key) !== undefined) meta.dirty[key] = true;
    }

    let conflict = false;
    for (const key of Object.keys(meta.dirty)) {
      const data = store.getSlice(key);
      if (data === undefined || (Array.isArray(data) && data.length === 0) ) { delete meta.dirty[key]; continue; }
      const seq = store.seq[key] || 0;
      const res = await remote.put(key, data, remoteRevs.has(key) ? remoteRevs.get(key) : null);
      if (res.ok) {
        meta.revs[key] = res.rev;
        remoteRevs.set(key, res.rev);
        if ((store.seq[key] || 0) === seq) delete meta.dirty[key];
        report.pushed++;
      } else {
        conflict = true;
        delete meta.revs[key]; // force a re-pull
      }
    }
    if (!conflict) {
      meta.lastSync = Date.now();
      store._persist("meta");
      store.emit();
      return report;
    }
  }
  throw new Error("Sync kept conflicting with another device. Try again in a moment.");
}
