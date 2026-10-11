import React, { useMemo } from "react";
import { Icon } from "./icons.jsx";
import { Ring, Step, useApp, useNow, plural, fmtNum } from "./common.jsx";
import { usePlanInputs } from "./planInputs.js";
import { buildPlan } from "../lib/plan.js";
import { dayIndexToDate } from "../lib/time.js";

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
  const inputs = usePlanInputs(store, now);
  const { counts, stats } = inputs;
  const v = store.getVersion();
  const plan = useMemo(() => buildPlan(store, now, inputs), [v, now, inputs.pitchCount, inputs.writeSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = store.settings;
  const userDecks = store.deckList().filter((d) => !d.builtin);
  const needsImport = userDecks.length === 0 && (s.tracks.kanji || s.tracks.vocab) && s.level !== "beginner";
  const date = new Date(now).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const total = plan.items.length;
  const finished = plan.items.filter((i) => i.done).length;
  const progress = total ? finished / total : 0;
  const { gate } = plan;
  const nextWhen = !gate.next ? null
    : gate.open ? "today"
    : gate.daysLeft === 1 ? "tomorrow"
    : dayIndexToDate(gate.openDay).toLocaleDateString(undefined, { weekday: "long" });

  const effort = counts.effort;

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
        <Ring size={96} stroke={9} value={plan.allDone ? 1 : progress}>
          {plan.allDone ? <Icon name="check" size={34} /> : <div><b style={{ fontSize: "1.6rem" }}>{finished}/{total}</b><div className="tiny dim">done</div></div>}
        </Ring>
        <div className="stack grow" style={{ gap: 6 }}>
          <h2>{plan.allDone ? "Today's plan is done" : "Today's plan"}</h2>
          <div className="row-wrap">
            {plan.allDone
              ? <span className="chip">{counts.today.total ? `${counts.today.total} cards reviewed` : "Nothing left"}</span>
              : <span className="chip"><Icon name="clock" /> about {plan.minutes.planned} min</span>}
            {stats.streak.current > 0 && <span className="chip chip-primary"><Icon name="flame" /> {stats.streak.current} day{stats.streak.current === 1 ? "" : "s"}</span>}
          </div>
        </div>
      </section>

      <section className="plan" aria-label="Plan">
        {plan.items.length === 0 && (
          <div className="card empty"><p className="dim">Nothing is planned for today. Check Practice for something to try.</p><button className="btn btn-tonal" onClick={() => go("practice")}>Open Practice</button></div>
        )}
        {plan.items.map((it) => (
          <Step key={it.id} icon={it.icon} done={it.done} title={it.title} sub={it.sub} badge={!it.done && it.min ? `${it.min} min` : null} onClick={() => open(it.open)} />
        ))}
      </section>

      {(effort.spent > 0 || counts.total > 0) && (
        <section className="effort" aria-label="Card effort today">
          <div className="spread"><span className="small dim">Card effort today</span><span className="small dim num">budget {effort.budget}</span></div>
          <div className="meter" role="progressbar" aria-label="Card effort" aria-valuemin={0} aria-valuemax={effort.budget} aria-valuenow={Math.min(effort.budget, effort.spent)}>
            <i className="done" style={{ width: `${Math.min(100, (effort.spent / effort.budget) * 100)}%` }} />
            <i className="plan" style={{ width: `${Math.min(100, ((effort.planned || 0) / effort.budget) * 100)}%` }} />
          </div>
          <div className="legend small dim num">
            <span><i className="dot done" /> {effort.spent} done</span>
            <span><i className="dot plan" /> {effort.planned || 0} still planned</span>
          </div>
          {counts.throttle.held > 0 && counts.throttle.reason && <p className="small dim">{plural(counts.throttle.held, "new card")} held back: {counts.throttle.reason}.</p>}
          {counts.deferred > 0 && <p className="small dim">{plural(counts.deferred, "card")} will wait for tomorrow because today's points are used up.</p>}
        </section>
      )}

      {plan.allDone && (
        <section className="card stack center" style={{ alignItems: "center" }}>
          <div className="big jp" lang="ja" style={{ fontSize: "2.4rem", color: "var(--primary)" }}>お疲れ様</div>
          <p className="dim">You're done for today. Want to do a little more?</p>
          <div className="row-wrap" style={{ justifyContent: "center" }}>
            {counts.newAvailable > 0 && <button className="btn btn-tonal" onClick={() => open({ type: "study", opts: { extraNew: 5 } })}>5 more new cards</button>}
            {(counts.overflow > 0 || counts.deferred > 0) && <button className="btn btn-tonal" onClick={() => open({ type: "study", opts: { extraReviews: true } })}>Keep going beyond today's limits</button>}
          </div>
        </section>
      )}

      {plan.extras.length > 0 && (
        <section className="stack" style={{ gap: 10 }} aria-label="If you have time">
          <div className="section-title"><h2>If you have time</h2></div>
          <div className="plan">
            {plan.extras.slice(0, 5).map((it) => (
              <Step key={it.id} icon={it.icon} done={it.done} title={it.title} sub={it.sub} badge={it.done ? null : `${it.min} min`} onClick={() => open(it.open)} />
            ))}
          </div>
        </section>
      )}

      <section className="card stack week" aria-label="This week">
        <div className="week-strip" role="list">
          {plan.week.map((d) => (
            <span key={d.idx} role="listitem" className={`wd ${d.today ? "today" : ""} ${d.studied ? "on" : ""} ${d.future ? "future" : ""}`} aria-label={`${d.label}${d.studied ? ", studied" : ""}${d.today ? ", today" : ""}`}>{d.studied ? <Icon name="check" size={16} /> : d.label}</span>
          ))}
        </div>
        <div className="small dim">
          {nextWhen ? <div>Next new grammar point: <b>{nextWhen}</b>{gate.open ? "" : ` (one every ${gate.interval} day${gate.interval === 1 ? "" : "s"})`}</div> : <div>You have been through every grammar lesson.</div>}
          {plan.tomorrow.length > 0 && <div>Tomorrow: {plan.tomorrow.join(", ")}</div>}
        </div>
      </section>

      {needsImport && (
        <section className="card card-tonal stack">
          <h2>Bring your Anki decks</h2>
          <p>Import your kanji and vocabulary decks (.apkg) and pick up exactly where you left off.</p>
          <button className="btn btn-primary" onClick={() => open({ type: "import" })}><Icon name="upload" /> Import from Anki</button>
        </section>
      )}

      <section className="tiles">
        <div className="tile"><span className="v">{fmtNum(stats.kanjiKnown)}</span><span className="l">kanji known</span></div>
        <div className="tile"><span className="v">{fmtNum(stats.wordsKnown)}</span><span className="l">words known</span></div>
      </section>
    </div>
  );
}
