import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Furi, Sentence } from "./Furi.jsx";
import { useApp, plural } from "./common.jsx";
import { InkWord, Hanko } from "./Ink.jsx";
import { buildSession, buildCounts, todayCounts, LEARN_AHEAD } from "../lib/queue.js";
import { previewDelays, LEARNING, RELEARNING, NEW } from "../lib/fsrs.js";
import { fmtSpan } from "../lib/time.js";
import { deckOf, isProd, baseId } from "../lib/ids.js";
import { kanjiOf } from "../lib/jp.js";
import { computeStats } from "../lib/stats.js";
import * as hap from "../lib/haptics.js";
import * as fx from "../lib/fx.js";
import { cardXp, comboBonus } from "../lib/game.js";
import { Samurai, ComboChip, SessionXp, dojoFor } from "./Dojo.jsx";
import { audioPlan, say, stop as stopAudio, wordPart, sentencePart, mediaUrl } from "../lib/audio.js";
import { plainOf, readingOf } from "../lib/jp.js";
import { SpeakBtn, MicBtn } from "./Voice.jsx";
import { unitsFromMarkup } from "../lib/pronounce.js";
import { WriteBtn } from "./Writing.jsx";
import { RecallPrompt, RecallInput, RecallVerdict } from "./Recall.jsx";
import { NoteSheet, kanjiPartsOf } from "./Leech.jsx";
import { SentenceIndex, pickSentence } from "../lib/sentenceIndex.js";
import { isLeechHit } from "../lib/leech.js";
import { PitchLine } from "./Pitch.jsx";
import { readingsFromCards, cardFurigana } from "../lib/furigana.js";
import { parseFuri } from "../lib/jp.js";

/** Decide which card comes next. Due learning cards first, then the main list, weak spots, then waiting learning cards. */
function pickNext(store, main, learnQ, weak = [], now = Date.now()) {
  const ok = (id) => !!store.card(id);
  const learn = learnQ.filter((x) => ok(x.id)).sort((a, b) => a.due - b.due);
  const due = learn.find((x) => x.due <= now);
  if (due) return { id: due.id, src: "learn" };
  const m = main.find(ok);
  if (m) return { id: m, src: "main" };
  const w = weak.find(ok);
  if (w) return { id: w, src: "weak" };
  if (learn.length) return { id: learn[0].id, src: "learn" };
  return null;
}

