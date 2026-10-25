// The dojo: the little samurai, the blade that cuts across a card you got right, combos, falling sakura, rank-up
// ceremonies, daily quests and achievements. Numbers come from lib/game.js, feedback from lib/fx.js.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, Ring } from "./common.jsx";
import { Icon } from "./icons.jsx";
import { progress as dojoProgress, newEvents, BELT_COLOURS, RANKS, GOALS } from "../lib/game.js";
import { LESSONS } from "../content/lessons.js";
import * as fx from "../lib/fx.js";
import { dayKey } from "../lib/time.js";

const reducedMotion = () => document.documentElement.dataset.motion === "reduced" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------------
// numbers

/** Rough availability without the expensive plan inputs: enough to pick quests you can actually do. */
function questAvail(store) {
  const s = store.settings || {};
  const t = s.tracks || {};
  const maintain = s.focus === "maintain";
  const grammarOn = t.grammar !== false && !maintain;
  const done = LESSONS.filter((l) => store.lessons[l.id]?.done).length;
  return { lesson: grammarOn, sentences: grammarOn && done >= 3, reading: t.vocab !== false && !maintain, write: t.kanji !== false || t.kana !== false };
}

export function dojoFor(store, now = Date.now()) {
  const lessonsDone = LESSONS.filter((l) => store.lessons[l.id]?.done).length;
  return dojoProgress(store, now, { lessonsTotal: LESSONS.length, lessonsDone, avail: questAvail(store), cached: true });
}

