import React from "react";
import { Step, useApp, useNow, PageHead, plural } from "./common.jsx";
import { usePlanInputs } from "./planInputs.js";
import { LESSONS } from "../content/lessons.js";

function Group({ title, children }) {
  return (
    <section className="stack" style={{ gap: 10 }}>
      <div className="section-title"><h2>{title}</h2></div>
      <div className="plan">{children}</div>
    </section>
  );
}

export function Practice() {
  const { store, open } = useApp();
  const now = useNow(60000);
  const { counts, stats, pool, writeSet, pitchCount } = usePlanInputs(store, now);
  const s = store.settings;
  const maintain = s.focus === "maintain";
  const grammarOn = s.tracks?.grammar !== false && !maintain;
  const vocabOn = s.tracks?.vocab !== false && !maintain;
  const lessonsDone = LESSONS.filter((l) => store.lessons[l.id]?.done).length;
  const left = counts.total;

  return (
    <div className="page">
      <PageHead title="Practice" />
      <p className="dim" style={{ marginTop: -6 }}>Everything you can practise, any time. Today's plan picks from these for you.</p>

      <Group title="Cards">
        <Step icon="cards" title={left ? `Study ${plural(left, "card")}` : "Study cards"}
          sub={left ? `${counts.review} reviews · ${counts.new} new${counts.learn ? ` · ${counts.learn} learning` : ""}` : (counts.newAvailable ? "All caught up. Tap to learn 5 more new cards." : "Nothing due right now")}
          disabled={!left && !counts.newAvailable}
          onClick={() => open(left ? { type: "study" } : { type: "study", opts: { extraNew: 5 } })} />
        <Step icon="pen" title={writeSet.length ? `Write ${plural(writeSet.length, "character")}` : "Write characters"}
          sub={writeSet.length ? `Stroke order: ${writeSet.slice(0, 5).map((x) => x.ch).join(" ")}` : "Needs a kanji or kana deck"}
          disabled={!writeSet.length} onClick={() => open({ type: "write", items: writeSet })} />
      </Group>

      <Group title="Grammar">
        <Step icon="refresh" title="Review grammar"
          sub={!grammarOn ? "Grammar is switched off in Settings" : !lessonsDone ? "Finish a lesson first" : stats.lessonsDue ? `${plural(stats.lessonsDue, "lesson")} ready for a refresher` : "Nothing due. Tap to review anyway."}
          disabled={!grammarOn || !lessonsDone} onClick={() => open({ type: "review" })} />
        <Step icon="book" title="Sentence practice"
          sub={!grammarOn ? "Grammar is switched off in Settings" : pool.length < 6 ? "Unlocks after a few vocabulary cards with example sentences" : "Translate, fill gaps and pick the right form, using only what you know"}
          disabled={!grammarOn || pool.length < 6} onClick={() => open({ type: "sentences" })} />
      </Group>

      <Group title="Reading and writing">
        <Step icon="book" title="Reading" sub={vocabOn ? "Short texts with a bar for how much you already know. Tap any word." : "Needs the vocabulary track"} disabled={!vocabOn} onClick={() => open({ type: "reader" })} />
        <Step icon="pen" title="Writing prompts" sub="Write a few sentences and see which words and grammar you used" onClick={() => open({ type: "output" })} />
      </Group>

      <Group title="Listening and speaking">
        <Step icon="volume" title="Pitch practice"
          sub={maintain ? "Switched off in maintain mode" : pitchCount < 4 ? "Needs a vocabulary deck with pitch data (Kaishi has it)" : "Hear a word and pick its pitch pattern, then shadow it"}
          disabled={maintain || pitchCount < 4} onClick={() => open({ type: "pitch" })} />
      </Group>
    </div>
  );
}
