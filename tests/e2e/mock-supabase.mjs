// A tiny stand-in for Supabase (auth + the app_data table) so the cloud features can be tested offline.
// It implements only what the app uses and follows PostgREST/GoTrue conventions.
import http from "node:http";
import crypto from "node:crypto";

export function startMock(port = 54321) {
  const users = new Map(); // email -> {id,email,password}
  const rows = new Map(); // `${uid}|${key}` -> {key,data,rev}
  const stats = { requests: 0, puts: 0, conflicts: 0 };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = (u) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
  const session = (u) => ({ access_token: jwt(u), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r_" + u.id, user: { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } });
  const uidOf = (req) => { const a = (req.headers.authorization || "").replace("Bearer ", ""); try { return JSON.parse(Buffer.from(a.split(".")[1], "base64url").toString()).sub; } catch { return null; } };

  const server = http.createServer(async (req, res) => {
    stats.requests++;
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "Access-Control-Expose-Headers": "*" };
    const send = (code, body, extra = {}) => { res.writeHead(code, { "Content-Type": "application/json", ...cors, ...extra }); res.end(body === undefined ? "" : JSON.stringify(body)); };
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const url = new URL(req.url, "http://x");
    let body = "";
    for await (const c of req) body += c;
    const json = body ? JSON.parse(body) : {};
    const p = url.pathname;

    // ---- auth
    if (p === "/auth/v1/signup") {
      if (users.has(json.email)) return send(422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
      const u = { id: crypto.randomUUID(), email: json.email, password: json.password };
      users.set(u.email, u);
      return send(200, session(u));
    }
    if (p === "/auth/v1/token") {
      const gt = url.searchParams.get("grant_type");
      if (gt === "password") {
        const u = users.get(json.email);
        if (!u || u.password !== json.password) return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
        return send(200, session(u));
      }
      if (gt === "refresh_token") {
        const u = [...users.values()].find((x) => "r_" + x.id === json.refresh_token);
        return u ? send(200, session(u)) : send(400, { msg: "bad refresh" });
      }
    }
    if (p === "/auth/v1/user") {
      const uid = uidOf(req); const u = [...users.values()].find((x) => x.id === uid);
      if (!u) return send(401, { msg: "no" });
      if (req.method === "PUT" && json.password) u.password = json.password;
      return send(200, session(u).user);
    }
    if (p === "/auth/v1/logout") return send(204);
    if (p === "/auth/v1/recover") return send(200, {});

    // ---- app_data
    if (p === "/rest/v1/app_data") {
      const uid = uidOf(req);
      if (!uid) return send(401, { message: "JWT required" });
      const mine = () => [...rows.entries()].filter(([k]) => k.startsWith(uid + "|")).map(([, v]) => v);
      const filt = (name) => url.searchParams.get(name);
      const parseIn = (v) => v.replace(/^in\./, "").replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      if (req.method === "GET") {
        let list = mine();
        const k = filt("key");
        if (k && k.startsWith("in.")) { const set = new Set(parseIn(k)); list = list.filter((r) => set.has(r.key)); }
        const cols = (filt("select") || "*").split(",");
        return send(200, list.map((r) => (cols[0] === "*" ? r : Object.fromEntries(cols.map((c) => [c, r[c]])))));
      }
      if (req.method === "POST") {
        const id = uid + "|" + json.key;
        if (rows.has(id)) { stats.conflicts++; return send(409, { code: "23505", message: "duplicate key value violates unique constraint" }); }
        stats.puts++;
        rows.set(id, { key: json.key, data: json.data, rev: json.rev ?? 1 });
        return send(201);
      }
      if (req.method === "PATCH") {
        const key = (filt("key") || "").replace(/^eq\./, "");
        const rev = Number((filt("rev") || "").replace(/^eq\./, ""));
        const cur = rows.get(uid + "|" + key);
        if (!cur || cur.rev !== rev) { stats.conflicts++; return send(200, []); }
        stats.puts++;
        cur.data = json.data; cur.rev = json.rev;
        return send(200, [{ rev: cur.rev }]);
      }
      if (req.method === "DELETE") {
        const k = filt("key");
        if (k && k.startsWith("in.")) for (const key of parseIn(k)) rows.delete(uid + "|" + key);
        return send(204);
      }
    }
    send(404, { message: "not found " + p });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, users, rows, stats, close: () => server.close() })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = await startMock(Number(process.env.PORT || 54321));
  console.log("mock supabase on", process.env.PORT || 54321);
  void m;
}
