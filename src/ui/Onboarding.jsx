import React, { useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import { UNITS, LESSONS } from "../content/lessons.js";
import { cloudConfigured } from "../lib/auth.js";

const LEVELS = [
  { v: "beginner", t: "Brand new", s: "I'm just starting. I don't read kana yet." },
  { v: "basics", t: "I know the basics", s: "I read hiragana and katakana and know a few words." },
  { v: "intermediate", t: "Intermediate", s: "I know basic grammar, some kanji and everyday words." },
  { v: "advanced", t: "Advanced", s: "I read fairly well and want to fill gaps and keep sharp." },
];

const FOCUS = [
  { v: "full", t: "Everything", s: "Kana, kanji, vocabulary and grammar lessons in a balanced plan." },
  { v: "conversation", t: "Speak and understand", s: "Grammar and vocabulary first. Kanji at a gentler pace." },
  { v: "kanji", t: "Kanji only", s: "Learn and strengthen kanji. No lessons, no vocabulary." },
  { v: "vocab", t: "Vocabulary and kanji", s: "Words and the kanji inside them. No grammar lessons." },
  { v: "maintain", t: "Just keep what I know", s: "Reviews only. No new cards, no lessons." },
];

const MINUTES = [10, 20, 30, 45];

const PER_DAY = { 10: { kana: 5, kanji: 4, vocab: 5, generic: 5 }, 20: { kana: 10, kanji: 8, vocab: 8, generic: 8 }, 30: { kana: 12, kanji: 10, vocab: 12, generic: 12 }, 45: { kana: 15, kanji: 15, vocab: 15, generic: 15 } };

export function planFor(focus, minutes) {
  const base = { ...(PER_DAY[minutes] || PER_DAY[20]) };
  let tracks = { kana: true, kanji: true, vocab: true, grammar: true };
  if (focus === "conversation") { tracks = { kana: true, kanji: true, vocab: true, grammar: true }; base.kanji = Math.max(3, Math.round(base.kanji / 2)); base.vocab = Math.round(base.vocab * 1.25); }
  if (focus === "kanji") { tracks = { kana: false, kanji: true, vocab: false, grammar: false }; base.kanji = Math.round(base.kanji * 1.8); }
  if (focus === "vocab") { tracks = { kana: false, kanji: true, vocab: true, grammar: false }; }
  if (focus === "maintain") { tracks = { kana: true, kanji: true, vocab: true, grammar: false }; base.kana = 0; base.kanji = 0; base.vocab = 0; base.generic = 0; }
  return { tracks, newPerDay: base };
}

const defaultKnown = (level) => ({
  hira: level !== "beginner",
  kata: level !== "beginner",
  u1: level === "intermediate" || level === "advanced",
  u2: level === "advanced",
  u3: false,
});

export function Onboarding({ store, onFinish, onSignIn }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(store.settings.name || "");
  const [level, setLevel] = useState("beginner");
  const [focus, setFocus] = useState("full");
  const [minutes, setMinutes] = useState(20);
  const [known, setKnown] = useState(defaultKnown("beginner"));
  const [touched, setTouched] = useState(false);
  const total = 5;

  const pickLevel = (v) => { setLevel(v); if (!touched) setKnown(defaultKnown(v)); };
  const toggle = (k) => { setTouched(true); setKnown((x) => ({ ...x, [k]: !x[k] })); };

  const knownLessons = useMemo(() => {
    const ids = [];
    for (const u of ["u1", "u2", "u3"]) if (known[u]) LESSONS.filter((l) => l.unit === u).forEach((l) => ids.push(l.id));
    return ids;
  }, [known]);

  const finish = () => {
    const plan = planFor(focus, minutes);
    store.ensureKanaDecks();
    if (known.hira) store.markKnown("kana-hira", 999);
    if (known.kata) store.markKnown("kana-kata", 999);
    if (knownLessons.length) store.markLessonsDone(knownLessons);
    store.updateSettings({ name: name.trim(), onboarded: true, level, focus, minutes, tracks: plan.tracks, newPerDay: plan.newPerDay });
    onFinish();
  };

  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="welcome">
      <div className="steps-dots" aria-label={`Step ${step + 1} of ${total}`}>{Array.from({ length: total }, (_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>

      {step === 0 && (
        <>
          <div className="brand-kanji" lang="ja">学</div>
          <div className="stack">
            <h1>Let's build your Japanese.</h1>
            <p className="dim">Spaced repetition for kana, kanji and words, plus short grammar lessons that use the words you actually know. Tell us a bit about you and we'll shape the plan.</p>
          </div>
          <div className="field">
            <label htmlFor="nm">What should we call you? (optional)</label>
            <input id="nm" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={30} />
          </div>
          <button className="btn btn-primary btn-lg btn-block" onClick={next}>Get started</button>
          {cloudConfigured && <button className="btn btn-soft btn-block" onClick={onSignIn}><Icon name="user" /> I already have an account</button>}
        </>
      )}

      {step === 1 && (
        <>
          <div className="stack"><h1>Where are you now?</h1><p className="dim">This decides what we skip. You can change everything later.</p></div>
          <div className="stack">
            {LEVELS.map((o) => (
              <button key={o.v} className="choice" aria-pressed={level === o.v} onClick={() => pickLevel(o.v)}>
                <div className="grow"><div className="ct">{o.t}</div><div className="cs">{o.s}</div></div>
                <span className="mark"><Icon name="check" /></span>
              </button>
            ))}
          </div>
          <Nav onBack={back} onNext={next} />
        </>
      )}

      {step === 2 && (
        <>
          <div className="stack"><h1>What do you want to work on?</h1><p className="dim">Pick the focus that fits your goal. For example, an advanced learner can choose kanji only.</p></div>
          <div className="stack">
            {FOCUS.map((o) => (
              <button key={o.v} className="choice" aria-pressed={focus === o.v} onClick={() => setFocus(o.v)}>
                <div className="grow"><div className="ct">{o.t}</div><div className="cs">{o.s}</div></div>
                <span className="mark"><Icon name="check" /></span>
              </button>
            ))}
          </div>
          <Nav onBack={back} onNext={next} />
        </>
      )}

      {step === 3 && (
        <>
          <div className="stack"><h1>How much time per day?</h1><p className="dim">Small and steady beats big and rare. We set the number of new cards from this.</p></div>
          <div className="row-wrap">
            {MINUTES.map((m) => <button key={m} className="chip" style={{ height: 48, padding: "0 22px", fontSize: "1rem" }} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>)}
          </div>
          <div className="card stack">
            <b>Your daily plan</b>
            <PlanPreview focus={focus} minutes={minutes} />
          </div>
          <Nav onBack={back} onNext={next} />
        </>
      )}

      {step === 4 && (
        <>
          <div className="stack"><h1>What do you already know?</h1><p className="dim">We'll mark these as known. They come back for a quick check over the next days, so nothing slips through.</p></div>
          <div className="stack">
            <Known on={known.hira} onClick={() => toggle("hira")} t="Hiragana" s="46 basic characters and their variants" />
            <Known on={known.kata} onClick={() => toggle("kata")} t="Katakana" s="The script for loanwords" />
            {UNITS.map((u) => <Known key={u.id} on={known[u.id]} onClick={() => toggle(u.id)} t={`Grammar: ${u.title}`} s={`${u.blurb} (${LESSONS.filter((l) => l.unit === u.id).length} lessons)`} />)}
          </div>
          <p className="hint">Kanji and vocabulary: import your Anki decks next from the Cards tab and tell the app how far you are.</p>
          <Nav onBack={back} onNext={finish} nextLabel="Start learning" />
        </>
      )}
    </div>
  );
}

function PlanPreview({ focus, minutes }) {
  const p = planFor(focus, minutes);
  const rows = [];
  if (p.tracks.kana && p.newPerDay.kana) rows.push(["Kana", `${p.newPerDay.kana} new a day`]);
  if (p.tracks.kanji) rows.push(["Kanji", p.newPerDay.kanji ? `${p.newPerDay.kanji} new a day` : "reviews only"]);
  if (p.tracks.vocab) rows.push(["Vocabulary", p.newPerDay.vocab ? `${p.newPerDay.vocab} new a day` : "reviews only"]);
  if (p.tracks.grammar) rows.push(["Grammar", "one lesson, then a quick review"]);
  return (
    <div className="stack" style={{ gap: 6 }}>
      {rows.map(([a, b]) => <div className="spread" key={a}><span className="dim">{a}</span><span>{b}</span></div>)}
      <div className="hint">Reviews always come first. You can adjust all of this in Settings.</div>
    </div>
  );
}

function Known({ on, onClick, t, s }) {
  return (
    <button className="choice" aria-pressed={on} onClick={onClick}>
      <div className="grow"><div className="ct">{t}</div><div className="cs">{s}</div></div>
      <span className="mark"><Icon name="check" /></span>
    </button>
  );
}

function Nav({ onBack, onNext, nextLabel = "Continue" }) {
  return (
    <div className="row onb-nav">
      <button className="btn btn-soft" onClick={onBack}>Back</button>
      <button className="btn btn-primary btn-lg grow" onClick={onNext}>{nextLabel}</button>
    </div>
  );
}
