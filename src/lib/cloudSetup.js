// First-time setup of the cloud table without opening the Supabase dashboard.
// The Vercel Function api/setup-sync.js creates the table; this side notices when it is missing,
// asks for it once, waits for Supabase to pick it up, and lets the failed request run again.

/** Did a Supabase/PostgREST error come from the table not existing yet? */
export function isMissingTable(e) {
  if (!e) return false;
  const code = String(e.code || "");
  const msg = String(e.message || "");
  return code === "PGRST205" || code === "42P01" || /Could not find the table|relation .*app_data.* does not exist|schema cache/i.test(msg);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ask the server to create the table. Resolves { ok, created, reason, message }; never throws.
 * `reason` is "no-database" when the Supabase integration isn't connected to this Vercel project,
 * "unreachable" when there is no /api (local dev, or a host that isn't Vercel).
 */
export async function requestSetup(fetchImpl = (typeof fetch === "function" ? fetch : null), base = "") {
  if (!fetchImpl) return { ok: false, reason: "unreachable" };
  try {
    const r = await fetchImpl(`${base}/api/setup-sync`, { method: "POST" });
    const type = r.headers?.get?.("content-type") || "";
    if (!/json/.test(type)) return { ok: false, reason: "unreachable" }; // a host that answers every path with the page itself
    return await r.json();
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

/**
 * Wraps a remote so that a missing table triggers one setup attempt and then a retry.
 * `setup()` resolves like requestSetup. Concurrent calls share one attempt, and a failed attempt isn't repeated
 * more than once a minute.
 */
export function withAutoSetup(remote, { setup = requestSetup, retries = 4, delay = 1200, now = Date.now } = {}) {
  let pending = null;
  let lastFail = 0;
  let lastResult = null;
  const ensure = () => {
    if (pending) return pending;
    if (lastFail && now() - lastFail < 60000) return Promise.resolve(lastResult);
    pending = setup().then((r) => { if (!r?.ok) { lastFail = now(); lastResult = r; } return r; }).finally(() => { pending = null; });
    return pending;
  };
  const guard = (fn) => async (...args) => {
    try { return await fn.apply(remote, args); } catch (e) {
      if (!isMissingTable(e)) throw e;
      const r = await ensure();
      if (!r?.ok) {
        const err = new Error(
          r?.reason === "no-database" ? "Cloud storage isn't connected to this Vercel project yet. In Vercel, open Storage, add Supabase, then redeploy."
          : r?.reason === "unreachable" ? "The sync table doesn't exist yet. Run supabase.sql in the Supabase SQL editor (README, step 2)."
          : `Could not create the sync table${r?.message ? `: ${r.message}` : "."}`);
        err.setup = r;
        throw err;
      }
      let last = e;
      for (let i = 0; i < retries; i++) { // Supabase needs a moment to see the new table
        try { return await fn.apply(remote, args); } catch (e2) { last = e2; if (!isMissingTable(e2)) throw e2; await wait(delay); }
      }
      throw last;
    }
  };
  return { list: guard(remote.list), get: guard(remote.get), put: guard(remote.put), del: guard(remote.del) };
}
