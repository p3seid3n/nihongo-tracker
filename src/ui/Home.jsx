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

      {(counts.effort.spent > 0 || counts.total > 0) && (
        <section className="effort" aria-label="Effort today">
          <div className="spread"><span className="small dim">Effort today</span><span className="small dim num">{counts.effort.spent + (counts.effort.planned || 0)} of {counts.effort.budget} points</span></div>
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={counts.effort.budget} aria-valuenow={Math.min(counts.effort.budget, counts.effort.spent)}>
            <i className="done" style={{ width: `${Math.min(100, (counts.effort.spent / counts.effort.budget) * 100)}%` }} />
            <i className="plan" style={{ width: `${Math.min(100, ((counts.effort.planned || 0) / counts.effort.budget) * 100)}%` }} />
          </div>
          {counts.throttle.held > 0 && counts.throttle.reason && <p className="small dim">{plural(counts.throttle.held, "new card")} held back: {counts.throttle.reason}.</p>}
          {counts.deferred > 0 && <p className="small dim">{plural(counts.deferred, "card")} will wait for tomorrow because today's points are used up.</p>}
        </section>
      )}

      <section className="plan" aria-label="Plan">
        <Step
          icon="cards" done={remaining === 0}
          title={remaining === 0 ? "Reviews and new cards" : `Study ${plural(remaining, "card")}`}
          sub={remaining === 0 ? (counts.deferred > 0 ? "Today's effort budget is used up" : counts.newAvailable ? "All caught up for today" : "Nothing due") : `${counts.review} reviews · ${counts.new} new${counts.learn ? ` · ${counts.learn} learning` : ""}${counts.prodReview + counts.prodNew ? ` (${counts.prodReview + counts.prodNew} are recall cards)` : ""}`}
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
        {s.tracks?.vocab !== false && s.focus !== "maintain" && (
          <Step icon="book" title="Reading" sub="Short texts with a bar for how much you already know. Tap any word." onClick={() => open({ type: "reader" })} />
        )}
        {grammarOn && pool.length >= 6 && (
          <Step icon="book" title="Sentence practice" sub="Translate, fill gaps and pick the right form, using only what you know" onClick={() => open({ type: "sentences" })} />
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
            {(counts.overflow > 0 || counts.deferred > 0) && <button className="btn btn-tonal" onClick={() => open({ type: "study", opts: { extraReviews: true } })}>Keep going beyond today's limits</button>}
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
