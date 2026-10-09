import React, { useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import { Sheet, Switch, Seg, Stepper, useApp, useNow, PageHead, plural, fmtNum } from "./common.jsx";
import { cardBreakdown } from "../lib/stats.js";
import { newLimit } from "../lib/queue.js";
import { NEW, LEARNING, RELEARNING } from "../lib/fsrs.js";
import { fmtSpan, dayStart } from "../lib/time.js";
import { MATURE_DAYS } from "../lib/stats.js";

const KIND_LABEL = { kana: "Kana", kanji: "Kanji", vocab: "Vocabulary" };

export function Library() {
  const { store, open } = useApp();
  const now = useNow(60000);
  const [deckId, setDeckId] = useState(null);
  const decks = store.deckList();
  const rows = decks.map((d) => ({ d, b: cardBreakdown(store, d.id, now) }));

  return (
    <div className="page">
      <PageHead title="Cards" right={<button className="btn btn-tonal btn-sm" onClick={() => open({ type: "import" })}><Icon name="upload" /> Import</button>} />
      {rows.length === 0 && (
        <div className="card empty">
          <div className="big" lang="ja">札</div>
          <h2>No decks yet</h2>
          <p className="dim">Import your Anki decks to bring your kanji and vocabulary along.</p>
          <button className="btn btn-primary" onClick={() => open({ type: "import" })}><Icon name="upload" /> Import from Anki</button>
        </div>
      )}
      <div className="stack">
        {rows.map(({ d, b }) => {
          const started = b.total - b.fresh - b.suspended;
          const t = Math.max(1, b.total);
          return (
            <button key={d.id} className="card stack" style={{ textAlign: "left", opacity: d.enabled === false ? 0.55 : 1 }} onClick={() => setDeckId(d.id)}>
              <div className="spread">
                <div className="grow"><b style={{ fontSize: "1.05rem" }}>{d.name}</b><div className="small dim">{KIND_LABEL[d.kind] || "Cards"} · {fmtNum(started)} / {fmtNum(b.total)} started</div></div>
                {b.due > 0 ? <span className="chip chip-primary">{fmtNum(b.due)} due</span> : <span className="chip">{d.enabled === false ? "Paused" : "Up to date"}</span>}
              </div>
              <div className="bar bar-stack">
                <i style={{ width: `${(b.mature / t) * 100}%`, background: "var(--sage)" }} />
                <i style={{ width: `${(b.young / t) * 100}%`, background: "var(--sand)" }} />
                <i style={{ width: `${(b.learning / t) * 100}%`, background: "var(--rose)" }} />
              </div>
            </button>
          );
        })}
      </div>
      {deckId && store.decks[deckId] && !store.decks[deckId].del && <DeckSheet id={deckId} onClose={() => setDeckId(null)} />}
    </div>
  );
}

function DeckSheet({ id, onClose }) {
  const { store, open, confirm, toast } = useApp();
  const now = Date.now();
  const deck = store.decks[id];
  const b = cardBreakdown(store, id, now);
  const [known, setKnown] = useState(0);
  const [browse, setBrowse] = useState(false);
  const [name, setName] = useState(deck.name);
  const limit = newLimit(store, deck);

  if (browse) return <Browser id={id} onClose={() => setBrowse(false)} />;

  return (
    <Sheet title={deck.name} onClose={onClose}>
      <div className="row-wrap">
        <span className="chip">{KIND_LABEL[deck.kind] || "Cards"}</span>
        <span className="chip">{fmtNum(b.total)} cards</span>
        {b.due > 0 && <span className="chip chip-primary">{fmtNum(b.due)} due</span>}
      </div>
      <div className="row">
        <button className="btn btn-primary grow" onClick={() => { onClose(); open({ type: "study", opts: { deckId: id } }); }}><Icon name="play" /> Study</button>
        <button className="btn btn-soft grow" onClick={() => setBrowse(true)}><Icon name="search" /> Browse</button>
      </div>

      <div className="list">
        <div className="list-item">
          <div className="grow"><div>Include in daily plan</div><div className="small dim">Turn off to pause this deck</div></div>
          <Switch checked={deck.enabled !== false} onChange={(v) => store.updateDeck(id, { enabled: v })} label="Include in daily plan" />
        </div>
        <div className="list-item">
          <div className="grow"><div>New cards per day</div><div className="small dim">{deck.newPerDay == null ? "Using the default for this type" : "Custom for this deck"}</div></div>
          <Stepper value={limit} min={0} max={100} step={1} label="new cards per day" onChange={(v) => store.updateDeck(id, { newPerDay: v })} />
        </div>
        {deck.newPerDay != null && (
          <button className="list-item" onClick={() => store.updateDeck(id, { newPerDay: null })}><span className="grow" style={{ color: "var(--primary)" }}>Use default</span></button>
        )}
      </div>

      {!deck.builtin && (
        <>
          <div className="field">
            <label htmlFor="dn">Name</label>
            <input id="dn" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={() => { const n = name.trim(); if (n && n !== deck.name) store.updateDeck(id, { name: n }); else setName(deck.name); }} />
          </div>
          <div className="field">
            <label>Type</label>
            <Seg value={deck.kind} label="Deck type" onChange={(v) => store.updateDeck(id, { kind: v })} options={[{ value: "kanji", label: "Kanji" }, { value: "vocab", label: "Vocabulary" }, { value: "kana", label: "Kana" }]} />
          </div>
        </>
      )}

      {b.fresh > 0 && (
        <div className="card stack" style={{ background: "var(--s3)" }}>
          <b>Already know some cards?</b>
          <div className="spread">
            <span className="small dim">Mark the next</span>
            <Stepper value={known} min={0} max={b.fresh} step={known >= 100 ? 50 : 5} label="cards to mark known" onChange={setKnown} />
          </div>
          <button className="btn btn-tonal btn-sm" disabled={!known} onClick={() => { store.markKnown(id, known, { extra: true }); toast(`${plural(known, "card")} marked as known`); setKnown(0); }}>Mark as known</button>
          <span className="hint">They return for a quick check spread over 10 days.</span>
        </div>
      )}

      <button className="btn btn-danger btn-block" onClick={async () => {
        const ok = await confirm({ title: `Delete “${deck.name}”?`, body: "All cards and progress in this deck are removed from this device and your account. This cannot be undone. A backup file can restore them.", confirm: "Delete deck", danger: true });
        if (ok) { store.deleteDeck(id); onClose(); toast("Deck deleted"); }
      }}><Icon name="trash" /> Delete deck</button>
    </Sheet>
  );
}

function stateOf(r, now) {
  if (r?.sus) return { t: "Suspended", c: "chip" };
  if (!r || r.st === NEW) return { t: "New", c: "chip" };
  if (r.st === LEARNING || r.st === RELEARNING) return { t: "Learning", c: "chip chip-rose" };
  const due = dayStart(r.due) <= dayStart(now);
  return r.s >= MATURE_DAYS ? { t: due ? "Due" : `Mature · ${fmtSpan(r.due - now)}`, c: "chip chip-sage" } : { t: due ? "Due" : `Young · ${fmtSpan(r.due - now)}`, c: "chip chip-sand" };
}

function Browser({ id, onClose }) {
  const { store } = useApp();
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const now = Date.now();
  const deck = store.decks[id];
  const ids = store.cardIds(id);
  const content = store.content[id] || {};
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ids;
    return ids.filter((cid) => { const c = content[cid]; return c.f.toLowerCase().includes(s) || (c.r || "").toLowerCase().includes(s) || (c.m || "").toLowerCase().includes(s); });
  }, [q, ids, content]);
  return (
    <div className="fullscreen">
      <div className="lesson-top">
        <button className="icon-btn" onClick={onClose} aria-label="Back"><Icon name="back" /></button>
        <h2 className="grow">{deck.name}</h2>
        <span className="chip">{fmtNum(list.length)}</span>
      </div>
      <div className="lesson-body">
        <div className="search"><Icon name="search" /><input className="input" placeholder="Search cards" value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} /></div>
        <div className="list">
          {list.slice(0, limit).map((cid) => {
            const c = content[cid];
            const r = store.rec(cid);
            const st = stateOf(r, now);
            return (
              <div className="list-item" key={cid}>
                <span lang="ja" style={{ fontSize: "1.5rem", minWidth: 44, fontFamily: "var(--font-kanji)" }}>{c.f}</span>
                <div className="grow"><div style={{ fontWeight: 500 }}>{c.m || c.r}</div>{c.r && c.m && <div className="small dim" lang="ja">{c.r}</div>}</div>
                <span className={st.c}>{st.t}</span>
                <button className="icon-btn" aria-label={r?.sus ? "Unsuspend" : "Suspend"} onClick={() => store.toggleSuspend(cid)}><Icon name={r?.sus ? "play" : "pause"} /></button>
              </div>
            );
          })}
          {list.length === 0 && <div className="list-item dim">No cards match.</div>}
        </div>
        {list.length > limit && <button className="btn btn-soft" onClick={() => setLimit(limit + 100)}>Show more</button>}
      </div>
    </div>
  );
}
