import React, { useMemo } from "react";
import { Icon } from "./icons.jsx";
import { useApp, useNow, PageHead, fmtNum, fmtMinutes, plural } from "./common.jsx";
import { computeStats } from "../lib/stats.js";
import { newLimit } from "../lib/queue.js";
import { dayKey, dayIndexToDate } from "../lib/time.js";

const WD = ["S", "M", "T", "W", "T", "F", "S"];

function Bars({ data, label, stack }) {
  const max = Math.max(1, ...data.map((d) => (stack ? d.a + d.b : d.a)));
  return (
    <div>
      <div className="bars" role="img" aria-label={label}>
        {data.map((d, i) => (
          <div className="col" key={i} title={d.title}>
            {stack && d.b > 0 && <i className="alt" style={{ height: `${(d.b / max) * 100}%` }} />}
            <i style={{ height: `${(d.a / max) * 100}%`, opacity: d.a ? 1 : 0.15, minHeight: d.a ? 2 : 2 }} />
          </div>
        ))}
      </div>
      <div className="bars-x">{data.map((d, i) => <span key={i}>{d.x}</span>)}</div>
    </div>
  );
}

function Heatmap({ activity }) {
  const max = Math.max(1, ...activity.map((a) => a.n));
  const pad = dayIndexToDate(activity[0].day).getDay();
  const level = (n) => (n === 0 ? "" : n <= max * 0.25 ? "l1" : n <= max * 0.5 ? "l2" : n <= max * 0.75 ? "l3" : "l4");
  return (
    <div className="heat" role="img" aria-label="Activity over the last 20 weeks">
      {Array.from({ length: pad }, (_, i) => <i key={`p${i}`} className="future" style={{ visibility: "hidden" }} />)}
      {activity.map((a) => <i key={a.day} className={level(a.n)} title={`${dayIndexToDate(a.day).toLocaleDateString()}: ${a.n}`} />)}
    </div>
  );
}

