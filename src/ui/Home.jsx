import React, { useMemo } from "react";
import { Icon } from "./icons.jsx";
import { Ring, useApp, useNow, plural, fmtNum } from "./common.jsx";
import { buildCounts } from "../lib/queue.js";
import { computeStats } from "../lib/stats.js";
import { sentencePool } from "../lib/personal.js";
import { LESSONS } from "../content/lessons.js";
import { dayKey } from "../lib/time.js";
import { pickWritingSet, wroteToday } from "../lib/writing.js";

function greeting(now) {
  const h = new Date(now).getHours();
  return h < 5 ? "Late night" : h < 11 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Late night";
}

export function SyncBadge() {
  const { sync, session, go } = useApp();
  const status = sync.status;
  if (!session) return null;
  const label = { syncing: "Syncing", ok: "Synced", error: "Sync problem", offline: "Offline", idle: "Waiting to sync", off: "" }[status] || "";
  return (
    <button className="chip" onClick={() => go("settings")} aria-label={`Cloud: ${label}`}>
      <span className={`sync-dot ${status}`} /> {label}
    </button>
  );
}

export function Home() {
  const { store, go, open, session, cloud } = useApp();
  const now = useNow(30000);
  const day = dayKey(now);
  const v = store.getVersion();
  const counts = useMemo(() => buildCounts(store, now), [v, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => computeStats(store, now), [v, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const pool = useMemo(() => sentencePool(store, now), [v, day]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = store.settings;
  const writeSet = useMemo(() => (s.tracks?.kanji !== false || s.tracks?.kana !== false ? pickWritingSet(store, 5) : []), [v, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const wrote = wroteToday(store, now);
  const grammarOn = s.tracks?.grammar !== false && s.focus !== "maintain";
  const nextLesson = grammarOn ? LESSONS.find((l) => !store.lessons[l.id]?.done) : null;
  const doneToday = counts.today.total;
  const remaining = counts.total;
  const progress = doneToday + remaining ? doneToday / (doneToday + remaining) : 0;
  const lessonDoneToday = counts.today.lessons > 0;
  const userDecks = store.deckList().filter((d) => !d.builtin);
  const needsImport = userDecks.length === 0 && (s.tracks.kanji || s.tracks.vocab) && s.level !== "beginner";
  const date = new Date(now).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const allDone = remaining === 0 && (!nextLesson || lessonDoneToday) && stats.lessonsDue === 0;

  return (
    <div className="page">
      <header className="page-head">
        <div className="hello">
          <h1>{greeting(now)}{s.name ? `, ${s.name}` : ""}</h1>
          <span className="sub small">{date}</span>
        </div>
        <div className="row">
          <SyncBadge />
          {!session && cloud && <button className="chip" onClick={() => go("settings")}><Icon name="cloud" /> Sign in</button>}
        </div>
      </header>

      <section className="plan-hero" aria-label="Today">
        <Ring size={96} stroke={9} value={remaining === 0 && doneToday > 0 ? 1 : progress}>
          {remaining === 0 ? <Icon name="check" size={34} /> : <div><b style={{ fontSize: "1.6rem" }}>{remaining}</b><div className="tiny dim">to go</div></div>}
        </Ring>
        <div className="stack grow" style={{ gap: 6 }}>
          <h2>{remaining === 0 ? (doneToday ? "Cards done for today" : "No cards due") : "Today's cards"}</h2>
          <div className="row-wrap">
            {stats.streak.current > 0 && <span className="chip chip-primary"><Icon name="flame" /> {stats.streak.current} day{stats.streak.current === 1 ? "" : "s"}</span>}
            {doneToday > 0 && <span className="chip">{doneToday} done</span>}
          </div>
        </div>
      </section>

      <section className="plan" aria-label="Plan">
        <Step
          icon="cards" done={remaining === 0}
          title={remaining === 0 ? "Reviews and new cards" : `Study ${plural(remaining, "card")}`}
          sub={remaining === 0 ? (counts.newAvailable ? "All caught up for today" : "Nothing due") : `${counts.review} reviews · ${counts.new} new${counts.learn ? ` · ${counts.learn} learning` : ""}`}
          onClick={() => open({ type: "study" })} disabled={remaining === 0} />
        {writeSet.length >= 1 && (
          <Step icon="pen" done={wrote} title={`Write ${plural(writeSet.length, "character")}`} sub={`Stroke order practice: ${writeSet.slice(0, 4).map((x) => x.ch).join(" ")}${writeSet.length > 4 ? " …" : ""}`} onClick={() => open({ type: "write", items: writeSet })} />
        )}
        {nextLesson && (
          <Step icon="learn" done={lessonDoneToday} title={`Lesson: ${nextLesson.title}`} sub={`${nextLesson.jp} · ${nextLesson.blurb}`} onClick={() => open({ type: "lesson", id: nextLesson.id })} />
        )}
        {grammarOn && stats.lessonsDue > 0 && (
          <Step icon="refresh" title={`Review grammar`} sub={`${plural(stats.lessonsDue, "lesson")} ready for a quick refresher`} onClick={() => open({ type: "review" })} />
        )}
        {grammarOn && pool.length >= 8 && (
          <Step icon="book" title="Read your own sentences" sub="Sentences from your vocabulary cards" onClick={() => open({ type: "sentences" })} />
        )}
      </section>

      {needsImport && (
        <section className="card card-tonal stack">
          <h2>Bring your Anki decks</h2>
          <p>Import your kanji and vocabulary decks (.apkg) and pick up exactly where you left off.</p>
          <button className="btn btn-primary" onClick={() => open({ type: "import" })}><Icon name="upload" /> Import from Anki</button>
        </section>
      )}

      {allDone && (
        <section className="card stack center" style={{ alignItems: "center" }}>
          <div className="big jp" lang="ja" style={{ fontSize: "2.4rem", color: "var(--primary)" }}>お疲れ様</div>
          <p className="dim">You're done for today. Want to do a little more?</p>
          <div className="row-wrap" style={{ justifyContent: "center" }}>
            {counts.newAvailable > 0 && <button className="btn btn-tonal" onClick={() => open({ type: "study", opts: { extraNew: 5 } })}>5 more new cards</button>}
            {counts.overflow > 0 && <button className="btn btn-tonal" onClick={() => open({ type: "study", opts: { extraReviews: true } })}>Reviews beyond today's cap</button>}
          </div>
        </section>
      )}

      <section className="tiles">
        <div className="tile"><span className="v">{fmtNum(stats.kanjiKnown)}</span><span className="l">kanji known</span></div>
        <div className="tile"><span className="v">{fmtNum(stats.wordsKnown)}</span><span className="l">words known</span></div>
      </section>
    </div>
  );
}

function Step({ icon, title, sub, onClick, done, disabled }) {
  return (
    <button className={`step ${done ? "done" : ""}`} onClick={onClick} disabled={disabled}>
      <span className="step-icon"><Icon name={done ? "check" : icon} /></span>
      <span className="grow"><div className="title">{title}</div><div className="sub">{sub}</div></span>
      {!disabled && <Icon name="chevron" className="step-go" size={22} />}
    </button>
  );
}
