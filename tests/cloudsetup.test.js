import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { pickCloudEnv } from "../src/lib/cloudEnv.js";
import { isMissingTable, withAutoSetup, requestSetup } from "../src/lib/cloudSetup.js";
import { SCHEMA_SQL, pickDatabaseUrl, connectionConfig } from "../api/_schema.js";

describe("cloud environment", () => {
  it("accepts the hand-made names", () => {
    expect(pickCloudEnv({ VITE_SUPABASE_URL: "https://a.supabase.co", VITE_SUPABASE_ANON_KEY: "k" })).toMatchObject({ ok: true, url: "https://a.supabase.co", key: "k" });
  });
  it("accepts the names the Vercel integration adds", () => {
    expect(pickCloudEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://b.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" }).ok).toBe(true);
    expect(pickCloudEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://b.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1" }).key).toBe("sb_publishable_1");
  });
  it("prefers the hand-made names and trims", () => {
    const e = pickCloudEnv({ VITE_SUPABASE_URL: " https://a.supabase.co ", NEXT_PUBLIC_SUPABASE_URL: "https://b.supabase.co", VITE_SUPABASE_ANON_KEY: "k", NEXT_PUBLIC_SUPABASE_ANON_KEY: "z" });
    expect(e).toMatchObject({ url: "https://a.supabase.co", key: "k" });
  });
  it("is off when something is missing or malformed", () => {
    expect(pickCloudEnv({}).ok).toBe(false);
    expect(pickCloudEnv({ VITE_SUPABASE_URL: "https://a.supabase.co" }).ok).toBe(false);
    expect(pickCloudEnv({ VITE_SUPABASE_URL: "a.supabase.co", VITE_SUPABASE_ANON_KEY: "k" }).ok).toBe(false);
    expect(pickCloudEnv({ VITE_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_URL: "https://b.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" }).ok).toBe(true);
  });
  it("never reads server-only names", () => {
    expect(pickCloudEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://b.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "secret" }).ok).toBe(false);
  });
});

describe("missing table detection", () => {
  it("recognises PostgREST and Postgres errors", () => {
    expect(isMissingTable({ code: "PGRST205", message: "x" })).toBe(true);
    expect(isMissingTable({ code: "42P01", message: "x" })).toBe(true);
    expect(isMissingTable({ message: "Could not find the table 'public.app_data' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingTable({ message: "Failed to fetch" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});

const tableError = () => Object.assign(new Error("Could not find the table 'public.app_data' in the schema cache"), { code: "PGRST205" });
function flaky(missingFor) {
  let n = 0;
  return { calls: () => n, async list() { n++; if (n <= missingFor) throw tableError(); return [{ key: "a", rev: 1 }]; }, async get() { return []; }, async put() { return { ok: true, rev: 1 }; }, async del() {} };
}

describe("auto setup", () => {
  it("creates the table once, then retries the request", async () => {
    const remote = flaky(2); // missing, still missing right after setup, then fine
    const setup = vi.fn(async () => ({ ok: true, created: true }));
    const r = withAutoSetup(remote, { setup, delay: 1 });
    expect(await r.list()).toEqual([{ key: "a", rev: 1 }]);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(remote.calls()).toBe(3);
  });
  it("shares one attempt between simultaneous requests", async () => {
    let missing = true;
    const remote = { async list() { if (missing) throw tableError(); return []; }, async get() { if (missing) throw tableError(); return []; }, async put() {}, async del() {} };
    const setup = vi.fn(async () => { await new Promise((r) => setTimeout(r, 10)); missing = false; return { ok: true, created: true }; });
    const r = withAutoSetup(remote, { setup, delay: 1 });
    await Promise.all([r.list(), r.get(["x"])]);
    expect(setup).toHaveBeenCalledTimes(1);
  });
  it("leaves other errors alone and does not call setup", async () => {
    const remote = { async list() { throw new Error("Failed to fetch"); } };
    const setup = vi.fn();
    await expect(withAutoSetup({ ...remote, get() {}, put() {}, del() {} }, { setup }).list()).rejects.toThrow("Failed to fetch");
    expect(setup).not.toHaveBeenCalled();
  });
  it("explains what to do when the database isn't connected", async () => {
    const r = withAutoSetup(flaky(99), { setup: async () => ({ ok: false, reason: "no-database" }), delay: 1 });
    await expect(r.list()).rejects.toThrow(/Storage/);
  });
  it("points to supabase.sql when there is no function to call", async () => {
    const r = withAutoSetup(flaky(99), { setup: async () => ({ ok: false, reason: "unreachable" }), delay: 1 });
    await expect(r.list()).rejects.toThrow(/supabase\.sql/);
  });
  it("doesn't hammer a failing setup", async () => {
    let t = 1000;
    const setup = vi.fn(async () => ({ ok: false, reason: "database", message: "boom" }));
    const r = withAutoSetup(flaky(99), { setup, delay: 1, now: () => t });
    await expect(r.list()).rejects.toThrow(/boom/);
    t += 5000;
    await expect(r.list()).rejects.toThrow(/boom/);
    expect(setup).toHaveBeenCalledTimes(1);
    t += 60000;
    await expect(r.list()).rejects.toThrow();
    expect(setup).toHaveBeenCalledTimes(2);
  });
  it("gives up after the retries when the table never shows up", async () => {
    const remote = flaky(99);
    const r = withAutoSetup(remote, { setup: async () => ({ ok: true }), retries: 3, delay: 1 });
    await expect(r.list()).rejects.toMatchObject({ code: "PGRST205" });
    expect(remote.calls()).toBe(4);
  });
});

describe("requestSetup", () => {
  const resp = (type, body) => ({ headers: { get: () => type }, json: async () => body });
  it("returns the server's answer", async () => {
    expect(await requestSetup(async () => resp("application/json", { ok: true, created: true }))).toEqual({ ok: true, created: true });
  });
  it("treats an HTML answer (no /api on this host) or a network error as unreachable", async () => {
    expect((await requestSetup(async () => resp("text/html", null))).reason).toBe("unreachable");
    expect((await requestSetup(async () => { throw new Error("x"); })).reason).toBe("unreachable");
    expect((await requestSetup(null)).reason).toBe("unreachable");
  });
});

describe("schema", () => {
  const norm = (s) => s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").replace(/\s+/g, " ").trim();
  it("supabase.sql and the function use the same statements", () => {
    expect(norm(fs.readFileSync(new URL("../supabase.sql", import.meta.url), "utf8"))).toBe(norm(SCHEMA_SQL));
  });
  it("locks rows to their owner", () => {
    for (const op of ["select", "insert", "update", "delete"]) expect(SCHEMA_SQL).toContain(`own rows: ${op}`);
    expect(SCHEMA_SQL).toContain("enable row level security");
  });
  it("finds the database address and tidies it for pg", () => {
    expect(pickDatabaseUrl({ POSTGRES_URL: "b", POSTGRES_URL_NON_POOLING: "a" })).toBe("a");
    expect(pickDatabaseUrl({ POSTGRES_PRISMA_URL: "c" })).toBe("c");
    expect(pickDatabaseUrl({})).toBe("");
    const c = connectionConfig("postgres://u:p@h.supabase.com:5432/postgres?sslmode=require&supa=base-pooler.x");
    expect(c.connectionString).toBe("postgres://u:p@h.supabase.com:5432/postgres");
    expect(c.ssl).toEqual({ rejectUnauthorized: false });
  });
});
