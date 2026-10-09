import { describe, it, expect } from "vitest";
import { Store, memoryBackend } from "../src/lib/store.js";
import { syncStore, memoryRemote } from "../src/lib/sync.js";
import { DAY } from "../src/lib/time.js";

const NOW = new Date(2026, 9, 9, 15, 0, 0).getTime();
async function dev() { const s = new Store(memoryBackend(), { autosave: false }); await s.load(); return s; }
function mk(s, id, n = 5) {
  const c = {}; for (let i = 0; i < n; i++) c[`${id}.${i}`] = { f: `w${i}`, r: "", m: "", o: i };
  s.addDeck({ id, name: id, kind: "vocab" }, c);
}

describe("sync", () => {
  it("uploads from device A and downloads on empty device B", async () => {
    const remote = memoryRemote();
    const a = await dev(), b = await dev();
    mk(a, "d1"); a.reviewCard("d1.0", 3, 1000, NOW); a.updateSettings({ name: "Mael", retention: 0.92 });
    const r1 = await syncStore(a, remote);
    expect(r1.pushed).toBeGreaterThan(0);
    await syncStore(b, remote);
    expect(b.deckList().map((d) => d.id)).toEqual(["d1"]);
    expect(b.rec("d1.0").st).toBe(1);
    expect(b.settings.name).toBe("Mael");
    expect(b.logRows().length).toBe(1);
    expect(b.cardIds("d1").length).toBe(5);
  });

  it("two devices review different cards, both converge", async () => {
    const remote = memoryRemote();
    const a = await dev(), b = await dev();
    mk(a, "d1"); await syncStore(a, remote); await syncStore(b, remote);
    a.reviewCard("d1.0", 3, 1000, NOW);
    b.reviewCard("d1.1", 4, 1000, NOW + 1000);
    await syncStore(a, remote); await syncStore(b, remote); await syncStore(a, remote);
    for (const s of [a, b]) {
      expect(s.rec("d1.0")?.st).toBe(1);
      expect(s.rec("d1.1")?.st).toBe(2);
      expect(s.logRows().length).toBe(2);
    }
  });

  it("same card on both devices: newest review wins, logs keep both", async () => {
    const remote = memoryRemote();
    const a = await dev(), b = await dev();
    mk(a, "d1"); await syncStore(a, remote); await syncStore(b, remote);
    a.reviewCard("d1.0", 1, 1000, NOW);
    b.reviewCard("d1.0", 4, 1000, NOW + 5000);
    await syncStore(a, remote); await syncStore(b, remote); await syncStore(a, remote);
    expect(a.rec("d1.0").u).toBe(b.rec("d1.0").u);
    expect(a.rec("d1.0").st).toBe(2);
    expect(a.logRows().length).toBe(2);
    expect(b.logRows().length).toBe(2);
  });

  it("retries on a version conflict", async () => {
    const remote = memoryRemote();
    const a = await dev();
    mk(a, "d1");
    await syncStore(a, remote);
    a.reviewCard("d1.0", 3, 1000, NOW);
    remote.failNextPut = 2;
    await syncStore(a, remote);
    const b = await dev(); await syncStore(b, remote);
    expect(b.rec("d1.0").st).toBe(1);
  });

  it("deleting a deck on A removes it on B and from the server", async () => {
    const remote = memoryRemote();
    const a = await dev(), b = await dev();
    mk(a, "d1"); mk(a, "d2");
    await syncStore(a, remote); await syncStore(b, remote);
    a.deleteDeck("d1");
    await syncStore(a, remote); await syncStore(b, remote);
    expect(b.deckList().map((d) => d.id)).toEqual(["d2"]);
    expect(b.content.d1).toBeUndefined();
    expect([...remote.rows.keys()].some((k) => k.endsWith(":d1"))).toBe(false);
  });

  it("local edits made while syncing are not lost", async () => {
    const remote = memoryRemote();
    const a = await dev();
    mk(a, "d1");
    const orig = remote.put.bind(remote);
    let hooked = false;
    remote.put = async (k, d, e) => {
      const r = await orig(k, d, e);
      if (!hooked && k.startsWith("prog:")) { hooked = true; a.reviewCard("d1.2", 3, 100, NOW); }
      return r;
    };
    a.reviewCard("d1.0", 3, 1000, NOW);
    await syncStore(a, remote);
    expect(a.meta.dirty["prog:d1"]).toBe(true);
    await syncStore(a, remote);
    expect(a.meta.dirty["prog:d1"]).toBeUndefined();
    const b = await dev(); await syncStore(b, remote);
    expect(b.rec("d1.2")?.st).toBe(1);
  });

  it("backup export/import round-trips", async () => {
    const a = await dev(); mk(a, "d1"); a.reviewCard("d1.0", 3, 1000, NOW);
    const json = JSON.parse(JSON.stringify(a.exportBackup()));
    const b = await dev(); b.importBackup(json);
    expect(b.rec("d1.0").st).toBe(1);
    expect(b.deckList().length).toBe(1);
    expect(() => b.importBackup({ nope: 1 })).toThrow();
  });
});

import { SyncController } from "../src/lib/syncController.js";
describe("sync controller", () => {
  it("runs a sync and reports status", async () => {
    const remote = memoryRemote();
    const a = await dev();
    mk(a, "d1");
    const c = new SyncController(a, () => remote);
    c.enabled = true;
    const seen = [];
    c.subscribe(() => seen.push(c.status));
    const rep = await c.run();
    expect(rep.pushed).toBeGreaterThan(0);
    expect(c.status).toBe("ok");
    expect(seen).toContain("syncing");
  });
  it("reports error without crashing", async () => {
    const a = await dev();
    const bad = { async list() { throw new Error("boom"); } };
    const c = new SyncController(a, () => bad);
    c.enabled = true;
    await c.run();
    expect(c.status).toBe("error");
    expect(c.error.message).toBe("boom");
  });
});
