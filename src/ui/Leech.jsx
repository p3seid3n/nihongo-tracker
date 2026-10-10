import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet, useApp } from "./common.jsx";
import { Sentence } from "./Furi.jsx";
import { KANJI_RE } from "../lib/jp.js";
import { shortStory } from "../lib/lexicon.js";

/**
 * Write or edit your own mnemonic for a card. For a card you keep missing (a "leech") the sheet
 * also offers other ways in: the stories of its kanji and more sentences that use the word.
 */
export function NoteSheet({ cardId, leech, lapses, sentences = [], kanjiParts = [], onClose, onSuspend }) {
  const { store, toast } = useApp();
  const card = store.card(cardId);
  const rec = store.rec(cardId);
  const [text, setText] = useState(rec?.note || "");
  const parts = useMemo(() => kanjiParts, [kanjiParts]);
  if (!card) return null;
  const save = () => {
    if ((rec?.note || "") !== text.trim()) { store.setNote(cardId, text); if (text.trim()) toast("Mnemonic saved"); }
    onClose();
  };
  return createPortal(
    <div style={{ display: "contents" }} onClick={(e) => e.stopPropagation()}>
      <Sheet title={leech ? "This one keeps slipping" : "My mnemonic"} onClose={save}
        actions={<>
          <button className="btn btn-primary btn-block" onClick={save}>{text.trim() ? "Save" : "Done"}</button>
          {leech && onSuspend && <button className="btn btn-soft btn-block" onClick={() => { onSuspend(); }}>Suspend this card for now</button>}
        </>}>
        <div className="leech-word">
          <b lang="ja" className="word-big" style={{ fontSize: "2rem" }}>{card.f}</b>
          <div className="dim">{card.r ? <span lang="ja">{card.r} · </span> : null}{card.m}</div>
        </div>
        {leech && <p className="dim">You have missed it {lapses} times. Seeing it again in the same way is not working, so give it a hook of your own: a sound-alike, a picture, a person or place you know.</p>}
        <div className="field">
          <label htmlFor="mn">Your mnemonic</label>
          <textarea id="mn" className="input" rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. A picture that links the sound to the meaning" />
        </div>
        {parts.length > 0 && (
          <div className="leech-box">
            <span className="label">Kanji in this word</span>
            {parts.map((p) => (
              <div key={p.ch}><b lang="ja">{p.ch}</b> <span className="dim">{p.kw}{p.story ? ` · ${shortStory(p.story, 140)}` : ""}</span></div>
            ))}
          </div>
        )}
        {sentences.length > 0 && (
          <div className="leech-box">
            <span className="label">More sentences with it</span>
            {sentences.map((s, i) => (
              <div key={i} className="leech-sent">
                <div><Sentence jp={s.markup} punct={false} /></div>
                {s.en && <div className="dim small">{s.en}</div>}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>,
    document.body,
  );
}

export function kanjiPartsOf(lex, card) {
  const out = [];
  const seen = new Set();
  for (const ch of [...(card?.f || "")]) {
    if (!KANJI_RE.test(ch) || seen.has(ch)) continue;
    seen.add(ch);
    const k = lex?.kanjiMap?.get(ch);
    if (k) out.push({ ch, kw: k.kw, story: k.story });
  }
  return out;
}
