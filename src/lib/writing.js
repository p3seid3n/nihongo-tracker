// Which characters to practise writing today.
import { NEW } from "./fsrs.js";
import { dayKey, monthKey } from "./time.js";
import { isWritable } from "./strokes.js";

const single = (f) => [...String(f || "")].length === 1 && isWritable(f);

/**
 * Up to n single characters from your kanji and kana decks. Cards you have started come first,
 * weakest (lowest stability) first, because writing helps what is still shaky. If there aren't
 * enough, the next new cards of kanji and kana decks fill the list.
 * Returns [{ id, ch, title, sub }].
 */
export function pickWritingSet(store, n = 5) {
  const started = [], fresh = [];
  const seen = new Set();
  for (const d of store.deckList()) {
    if (d.enabled === false || (d.kind !== "kanji" && d.kind !== "kana")) continue;
    for (const id of store.cardIds(d.id)) {
      const c = store.card(id);
      if (!c || !single(c.f) || seen.has(c.f)) continue;
      const rec = store.rec(id);
      if (rec?.sus) continue;
      const item = { id, ch: c.f, title: d.kind === "kana" ? c.m || c.f : c.m || c.f, sub: d.kind === "kana" ? "Write this character" : "Write this kanji" };
      if (rec && rec.st !== NEW) { started.push({ item, s: rec.s || 0, due: rec.due || 0 }); seen.add(c.f); }
      else if (fresh.length < n) { fresh.push(item); seen.add(c.f); }
    }
  }
  started.sort((a, b) => a.s - b.s || a.due - b.due);
  const out = started.slice(0, n).map((x) => x.item);
  for (const f of fresh) { if (out.length >= n) break; out.push(f); }
  return out;
}

/** Did you finish a writing session today? */
export function wroteToday(store, now = Date.now()) {
  const rows = store.log[monthKey(now)] || [];
  const today = dayKey(now);
  return rows.some((r) => r[1] === "g.writing" && r[2] > 0 && dayKey(r[0]) === today);
}