/** The dojo numbers, recomputed when the store changes (cheap: the ledger is folded incrementally). */
export function useDojo(now = Date.now()) {
  const { store } = useApp();
  const v = store.getVersion();
  const day = dayKey(now);
  return useMemo(() => dojoFor(store, now), [v, day, store.settings.xpGoal]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------------------------------------------------------------------------
// the samurai (an original little character: topknot, red hachimaki, ember haori, a katana)
const SKIN = "#f4d3b3", HAIR = "#2a2220", HAKAMA = "#3b4161", RED = "#d4473a", STEEL = "#e9eef2", GOLD = "#e6c07b";

export const Samurai = memo(function Samurai({ mood = "idle", size = 96, belt = "white", className = "", onClick, title = "" }) {
  const beltColour = BELT_COLOURS[belt] || belt;
  const sword = mood === "cheer";
  const eyes = (() => {
    if (mood === "happy" || mood === "cheer") return <g stroke={HAIR} strokeWidth="2.8" strokeLinecap="round" fill="none"><path d="M44.5 57 Q49 51.5 53.5 57" /><path d="M66.5 57 Q71 51.5 75.5 57" /></g>;
    if (mood === "bow") return <g stroke={HAIR} strokeWidth="2.6" strokeLinecap="round"><path d="M45 57 L53 57" /><path d="M67 57 L75 57" /></g>;
    return (
      <g className="sam-eyes">
        <ellipse cx="49" cy="56.5" rx={mood === "sad" ? 2.8 : 3.4} ry={mood === "sad" ? 3.6 : 4.4} fill={HAIR} />
        <ellipse cx="71" cy="56.5" rx={mood === "sad" ? 2.8 : 3.4} ry={mood === "sad" ? 3.6 : 4.4} fill={HAIR} />
        <circle cx="50.2" cy="54.6" r="1.2" fill="#fff" /><circle cx="72.2" cy="54.6" r="1.2" fill="#fff" />
      </g>
    );
  })();
  const mouth = {
    idle: <path d="M56 66.5 Q60 69.5 64 66.5" stroke={HAIR} strokeWidth="2" fill="none" strokeLinecap="round" />,
    happy: <path d="M55 65 Q60 72.5 65 65 Z" fill="#7a2e22" />,
    cheer: <path d="M53.5 64 Q60 76 66.5 64 Z" fill="#7a2e22" />,
    sad: <path d="M56 68.5 Q60 65.5 64 68.5" stroke={HAIR} strokeWidth="2" fill="none" strokeLinecap="round" />,
    bow: <path d="M57 67 Q60 68.5 63 67" stroke={HAIR} strokeWidth="2" fill="none" strokeLinecap="round" />,
  }[mood] || null;
  return (
    <svg className={`sam ${mood} ${className}`} width={size} height={size * (140 / 120)} viewBox="0 0 120 140" role={onClick ? "button" : "img"} aria-label={title || "Your samurai"} onClick={onClick} tabIndex={onClick ? 0 : undefined}>
      <ellipse className="sam-shadow" cx="60" cy="132" rx="30" ry="4.5" fill="#000" opacity="0.22" />
      <g className="sam-bob">
        {/* the katana at the hip, behind the body */}
        {!sword && (
          <g className="sam-saya">
            <path d="M40 116 L104 86" stroke={HAIR} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M88 93.5 L106 85" stroke="#efe4d2" strokeWidth="5" strokeLinecap="round" strokeDasharray="2.2 2.2" />
            <ellipse cx="87" cy="94" rx="2.6" ry="5" fill={GOLD} transform="rotate(-25 87 94)" />
          </g>
        )}
        {/* hakama */}
        <path d="M40 100 L80 100 L89 127 Q60 132 31 127 Z" fill={HAKAMA} />
        <path d="M60 103 L60 129" stroke="#00000033" strokeWidth="2" />
        <ellipse cx="46" cy="129" rx="7" ry="3" fill={HAIR} /><ellipse cx="74" cy="129" rx="7" ry="3" fill={HAIR} />
        {/* haori */}
        <path d="M37 83 Q60 74 83 83 L85 104 Q60 109 35 104 Z" fill="var(--primary)" />
        <path d="M51 78 L60 95 L69 78" stroke="#fff6ee" strokeWidth="3.4" fill="none" strokeLinejoin="round" />
        <rect x="36" y="96.5" width="48" height="7" rx="2.5" fill={beltColour} stroke="#00000022" strokeWidth="0.8" />
        {/* left arm */}
        <path d="M38 84 Q27 92 30 104 Q37 107 42 99 Z" fill="var(--primary)" />
        <path d="M38 84 Q27 92 30 104" stroke="#00000022" strokeWidth="1.5" fill="none" />
        <circle cx="32" cy="104" r="4.6" fill={SKIN} />
        {/* right arm: on the hilt, or raising the blade */}
        {sword ? (
          <g className="sam-blade">
            <path d="M82 84 Q96 76 99 60 L92 58 Q90 72 80 78 Z" fill="var(--primary)" />
            <path className="sam-steel" d="M98 54 L103.5 4 L106 6 L101.5 55 Z" fill={STEEL} />
            <path d="M103.5 4 L106 6" stroke="#fff" strokeWidth="1.2" />
            <ellipse cx="99.5" cy="56" rx="6" ry="2.4" fill={GOLD} transform="rotate(8 99.5 56)" />
            <path d="M98.5 57 L97.5 66" stroke="#efe4d2" strokeWidth="4.6" strokeLinecap="round" strokeDasharray="2 2" />
            <circle cx="97" cy="60" r="4.6" fill={SKIN} />
            <path className="sam-gleam" d="M100 40 L104.5 10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <path d="M82 84 Q93 92 90 104 Q83 107 78 99 Z" fill="var(--primary)" />
            <circle cx="88" cy="102" r="4.6" fill={SKIN} />
          </g>
        )}
        {/* head */}
        <g className="sam-head">
          <circle cx="60" cy="50" r="30" fill={SKIN} />
          <path d="M30 50 Q29 19 60 18 Q91 19 90 50 Q87 36 60 34.5 Q33 36 30 50 Z" fill={HAIR} />
          <ellipse cx="60" cy="14.5" rx="6.5" ry="8.5" fill={HAIR} />
          <rect x="55" y="20" width="10" height="3.4" rx="1.4" fill="#fff6ee" />
          <path d="M30.6 40.5 Q60 30.5 89.4 40.5 L89 47.5 Q60 37.5 31 47.5 Z" fill={RED} />
          <g className="sam-tails">
            <path d="M89 44 Q101 39 111 45" stroke={RED} strokeWidth="4.2" strokeLinecap="round" fill="none" />
            <path d="M89 45.5 Q99 51 104 60" stroke={RED} strokeWidth="4.2" strokeLinecap="round" fill="none" />
            <circle cx="89.5" cy="44.5" r="3.6" fill={RED} />
          </g>
          {mood === "sad" && <g stroke={HAIR} strokeWidth="2.2" strokeLinecap="round"><path d="M44 51 L53 48.5" /><path d="M76 51 L67 48.5" /></g>}
          {eyes}
          <ellipse cx="42" cy="64" rx="4.6" ry="2.6" fill="#f2877e" opacity="0.45" />
          <ellipse cx="78" cy="64" rx="4.6" ry="2.6" fill="#f2877e" opacity="0.45" />
          {mouth}
        </g>
      </g>
    </svg>
  );
});

/** A small belt with its knot, in the colour of a rank. */
export function Belt({ belt = "white", size = 34 }) {
  const c = BELT_COLOURS[belt] || belt;
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 50 30" aria-hidden="true" className="belt">
      <rect x="1" y="9" width="48" height="9" rx="3" fill={c} stroke="#00000033" />
      <path d="M21 10 L29 10 L31 18 L19 18 Z" fill={c} stroke="#00000044" />
      <path d="M22 17 L15 29 L21 29 L25 19 Z M28 17 L35 29 L29 29 L25 19 Z" fill={c} stroke="#00000044" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// what the samurai says
const LINES = {
  start: [
    ["頑張って！", "Ganbatte!", "Give it your best."],
    ["千里の道も一歩から", "Senri no michi mo ippo kara", "A thousand-ri journey starts with one step."],
    ["継続は力なり", "Keizoku wa chikara nari", "Persistence is power."],
    ["塵も積もれば山となる", "Chiri mo tsumoreba yama to naru", "Even dust piles up into a mountain."],
    ["習うより慣れろ", "Narau yori narero", "Get used to it rather than study it."],
    ["一期一会", "Ichigo ichie", "One time, one meeting: make today count."],
  ],
  mid: [["いいね！", "Ii ne!", "Nice! Keep the blade moving."], ["七転び八起き", "Nana korobi ya oki", "Fall seven times, stand up eight."], ["その調子！", "Sono chōshi!", "That's the spirit!"]],
  done: [["お疲れ様！", "Otsukaresama!", "Good work today."], ["よくできました", "Yoku dekimashita", "Well done."], ["見事！", "Migoto!", "Splendid!"]],
  risk: [["急げ！", "Isoge!", "Hurry: your streak ends at 4 am."]],
};
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

/** The samurai with a speech bubble, for Today. Tap him for a flourish. */
export function DojoGreeting({ dojo, planDone, planStarted }) {
  const { store } = useApp();
  const now = Date.now();
  const hour = new Date(now).getHours();
  const atRisk = dojo.streak.current > 0 && !dojo.streak.today && (hour >= 18 || hour < 4);
  const mood = planDone || dojo.goalMet ? "happy" : atRisk ? "sad" : "idle";
  const kind = planDone || dojo.goalMet ? "done" : atRisk ? "risk" : planStarted ? "mid" : "start";
  const [tap, setTap] = useState(0);
  const seed = Number(dayKey(now).replace(/-/g, "")) + tap;
  const [jp, romaji, en] = pick(LINES[kind], seed);
  const [cheer, setCheer] = useState(false);
  const onTap = useCallback(() => {
    setTap((t) => t + 1);
    setCheer(true);
    fx.flourish();
    setTimeout(() => setCheer(false), 1100);
  }, []);
  if (store.settings.mascot === false) return null;
  return (
    <div className="dojo-greet">
      <Samurai mood={cheer ? "cheer" : mood} size={84} belt={dojo.rank.rank.belt} onClick={onTap} title="Your samurai. Tap for a flourish." className={cheer ? "flourish" : ""} />
      <div className="bubble" key={jp} aria-live="polite">
        <div className="b-jp" lang="ja">{jp}</div>
        <div className="b-ro">{romaji}</div>
        <div className="b-en">{en}</div>
      </div>
    </div>
  );
}

/** Rank, today's XP against the goal, streak: the bar at the top of Today. */
export function DojoBar({ dojo, onOpen }) {
  const { rank, today, goal, streak } = dojo;
  return (
    <button type="button" className="dojo-bar" onClick={onOpen} aria-label={`Rank ${rank.rank.name}, ${today} of ${goal} XP today, ${streak.current} day streak. Open the dojo.`}>
      <span className="db-rank"><Belt belt={rank.rank.belt} size={30} /><b lang="ja">{rank.rank.jp}</b></span>
      <span className="db-xp">
        <span className="db-track"><i style={{ width: `${Math.min(100, (today / goal) * 100)}%` }} /></span>
        <span className="small num"><b>{today}</b>/{goal} XP</span>
      </span>
      <span className={`db-streak ${streak.today ? "lit" : ""}`}><Icon name="flame" size={20} /><b className="num">{streak.current}</b></span>
    </button>
  );
}

/** The three daily quests. */
export function Quests({ dojo }) {
  return (
    <section className="card quests" aria-label="Daily quests">
      <div className="spread"><h2><span lang="ja" className="q-kanji">修行</span> Daily quests</h2><span className="small dim">new each day</span></div>
      {dojo.quests.map((q) => (
        <div key={q.id} className={`quest ${q.done ? "done" : ""}`}>
          <span className="q-icon" aria-hidden="true">{q.done ? <Icon name="check" size={18} /> : <span lang="ja">{QUEST_KANJI[q.kind] || "修"}</span>}</span>
          <div className="grow">
            <div className="q-title">{q.title}</div>
            <div className="q-track" role="progressbar" aria-valuemin={0} aria-valuemax={q.need} aria-valuenow={q.have}><i style={{ width: `${(q.have / q.need) * 100}%` }} /></div>
          </div>
          <span className="q-reward num">{q.done ? "✓" : `+${q.reward}`}</span>
        </div>
      ))}
    </section>
  );
}
const QUEST_KANJI = { cards: "札", combo: "連", xp: "力", lesson: "学", write: "書", new: "新", read: "読", sentences: "文" };

/** Rank card and achievements (Stats → Dojo). */
export function DojoPanel() {
  const dojo = useDojo();
  const { store } = useApp();
  const { rank } = dojo;
  const got = dojo.badges.filter((b) => b.got).length;
  return (
    <section className="stack dojo-panel" aria-label="Dojo">
      <div className="card rank-card">
        <Samurai mood="idle" size={74} belt={rank.rank.belt} />
        <div className="grow stack" style={{ gap: 4 }}>
          <span className="small dim">Your rank</span>
          <div className="row" style={{ gap: 10 }}><b className="rank-jp" lang="ja">{rank.rank.jp}</b><span>{rank.rank.name}</span></div>
          <div className="q-track big" role="progressbar" aria-valuemin={0} aria-valuemax={rank.span} aria-valuenow={rank.into}><i style={{ width: `${rank.progress * 100}%` }} /></div>
          <span className="small dim num">{rank.next ? `${dojo.xp.toLocaleString()} XP · ${(rank.next.xp - dojo.xp).toLocaleString()} to ${rank.next.jp} ${rank.next.name}` : `${dojo.xp.toLocaleString()} XP · the highest rank`}</span>
        </div>
      </div>
      <div className="tiles">
        <div className="tile"><span className="v num">{dojo.streak.best}</span><span className="l">longest streak</span></div>
        <div className="tile"><span className="v num">{dojo.led.maxCombo}</span><span className="l">best combo</span></div>
      </div>
      <div className="card stack">
        <div className="spread"><h2>Achievements</h2><span className="small dim num">{got}/{dojo.badges.length}</span></div>
        <div className="badges">
          {dojo.badges.map((b) => (
            <div key={b.id} className={`badge ${b.got ? "got" : ""}`} title={b.desc}>
              <span className="medal" lang="ja">{b.jp}</span>
              <b>{b.name}</b>
              <small>{b.got ? b.desc : b.need > 1 ? `${b.have.toLocaleString()}/${b.need.toLocaleString()}` : b.desc}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="card stack">
        <h2>Ranks</h2>
        <div className="ranks">
          {RANKS.map((r, i) => (
            <div key={r.jp} className={`rk ${i < rank.index ? "past" : i === rank.index ? "now" : ""}`}><Belt belt={r.belt} size={26} /><b lang="ja">{r.jp}</b><small className="num">{r.xp.toLocaleString()}</small></div>
          ))}
        </div>
      </div>
      <p className="small dim">XP comes from everything in your review log, so it is the same on every device. Daily goal: {GOALS.find((g) => g.value === (store.settings.xpGoal || 50))?.label || "Regular"} ({store.settings.xpGoal || 50} XP), change it in Settings → Sound and feel.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// the live combo, for the session screens
export function ComboChip() {
  const [n, setN] = useState(fx.currentCombo());
  const [pop, setPop] = useState(0);
  useEffect(() => fx.onFx((type, d) => { if (type === "combo") { setN(d.n); if (d.n) setPop((p) => p + 1); } }), []);
  if (n < 3) return null;
  return <span className={`combo-chip ${n >= 10 ? "hot" : ""}`} key={pop} aria-label={`${n} in a row`}><b className="num">{n}</b><span lang="ja">連</span></span>;
}

/** XP gained in this sitting, for end screens: give it the XP at the start. */
export function SessionXp({ startXp, label = "XP earned" }) {
  const dojo = useDojo();
  const gained = Math.max(0, dojo.xp - startXp);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reducedMotion()) { setShown(gained); return undefined; }
    let raf, t0;
    const step = (t) => { t0 = t0 || t; const k = Math.min(1, (t - t0) / 900); setShown(Math.round(gained * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gained]);
  const { rank, today, goal } = dojo;
  return (
    <div className="session-xp">
      <div className="sx-row">
        <div className="sx-big"><b className="num">+{shown}</b><span>{label}</span></div>
        <Ring size={64} stroke={7} value={Math.min(1, today / goal)}><span className="tiny num"><b>{Math.min(999, today)}</b>/{goal}</span></Ring>
      </div>
      <div className="sx-rank"><Belt belt={rank.rank.belt} size={28} /><b lang="ja">{rank.rank.jp}</b><div className="q-track grow"><i style={{ width: `${rank.progress * 100}%` }} /></div>{rank.next && <span lang="ja" className="small dim">{rank.next.jp}</span>}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// celebrations: watches the numbers and announces new ranks, achievements, quests and the day's goal

export function DojoWatcher({ busy }) {
  const { store } = useApp();
  const v = store.getVersion();
  const pending = useRef([]);
  const [modal, setModal] = useState(null);
  const timer = useRef(0);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      let p;
      try { p = dojoFor(store); } catch (e) { console.error(e); return; }
      const ev = newEvents(p);
      for (const q of ev.quests) { fx.quest(); fx.emit("banner", { jp: QUEST_KANJI[q.kind] || "修", title: "Quest complete", sub: `${q.title} · +${q.reward} XP` }); }
      if (ev.goal) { fx.goal(); fx.emit("banner", { jp: "的", title: "Daily goal reached", sub: `${p.today} XP today${p.streak.current > 1 ? ` · ${p.streak.current}-day streak` : ""}`, tone: "gold" }); }
      for (const b of ev.badges) pending.current.push({ kind: "badge", badge: b });
      if (ev.rankUp) pending.current.push({ kind: "rank", rank: ev.rankUp, next: p.rank.next });
      if (busy) for (const b of ev.badges) fx.emit("banner", { jp: b.jp, title: "Achievement", sub: b.name });
      if (busy && ev.rankUp) fx.emit("banner", { jp: ev.rankUp.jp, title: "New rank", sub: ev.rankUp.name, tone: "gold" });
    }, 350);
    return () => clearTimeout(timer.current);
  }, [v, store, busy]);
  // the ceremonies wait until you are back from a session (automated tests can turn them off)
  useEffect(() => {
    if (busy || modal || !pending.current.length) return undefined;
    let quiet = false;
    try { quiet = localStorage.getItem("nt-quiet-dojo") === "1"; } catch { /* ignore */ }
    if (quiet) { pending.current = []; return undefined; }
    const t = setTimeout(() => {
      const next = pending.current.find((x) => x.kind === "rank") || pending.current[0];
      pending.current = pending.current.filter((x) => x !== next);
      setModal(next);
    }, 450);
    return () => clearTimeout(t);
  });
  if (!modal) return null;
  return <Ceremony item={modal} onClose={() => setModal(null)} />;
}

function Ceremony({ item, onClose }) {
  useEffect(() => { if (item.kind === "rank") fx.levelUp(item.rank); else fx.badge(); }, [item]);
  const belt = item.kind === "rank" ? item.rank.belt : null;
  return (
    <div className="scrim ceremony-scrim" onClick={onClose}>
      <div className={`ceremony ${item.kind}`} role="dialog" aria-modal="true" aria-label={item.kind === "rank" ? "New rank" : "Achievement"} onClick={(e) => e.stopPropagation()}>
        {item.kind === "rank" ? (
          <>
            <div className="scroll">
              <span className="rod l" /><span className="rod r" />
              <div className="paper">
                <span className="sc-label">昇段 · promotion</span>
                <b className="sc-rank" lang="ja">{item.rank.jp}</b>
                <span className="sc-name">{item.rank.name}</span>
                <Belt belt={belt} size={70} />
              </div>
            </div>
            <Samurai mood="cheer" size={92} belt={belt} />
            <p className="dim center">{item.next ? `Next: ${item.next.jp} ${item.next.name} at ${item.next.xp.toLocaleString()} XP` : "The highest rank. 師範, a master."}</p>
          </>
        ) : (
          <>
            <div className="medal-big" lang="ja"><span>{item.badge.jp}</span><i className="shine" /></div>
            <span className="sc-label">Achievement unlocked</span>
            <h2>{item.badge.name}</h2>
            <p className="dim center">{item.badge.desc}</p>
          </>
        )}
        <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>{item.kind === "rank" ? "押忍!  Continue" : "Continue"}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// the effects layer: blade slashes, XP, combo banners, sakura

let fxSeq = 0;
export function FxLayer() {
  const [items, setItems] = useState([]);
  const canvas = useRef(null);
  const petals = useRef({ list: [], raf: 0 });
  const remove = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const add = useCallback((x, ms) => { const id = ++fxSeq; setItems((xs) => [...xs.slice(-12), { ...x, id }]); setTimeout(() => remove(id), ms); }, [remove]);

  const spawnPetals = useCallback((n) => {
    const c = canvas.current;
    if (!c || reducedMotion()) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const P = petals.current;
    const cols = ["#f7c6d0", "#f4b0c0", "#fbdde3", "#ee9db0", "#fff1f3"];
    n = Math.min(n, 110 - P.list.length); // never a blizzard
    for (let i = 0; i < n; i++) {
      const fromTop = Math.random() < 0.55;
      P.list.push({
        x: fromTop ? Math.random() * W : W / 2 + (Math.random() - 0.5) * 80,
        y: fromTop ? -20 - Math.random() * H * 0.4 : H * 0.32,
        vx: fromTop ? (Math.random() - 0.3) * 40 : (Math.random() - 0.5) * 520,
        vy: fromTop ? 40 + Math.random() * 60 : -260 - Math.random() * 320,
        r: 5 + Math.random() * 6, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 6, flip: Math.random() * 6.28, vf: 2 + Math.random() * 4,
        sway: Math.random() * 6.28, c: cols[i % cols.length], life: 0,
      });
    }
    if (P.raf) return;
    let last = performance.now();
    const ctx = c.getContext("2d");
    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      P.list = P.list.filter((p) => p.y < H + 30 && p.life < 5.5);
      for (const p of P.list) {
        p.life += dt;
        p.vy += (p.vy < 70 ? 420 : 0) * dt; // gravity until they float
        p.vx *= 1 - 1.4 * dt;
        p.sway += dt * 2.2;
        p.x += (p.vx + Math.sin(p.sway) * 28) * dt; p.y += p.vy * dt;
        p.a += p.va * dt; p.flip += p.vf * dt;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(Math.cos(p.flip), 1);
        ctx.globalAlpha = Math.min(1, (5.5 - p.life) / 1.5);
        ctx.fillStyle = p.c;
        const r = p.r;
        ctx.beginPath();
        ctx.moveTo(0, r);
        ctx.bezierCurveTo(r * 0.95, r * 0.55, r * 0.9, -r * 0.7, r * 0.22, -r);
        ctx.lineTo(0, -r * 0.72); // the notch at the tip of a cherry petal
        ctx.lineTo(-r * 0.22, -r);
        ctx.bezierCurveTo(-r * 0.9, -r * 0.7, -r * 0.95, r * 0.55, 0, r);
        ctx.fill();
        ctx.restore();
      }
      if (P.list.length) P.raf = requestAnimationFrame(tick);
      else { P.raf = 0; ctx.clearRect(0, 0, W, H); }
    };
    P.raf = requestAnimationFrame(tick);
  }, []);

  useEffect(() => fx.onFx((type, d) => {
    const motion = !reducedMotion();
    if (type === "slash") {
      const r = rectOf(d.el);
      if (motion) add({ type: "slash", r, strong: d.strong, angle: -14 - Math.random() * 12 }, 700);
      if (d.el && d.el.animate && motion) d.el.animate([{ filter: "brightness(1.18)" }, { filter: "none" }], { duration: 320, easing: "ease-out" });
    } else if (type === "miss") {
      if (d.el && d.el.animate && motion) d.el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-3px)" }, { transform: "none" }], { duration: 320, easing: "ease-out" });
    } else if (type === "xp") {
      const r = rectOf(d.el);
      add({ type: "xp", x: r.left + r.width - 34, y: r.top + 22, xp: d.xp }, 1100);
    } else if (type === "combo" && d.milestone) {
      add({ type: "combo", n: d.n }, 1500);
      if (motion) add({ type: "slash", r: { left: 0, top: window.innerHeight * 0.18, width: window.innerWidth, height: window.innerHeight * 0.3 }, strong: true, angle: -8, wide: true }, 700);
    } else if (type === "petals") {
      spawnPetals(d.n || 40);
    } else if (type === "banner") {
      add({ type: "banner", ...d }, 3000);
    } else if (type === "flourish") {
      if (motion) spawnPetals(14);
    }
  }), [add, spawnPetals]);

  useEffect(() => () => cancelAnimationFrame(petals.current.raf), []);

  return (
    <div className="fx-layer" aria-hidden="true">
      <canvas ref={canvas} className="fx-petals" />
      {items.map((it) => {
        if (it.type === "slash") return <Slash key={it.id} {...it} />;
        if (it.type === "xp") return <span key={it.id} className="fx-xp num" style={{ left: it.x, top: it.y }}>+{it.xp} XP</span>;
        if (it.type === "combo") return (
          <div key={it.id} className="fx-combo">
            <svg className="fx-brush" viewBox="0 0 300 90" preserveAspectRatio="none"><path d="M6 52 C 60 20, 140 30, 296 26 C 230 60, 120 70, 8 66 Z" /></svg>
            <b className="num">{it.n}</b><span lang="ja">連撃</span><small>combo!</small>
          </div>
        );
        if (it.type === "banner") return (
          <div key={it.id} className={`fx-banner ${it.tone || ""}`} role="status">
            <span className="fb-jp" lang="ja">{it.jp}</span><span className="grow"><b>{it.title}</b><small>{it.sub}</small></span>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function rectOf(el) {
  if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect(); if (r.width > 0) return { left: r.left, top: r.top, width: r.width, height: r.height }; }
  const w = Math.min(window.innerWidth - 32, 560);
  return { left: (window.innerWidth - w) / 2, top: window.innerHeight * 0.2, width: w, height: window.innerHeight * 0.4 };
}

/** One cut of the blade: a bright edge drawn across the card in a blink, with a coloured glow and a few sparks. */
function Slash({ r, strong, angle, wide }) {
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const len = Math.hypot(r.width, r.height) * (wide ? 1.1 : 0.95);
  const sparks = useMemo(() => Array.from({ length: strong ? 9 : 5 }, () => ({ a: (Math.random() - 0.5) * 140, d: 30 + Math.random() * 60, s: 2 + Math.random() * 3 })), [strong]);
  const cut = (k, delay, flipped) => (
    <div className="fx-slash" style={{ left: cx - len / 2, top: cy, width: len, transform: `rotate(${flipped ? -angle - 180 + 360 : angle}deg)`, animationDelay: `${delay}ms`, "--k": k }}>
      <svg viewBox="0 0 400 40" preserveAspectRatio="none" width="100%" height={wide ? 46 : 34}>
        <path className="glow" d="M0 22 Q200 8 400 18 Q200 26 0 22 Z" />
        <path className="edge" pathLength="1" d="M4 21 Q200 11 396 18" style={{ animationDelay: `${delay}ms` }} />
      </svg>
      <span className="sparks" style={{ animationDelay: `${delay + 120}ms` }}>
        {sparks.map((s, i) => <i key={i} style={{ "--a": `${s.a}deg`, "--d": `${s.d}px`, width: s.s, height: s.s }} />)}
      </span>
    </div>
  );
  return <>{cut(1, 0, false)}{strong && cut(0.8, 110, true)}</>;
}