export function Study({ opts = {}, onClose, onOpen }) {
  const { store } = useApp();
  const [initial] = useState(() => {
    const s = buildSession(store, Date.now(), opts);
    const learnQ = s.learning.map((id) => ({ id, due: store.rec(id)?.due || 0 }));
    // the bar covers the whole day: cards already finished earlier today count as done, so leaving and coming back
    // keeps it where it was instead of starting at zero
    const pending = new Set([...s.learning, ...s.main, ...(s.weak || [])]);
    let doneBefore = 0;
    for (const id of todayCounts(store, Date.now()).seen) if (!pending.has(id) && store.card(id)) doneBefore++;
    return { main: s.main, learnQ, weak: s.weak || [], total: s.main.length + s.learning.length + (s.weak || []).length, doneBefore };
  });
  const [main, setMain] = useState(initial.main);
  const [learnQ, setLearnQ] = useState(initial.learnQ);
  const [weak, setWeak] = useState(initial.weak);
  const [finished, setFinished] = useState(0);
  const [cur, setCur] = useState(() => pickNext(store, initial.main, initial.learnQ, initial.weak));
  const [shown, setShown] = useState(false);
  const [recallRes, setRecallRes] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [history, setHistory] = useState([]);
  const [tally, setTally] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, ms: 0 });
  const [startXp] = useState(() => { try { return dojoFor(store).xp; } catch { return 0; } });
  const flashRef = useRef(null);
  const answered = useRef(new Set());
  const startRef = useRef(Date.now());
  const wordIndex = useRef(null);
  // which kanji read how, learned from all your vocabulary: lets furigana sit over each kanji
  const kanjiReadings = useMemo(() => {
    const cards = [];
    for (const d of store.deckList()) if (d.kind === "vocab") cards.push(...Object.values(store.content[d.id] || {}));
    return readingsFromCards(cards);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const lexRef = useRef(null);
  const [sIndex, setSIndex] = useState(null);
  const [guess, setGuess] = useState(""); // pretesting: what you think a new card means, before you see it

  const isP = !!cur && isProd(cur.id);
  const card = cur ? store.card(cur.id) : null;
  const deck = cur ? store.decks[deckOf(cur.id)] : null;
  const rec = cur ? store.rec(cur.id) : null;
  const baseRec = cur ? store.rec(baseId(cur.id)) : null;

  useEffect(() => { startRef.current = Date.now(); setGuess(""); }, [cur?.id]);

  // other sentences for the same word are indexed in the background
  useEffect(() => {
    const si = new SentenceIndex(store);
    const t = setTimeout(() => si.start((x) => { lexRef.current = x.lex; setSIndex(x); }), 500);
    return () => { clearTimeout(t); si.cancel(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const delays = useMemo(() => {
    if (!cur || !shown) return null;
    try { return previewDelays(rec, Date.now(), store.cfgFor(cur.id), cur.id); } catch { return null; }
  }, [cur, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = useCallback(() => { if (cur && !shown && !isProd(cur.id)) { setShown(true); fx.reveal(); } }, [cur, shown]);
  const showRecall = useCallback((res) => { setRecallRes(res); setShown(true); }, []);

  const grade = useCallback((g) => {
    if (!cur || !shown) return;
    const ms = Date.now() - startRef.current;
    const entry = store.reviewCard(cur.id, g, ms);
    const snap = { entry, main, learnQ, weak, finished, tally, cur };
    let nm = main;
    let nw = weak;
    let nl = learnQ.filter((x) => x.id !== cur.id);
    if (cur.src === "main") nm = main.filter((x) => x !== cur.id);
    if (cur.src === "weak") nw = weak.filter((x) => x !== cur.id);
    const nx = entry.next;
    let requeued = false;
    if ((nx.st === LEARNING || nx.st === RELEARNING) && nx.due <= Date.now() + LEARN_AHEAD) { nl = [...nl, { id: cur.id, due: nx.due }]; requeued = true; }
    setHistory((h) => [...h.slice(-19), snap]);
    setTally((t) => ({ ...t, [g]: t[g] + 1, ms: t.ms + Math.min(ms, 120000) }));
    if (!requeued) setFinished((f) => f + 1);
    setMain(nm);
    setWeak(nw);
    setLearnQ(nl);
    setCur(pickNext(store, nm, nl, nw));
    setShown(false);
    const first = !answered.current.has(cur.id) && cur.src !== "learn";
    answered.current.add(cur.id);
    const xp = cardXp([0, cur.id, g, 0, entry.prev ? entry.prev.st : NEW], first) + (g >= 3 ? comboBonus(fx.currentCombo() + 1) : 0);
    fx.answer({ grade: g, el: flashRef.current, xp });
    if (isLeechHit(entry.prev, nx, g)) setSheet({ type: "leech", id: baseId(cur.id), lapses: nx.lapses });
  }, [cur, shown, main, learnQ, weak, finished, tally, store]);

  const undo = useCallback(() => {
    const snap = history[history.length - 1];
    if (!snap) return;
    store.undoReview(snap.entry);
    setHistory((h) => h.slice(0, -1));
    setMain(snap.main); setLearnQ(snap.learnQ); setWeak(snap.weak); setFinished(snap.finished); setTally(snap.tally);
    setCur(snap.cur); setShown(false); setRecallRes(null);
    hap.tap();
  }, [history, store]);

  const suspend = useCallback(() => {
    if (!cur) return;
    store.toggleSuspend(baseId(cur.id));
    // suspending a word also pauses its recall card
    const drop = (x) => baseId(x) !== baseId(cur.id);
    const nm = main.filter(drop);
    const nw = weak.filter(drop);
    const nl = learnQ.filter((x) => drop(x.id));
    setFinished((f) => f + 1);
    setMain(nm); setWeak(nw); setLearnQ(nl); setCur(pickNext(store, nm, nl, nw)); setShown(false); setSheet(null);
  }, [cur, main, weak, learnQ, store]);

  useEffect(() => {
    const k = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector(".scrim")) return; // a sheet is open
      const tag = e.target && e.target.tagName;
      if ((tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") && e.key !== "Escape") return; // typing an answer
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        if (!shown) reveal(); else grade(isP && recallRes ? recallRes.grade : 3);
      }
      else if (shown && ["1", "2", "3", "4"].includes(e.key)) grade(Number(e.key));
      else if (e.key === "z" || e.key === "Backspace") { if (!isP || shown) undo(); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [shown, reveal, grade, undo, onClose, isP, recallRes]);

  // counters
  const counters = useMemo(() => {
    let nw = 0, rv = 0;
    const ids = main.filter((x) => x !== cur?.id);
    for (const id of ids) { const r = store.rec(id); if (!r || r.st === NEW) nw++; else rv++; }
    return { nw, rv, ln: learnQ.length, wk: weak.filter((x) => x !== cur?.id).length };
  }, [main, learnQ, weak, cur]); // eslint-disable-line react-hooks/exhaustive-deps

  const related = useMemo(() => {
    if (!card || deck?.kind !== "kanji") return [];
    if (!wordIndex.current) {
      const m = new Map();
      for (const d of store.deckList()) {
        if (d.kind !== "vocab") continue;
        const content = store.content[d.id] || {};
        for (const id of store.cardIds(d.id)) {
          const c = content[id];
          for (const ch of new Set(kanjiOf(c.f))) { if (!m.has(ch)) m.set(ch, []); const a = m.get(ch); if (a.length < 12) a.push(c); }
        }
      }
      wordIndex.current = m;
    }
    const list = wordIndex.current.get(card.f) || [];
    return list.filter((w) => w.f !== card.f).slice(0, 4);
  }, [card, deck]); // eslint-disable-line react-hooks/exhaustive-deps

  // the sentence shown on the back: the card's own first, then others with the same word in turn
  const chosen = useMemo(() => {
    if (!card || deck?.kind !== "vocab") return null;
    const alts = sIndex ? sIndex.get(baseId(cur.id)) : [];
    return pickSentence(card, alts, (baseRec?.reps || 0) + (isP ? rec?.reps || 0 : 0));
  }, [card, deck, sIndex, cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sentCard = chosen ? chosen.card : card;

  // ---- listening: read the word when a card appears, the example sentence when it is revealed
  const plan = audioPlan(store.settings);
  const cardKey = cur ? `${cur.id}-${tally[1] + tally[2] + tally[3] + tally[4]}` : "";
  const wp = useMemo(() => (card ? wordPart(card, deck?.kind) : null), [card, deck]);
  const sp = useMemo(() => (sentCard && deck?.kind === "vocab" ? sentencePart(sentCard) : null), [sentCard, deck]);
  useEffect(() => { setRecallRes(null); }, [cardKey]);
  // a recall card must not read the answer out before you give it
  useEffect(() => { if (plan.word === "front" && wp && !isP) say(wp); else stopAudio(); }, [cardKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!shown) return undefined;
    let alive = true;
    (async () => {
      if ((plan.word === "reveal" || isP) && wp && plan.word !== "off") await say(wp);
      if (alive && plan.sentence === "reveal" && sp) await say(sp);
    })();
    return () => { alive = false; };
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopAudio(), []);
  const sayItems = useMemo(() => {
    if (!card) return [];
    const items = [];
    if (wp) items.push({ key: "w", label: "Word", text: plainOf(card.f), reading: card.r && /[ぁ-ゟ゠-ヿ]/.test(card.r) && deck?.kind !== "kana" ? card.r : "", part: wp, en: deck?.kind === "kana" ? card.m : card.m });
    if (sp) items.push({ key: "s", label: "Sentence", text: sp.text, reading: "", alt: sentCard?.x?.sentF ? [readingOf(sentCard.x.sentF).replace(/\s+/g, "")] : [], units: unitsFromMarkup(sentCard?.x?.sentF || sentCard?.x?.sent || ""), part: sp, en: sentCard?.x?.sentE || "" });
    return items;
  }, [card, deck, wp, sp, sentCard]);

  if (!cur) return <Summary store={store} tally={tally} total={finished} onClose={onClose} onOpen={onOpen} opts={opts} startXp={startXp} />;
  if (!card) return null;

  const dayTotal = initial.total + initial.doneBefore;
  const pct = dayTotal ? Math.min(100, ((finished + initial.doneBefore) / dayTotal) * 100) : 0;
  const kind = deck?.kind;
  const curIsNew = cur.src === "main" && (!rec || rec.st === NEW);
  const curIsRev = cur.src === "main" && !curIsNew;
  // pretesting (off by default): try to guess a new word or kanji before it is shown. A wrong guess still helps it stick.
  const pretest = store.settings.pretest === true && curIsNew && !isP && (kind === "vocab" || kind === "kanji");
  const showTools = !isP || shown;
  const noteId = baseId(cur.id);

  const sheetEl = sheet && (
    <NoteSheet
      cardId={sheet.id} leech={sheet.type === "leech"} lapses={sheet.lapses}
      sentences={sIndex ? sIndex.get(sheet.id).slice(0, 2) : []}
      kanjiParts={kanjiPartsOf(lexRef.current, store.card(sheet.id))}
      onClose={() => setSheet(null)}
      onSuspend={() => { setSheet(null); suspend(); }}
    />
  );

  return (
    <div className="fullscreen">
      <div className="study">
        <div className="study-top">
          <button className="icon-btn" onClick={onClose} aria-label="Close session"><Icon name="close" /></button>
          <div className="study-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
          <button className="icon-btn" onClick={undo} disabled={!history.length} aria-label="Undo last answer"><Icon name="undo" /></button>
          <button className="icon-btn" onClick={suspend} aria-label="Suspend this card"><Icon name="pause" /></button>
        </div>
        <div className="counts" aria-label="Cards left">
          <span className={`c-new ${curIsNew ? "cur" : ""}`}>{counters.nw + (curIsNew ? 1 : 0)} new</span>
          <span className={`c-learn ${cur.src === "learn" ? "cur" : ""}`}>{counters.ln} learning</span>
          <span className={`c-rev ${curIsRev ? "cur" : ""}`}>{counters.rv + (curIsRev ? 1 : 0)} review</span>
          <ComboChip />
        </div>

        <div className="study-body">
          <div className="flash card-in" key={cardKey} ref={flashRef} onClick={!shown && !isP && !pretest ? reveal : undefined}>
            <div className="flash-head">
              <span className="chip tag">{deck?.name || ""}{isP ? " · Recall" : cur.src === "weak" ? " · Weak spot" : ""}</span>
              <div className="flash-tools">
                {showTools && wp && <SpeakBtn part={wp} label="Play the word" />}
                {showTools && sayItems.length > 0 && <MicBtn items={sayItems} />}
                {showTools && <WriteBtn text={card.f} title={card.m} sub={card.r && kind !== "kana" ? card.r : "Stroke order"} />}
              </div>
            </div>
            <div className="flash-scroll">
              {isP ? <RecallPrompt card={card} /> : <Front kind={kind} card={card} shown={shown} furi={kind === "vocab" ? cardFurigana(card, kanjiReadings) : null} />}
              {shown && isP && <><RecallVerdict res={recallRes} /><div className="word-big recall-word" lang="ja"><WordRuby card={card} furi={cardFurigana(card, kanjiReadings)} shown /></div></>}
              {shown && <Back kind={kind} card={card} related={related} sentence={chosen} recall={isP} furi={kind === "vocab" ? cardFurigana(card, kanjiReadings) : null} />}
              {shown && baseRec?.note && <div className="mnemo"><span className="label">My mnemonic</span><div>{baseRec.note}</div></div>}
              {shown && kind !== "kana" && <button type="button" className="link-btn" onClick={() => setSheet({ type: "note", id: noteId })}><Icon name="edit" size={16} /> {baseRec?.note ? "Edit my mnemonic" : "Add my mnemonic"}</button>}
              {shown && pretest && <div className="mnemo guess-note"><span className="label">Your guess</span><div>{guess.trim() || "No guess"}</div></div>}
              {!shown && !isP && !pretest && <span className="reveal-hint">Tap to show the answer</span>}
            </div>
          </div>
          {!shown ? (
            isP ? <RecallInput key={cardKey} card={card} onResult={showRecall} />
              : pretest
                ? (
                  <div className="guess-box">
                    <input className="input" value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); reveal(); } }}
                      placeholder="What might it mean? A guess is fine." aria-label="Your guess" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" />
                    <button className="btn btn-primary show-btn btn-block" data-haptic="none" onClick={reveal}>{guess.trim() ? "Check my guess" : "I have no idea, show it"}</button>
                  </div>
                )
                : <button className="btn btn-primary show-btn btn-block" data-haptic="none" onClick={reveal}>Show answer</button>
          ) : (
            <div className="grades">
              {[["Again", 1], ["Hard", 2], ["Good", 3], ["Easy", 4]].map(([label, g]) => (
                <button key={g} className={`grade g${g} ${isP && recallRes && recallRes.grade === g ? "suggest" : ""}`} data-haptic="none" onClick={() => grade(g)}>
                  <span>{label}</span>
                  <small>{delays ? fmtSpan(delays[g]) : ""}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {sheetEl}
    </div>
  );
}

/**
 * The word with furigana over each kanji. The readings are laid out from the start (invisible) so the word doesn't
 * jump when the answer is revealed; they fade in with it.
 */
function WordRuby({ card, furi, shown }) {
  if (!furi) return <>{card.f}</>;
  return (
    <span className={`word-ruby ${shown ? "on" : ""}`}>
      {parseFuri(furi).map((s, i) => (s.r == null ? <React.Fragment key={i}>{s.t}</React.Fragment> : <ruby key={i}>{s.t}<rt>{s.r}</rt></ruby>))}
    </span>
  );
}

function Front({ kind, card, shown, furi }) {
  if (kind === "kanji") return <div className="kanji-big" lang="ja">{card.f}</div>;
  if (kind === "kana") return <div className="kana-big" lang="ja">{card.f}</div>;
  if (kind === "vocab") return <div className="word-big" lang="ja" data-word={card.f}><WordRuby card={card} furi={furi} shown={shown} /></div>;
  return <div className="word-big" lang="ja">{card.f}</div>;
}

/** A picture from an imported deck (kana mnemonics and the like). Shows nothing when the file isn't on this device. */
export function CardPicture({ name, alt = "" }) {
  const [url, setUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null); setLoaded(false);
    mediaUrl(name).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [name]);
  if (!url) return null;
  return <img className={`card-pic ${loaded ? "in" : ""}`} src={url} alt={alt} onLoad={() => setLoaded(true)} draggable={false} />;
}

function Back({ kind, card, related, sentence, recall, furi }) {
  const x = card.x || {};
  if (kind === "vocab") {
    const s = sentence || ((x.sentF || x.sent) ? { card, markup: x.sentF || x.sent, en: x.sentE } : null);
    return (
      <div className="answer">
        {/* the reading sits over the word as furigana; it's only spelled out here when it can't be lined up with the kanji */}
        {card.r && card.r !== plainOf(card.f || "") && !furi && <div className="reading" lang="ja">{card.r}</div>}
        {!recall && <div className="main">{card.m}</div>}
        {x.img && <CardPicture name={x.img} alt={card.m || card.f} />}
        {x.pitch && <PitchLine value={x.pitch} />}
        {s && (
          <div className="box">
            <div className="spread"><span className="label">{s.ownerId ? "Another sentence" : "Example"}</span><SpeakBtn part={sentencePart(s.card)} label="Play the sentence" className="small-btn" size={20} /></div>
            <div><Sentence jp={s.markup} punct={false} /></div>
            {s.en && <div className="dim small" style={{ marginTop: 4 }}>{s.en}</div>}
          </div>
        )}
        {x.notes && <div className="extra">{x.notes}</div>}
      </div>
    );
  }
  if (kind === "kanji") {
    return (
      <div className="answer">
        <div className="main">{card.m}</div>
        {x.img && <CardPicture name={x.img} alt={`Picture for ${card.f}`} />}
        {x.story && <div className="extra">{x.story}</div>}
        {related.length > 0 && (
          <div className="box">
            <span className="label">In words you study</span>
            <div className="related">{related.map((w, i) => (
              <div key={i}><b lang="ja">{w.f}</b>{w.r ? <span lang="ja" className="dim"> {w.r}</span> : null}{w.m ? <span className="dim"> · {String(w.m).length > 30 ? String(w.m).slice(0, 29) + "…" : w.m}</span> : null}</div>
            ))}</div>
          </div>
        )}
        {(x.strokes || x.num) && <div className="faint small">{x.strokes ? `${x.strokes} stroke${x.strokes === "1" || x.strokes === 1 ? "" : "s"}` : ""}{x.strokes && x.num ? " · " : ""}{x.num ? `#${x.num}` : ""}</div>}
      </div>
    );
  }
  return (
    <div className="answer">
      <div className="main">{card.m}</div>
      {x.img && <CardPicture name={x.img} alt={`Picture for ${card.f}`} />}
      {x.story && <div className="extra">{x.story}</div>}
    </div>
  );
}

function Summary({ store, tally, total, onClose, onOpen, opts, startXp = 0 }) {
  const n = tally[1] + tally[2] + tally[3] + tally[4];
  const accuracy = n ? Math.round(((n - tally[1]) / n) * 100) : 0;
  const stats = useMemo(() => computeStats(store), []); // eslint-disable-line react-hooks/exhaustive-deps
  const tomorrow = stats.forecast[1]?.n || 0;
  const counts = useMemo(() => buildCounts(store, Date.now(), { deckId: opts.deckId }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (n > 0) fx.finish({ big: n >= 10 }); }, [n]);
  const mins = Math.max(1, Math.round(tally.ms / 60000));
  return (
    <div className="fullscreen">
      <div className="study">
        <div className="study-body summary">
          {n === 0 ? (
            <>
              <div className="big jp" lang="ja" style={{ fontSize: "4rem", color: "var(--primary)" }}>空</div>
              <h1>Nothing to study right now</h1>
              <p className="dim">You're all caught up. {tomorrow ? `Tomorrow ${plural(tomorrow, "review")} are due.` : "Come back later."}</p>
            </>
          ) : (
            <>
              {store.settings.mascot !== false && <Samurai mood="cheer" size={86} />}
              <div className="big jp ink-host" lang="ja" style={{ fontSize: "3.4rem", color: "var(--primary)" }}><InkWord>完了</InkWord><Hanko className="hanko-corner" size={30} delay={240} /></div>
              <h1>Session complete</h1>
              <SessionXp startXp={startXp} />
              <div className="stat-row">
                <div className="stat"><b>{n}</b><span>answers</span></div>
                <div className="stat"><b>{accuracy}%</b><span>recalled</span></div>
                <div className="stat"><b>{mins}</b><span>min</span></div>
              </div>
              <p className="dim">{tomorrow ? `${plural(tomorrow, "review")} due tomorrow.` : "Nothing due tomorrow."}</p>
            </>
          )}
          {counts.deferred > 0 && (
            <p className="dim small center">Today's effort budget is used up ({counts.effort.spent}/{counts.effort.budget} points), so {plural(counts.deferred, "card")} will wait for tomorrow.</p>
          )}
          <div className="stack" style={{ width: "100%", marginTop: "auto" }}>
            {counts.deferred > 0 && (
              <button className="btn btn-tonal btn-block" onClick={() => onOpen({ type: "study", opts: { ...opts, extraReviews: true } })}>Keep going anyway</button>
            )}
            {counts.newAvailable > 0 && counts.deferred === 0 && (
              <button className="btn btn-tonal btn-block" onClick={() => onOpen({ type: "study", opts: { ...opts, extraNew: (opts.extraNew || 0) + 5 } })}>Learn 5 more new cards</button>
            )}
            <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
