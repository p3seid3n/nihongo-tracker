// Vercel Function: creates the cloud-sync table in the Supabase database that the Vercel–Supabase
// integration added to this project. The app calls it by itself the first time sync finds no table.
// Safe to call again: it does nothing when the table exists, and it only ever creates that one table.
import pg from "pg";
import { SCHEMA_SQL, pickDatabaseUrl, connectionConfig } from "./_schema.js";

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return json(res, 405, { ok: false, reason: "method" });
  const url = pickDatabaseUrl(process.env);
  if (!url) return json(res, 501, { ok: false, reason: "no-database", message: "This deployment has no database address. Add the Supabase integration under Vercel → Storage, then redeploy." });

  let client;
  try {
    client = new pg.Client(connectionConfig(url));
    await client.connect();
    const exists = (await client.query("select to_regclass('public.app_data') as t")).rows[0].t;
    if (exists) return json(res, 200, { ok: true, created: false });
    if (req.method === "GET") return json(res, 200, { ok: false, reason: "missing-table" });
    await client.query(SCHEMA_SQL);
    await client.query("notify pgrst, 'reload schema'");
    return json(res, 200, { ok: true, created: true });
  } catch (e) {
    return json(res, 500, { ok: false, reason: "database", message: String((e && e.message) || e).slice(0, 300) });
  } finally {
    try { await client?.end(); } catch { /* ignore */ }
  }
}