export function Stats() {
  const { store, open } = useApp();
  const now = useNow(60000);
  const day = dayKey(now);
  const st = useMemo(() => computeStats(store, now), [store.getVersion(), day]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasData = st.reviewsTotal > 0 || st.totals.cards > 0;

  const daily = st.daily.map((d) => ({ a: d.reviews, b: d.news, x: WD[dayIndexToDate(d.day).getDay()], title: `${dayIndexToDate(d.day).toLocaleDateString()}: ${d.reviews} reviews, ${d.news} new` }));
  const fc = st.forecast.slice(0, 14).map((d, i) => ({ a: d.n, x: i === 0 ? "T" : WD[dayIndexToDate(d.day).getDay()], title: `${dayIndexToDate(d.day).toLocaleDateString()}: ${d.n} due` }));
  const growth = st.weeks.map((w, i) => ({ a: w.n, x: i === st.weeks.length - 1 ? "now" : i % 3 === 0 ? `-${w.week}w` : "", title: `${w.n} new cards` }));
  const upcoming = st.forecast.slice(0, 7).reduce((n, d) => n + d.n, 0);

  const projections = st.perDeck.filter((p) => p.deck.enabled !== false && p.fresh > 0).map((p) => {
    const lim = newLimit(store, p.deck);
    if (!lim) return null;
    const days = Math.ceil(p.fresh / lim);
    const when = new Date(now + days * 86400000);
    return { deck: p.deck, fresh: p.fresh, days, when };
  }).filter(Boolean);

  if (!hasData) {
    return (
      <div className="page">
        <PageHead title="Stats" />
        <div className="card empty">
          <div className="big" lang="ja">表</div>
          <h2>No data yet</h2>
          <p className="dim">Your streak, retention, forecast and growth show up here after your first session.</p>
          <button className="btn btn-primary" onClick={() => open({ type: "study" })}>Start studying</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHead title="Stats" />

      <div className="tiles">
        <div className="tile"><span className="v"><Icon name="flame" size={22} style={{ verticalAlign: -3, color: "var(--primary)" }} /> {st.streak.current}</span><span className="l">day streak</span><span className="d">Best: {st.streak.longest}</span></div>
        <div className="tile"><span className="v">{st.retention == null ? "–" : `${Math.round(st.retention * 100)}%`}</span><span className="l">true retention</span><span className="d">{st.retention == null ? "Needs 20 reviews in 30 days" : `Goal ${Math.round((store.settings.retention || 0.9) * 100)}% · ${fmtNum(st.retentionN)} reviews`}</span></div>
        <div className="tile"><span className="v">{fmtNum(st.kanjiKnown)}</span><span className="l">kanji known</span><span className="d">Graduated kanji cards</span></div>
        <div className="tile"><span className="v">{fmtNum(st.wordsKnown)}</span><span className="l">words known</span><span className="d">Graduated vocabulary</span></div>
        <div className="tile"><span className="v">{fmtMinutes(st.totalMs)}</span><span className="l">time studied</span><span className="d">{st.activeDays} active {st.activeDays === 1 ? "day" : "days"}</span></div>
        <div className="tile"><span className="v">{st.lessonsDone}/{st.lessons}</span><span className="l">lessons done</span><span className="d">{st.lessonsDue ? `${st.lessonsDue} due for review` : "Nothing due"}</span></div>
      </div>

      <section className="card stack">
        <h2>Activity</h2>
        <Heatmap activity={st.activity} />
        <div className="tiny faint">Last 20 weeks. Brighter means more reviews and lessons.</div>
      </section>

      <section className="card stack">
        <div className="spread"><h2>Last 14 days</h2></div>
        <Bars data={daily} stack label="Reviews and new cards per day" />
        <div className="legend"><span><i style={{ background: "var(--primary)" }} />Reviews</span><span><i style={{ background: "var(--sky)" }} />New cards</span></div>
      </section>

      <section className="card stack">
        <div className="spread"><h2>Coming up</h2><span className="chip">{fmtNum(upcoming)} this week</span></div>
        <Bars data={fc} label="Reviews due in the next 14 days" />
        <div className="tiny faint">Reviews due each day. “T” is today and includes overdue cards.</div>
      </section>

      <section className="card stack">
        <h2>Your cards</h2>
        {st.perDeck.length === 0 && <p className="dim">No decks yet.</p>}
        {st.perDeck.map((p) => {
          const t = Math.max(1, p.total);
          return (
            <div className="deckstat" key={p.deck.id}>
              <div className="spread"><b>{p.deck.name}</b><span className="small dim">{fmtNum(p.total - p.fresh - p.suspended)} / {fmtNum(p.total)} started</span></div>
              <div className="bar bar-stack" role="img" aria-label={`${p.mature} mature, ${p.young} young, ${p.learning} learning, ${p.fresh} new`}>
                <i style={{ width: `${(p.mature / t) * 100}%`, background: "var(--sage)" }} />
                <i style={{ width: `${(p.young / t) * 100}%`, background: "var(--sand)" }} />
                <i style={{ width: `${(p.learning / t) * 100}%`, background: "var(--rose)" }} />
              </div>
              <div className="tiny faint">{fmtNum(p.mature)} mature · {fmtNum(p.young)} young · {fmtNum(p.learning)} learning · {fmtNum(p.fresh)} new{p.avgR ? ` · avg. recall ${Math.round(p.avgR * 100)}%` : ""}</div>
            </div>
          );
        })}
        <div className="legend"><span><i style={{ background: "var(--sage)" }} />Mature (3+ weeks)</span><span><i style={{ background: "var(--sand)" }} />Young</span><span><i style={{ background: "var(--rose)" }} />Learning</span></div>
      </section>

      <section className="card stack">
        <h2>New cards per week</h2>
        <Bars data={growth} label="New cards started per week" />
      </section>

      {projections.length > 0 && (
        <section className="card stack">
          <h2>At your pace</h2>
          {projections.map((p) => (
            <div className="spread" key={p.deck.id}>
              <span>{p.deck.name}</span>
              <span className="dim small">{plural(p.fresh, "card")} left · done {p.when.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
            </div>
          ))}
          <div className="tiny faint">Based on your daily new-card limit for each deck.</div>
        </section>
      )}

      {st.difficult.length > 0 && (
        <section className="card stack">
          <h2>Cards that keep slipping</h2>
          <div className="stack" style={{ gap: 8 }}>
            {st.difficult.map((c) => (
              <div className="spread" key={c.id}>
                <span><b lang="ja" style={{ fontSize: "1.2rem" }}>{c.f}</b> <span className="dim small">{String(c.m || "").slice(0, 28)}</span></span>
                <span className="chip chip-rose">{c.lapses} lapses</span>
              </div>
            ))}
          </div>
          <div className="tiny faint">Tip: make a vivid mnemonic for these, or suspend them for now from a session.</div>
        </section>
      )}
    </div>
  );
}
