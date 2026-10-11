// What the Today and Practice screens need to know about the person's material right now.
import { useMemo } from "react";
import { buildCounts } from "../lib/queue.js";
import { computeStats } from "../lib/stats.js";
import { sentencePool } from "../lib/personal.js";
import { pickWritingSet } from "../lib/writing.js";
import { pitchWords } from "../lib/pitchDrill.js";
import { dayKey } from "../lib/time.js";

export function usePlanInputs(store, now) {
  const v = store.getVersion();
  const day = dayKey(now);
  const s = store.settings;
  const counts = useMemo(() => buildCounts(store, now), [v, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => computeStats(store, now), [v, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const pool = useMemo(() => sentencePool(store, now), [v, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const writeSet = useMemo(
    () => (s.tracks?.kanji !== false || s.tracks?.kana !== false ? pickWritingSet(store, 5) : []),
    [v, day] // eslint-disable-line react-hooks/exhaustive-deps
  );
  // scanning every card for pitch data is the slowest part, and it only changes when decks do
  const decksSig = store.deckList().map((d) => `${d.id}:${d.enabled !== false}`).join("|");
  const pitchCount = useMemo(() => pitchWords(store).length, [decksSig, day]); // eslint-disable-line react-hooks/exhaustive-deps
  return { counts, stats, pool, writeSet, pitchCount, lessonsDue: stats.lessonsDue, poolSize: pool.length };
}
