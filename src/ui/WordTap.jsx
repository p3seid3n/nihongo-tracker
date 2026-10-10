import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Furi } from "./Furi.jsx";
import { SpeakBtn } from "./Voice.jsx";
import { shortGloss } from "../lib/lexicon.js";
import * as hap from "../lib/haptics.js";

/**
 * A sentence made of tokens (see lib/lexicon.js). Words you have not learned yet carry a short translation above them,
 * and tapping any word opens a small popup with its meaning, reading and a memory story.
 */
export function TokLine({ toks, blank, fill, filled, glosses = true, all = false }) {
  const [pop, setPop] = useState(null); // { info, rect, i }
  const close = useCallback(() => setPop(null), []);
  const open = (e, t, i) => {
    e.stopPropagation();
    hap.tap();
    setPop({ info: t.info, rect: e.currentTarget.getBoundingClientRect(), i });
  };
  // punctuation sticks to the word before it (or after it for an opening quote) so a 。 never wraps alone
  const groups = [];
  let carry = [];
  toks.forEach((t, i) => {
    const isP = t.type === "punct" && blank !== i;
    if (isP && /^[「『（(“]+$/.test(t.text)) { carry.push([t, i]); return; }
    if (isP && groups.length && !carry.length) { groups[groups.length - 1].push([t, i]); return; }
    groups.push([...carry, [t, i]]);
    carry = [];
  });
  if (carry.length) groups.push(carry);
  const one = (t, i) => {
        if (blank === i) {
          return <span key={i} className="tk"><span className={`jp-blank ${filled ? "filled" : ""}`}>{fill ? <Furi m={fill} /> : " "}</span></span>;
        }
        if (t.type === "punct") return <span key={i} className="tk tk-p">{t.text}</span>;
        const tappable = !!t.info;
        const gloss = all ? (t.gloss || (t.info ? shortGloss(t.info.meaning, 16) : "")) : glosses ? t.gloss : "";
        const inner = (
          <>
            {gloss ? <span className="tk-g">{gloss}</span> : null}
            <span className="tk-t"><Furi m={t.m} /></span>
          </>
        );
        if (!tappable) return <span key={i} className={`tk${gloss ? " has-g" : ""}`}>{inner}</span>;
        return (
          <button key={i} type="button" data-haptic="none" className={`tk tap${gloss ? " has-g" : ""}${pop && pop.i === i ? " on" : ""}`} onClick={(e) => open(e, t, i)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}>
            {inner}
          </button>
        );
  };
  return (
    <span className="tk-line" lang="ja">
      {groups.map((g, gi) => (g.length === 1 ? one(g[0][0], g[0][1]) : <span className="tk-grp" key={`g${gi}`}>{g.map(([t, i]) => one(t, i))}</span>))}
      {pop && createPortal(<WordPop pop={pop} onClose={close} />, document.body)}
    </span>
  );
}

function WordPop({ pop, onClose }) {
  const { info, rect } = pop;
  const ref = useRef(null);
  const [style, setStyle] = useState({ visibility: "hidden", left: 0, top: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(340, vw - 24);
    el.style.width = `${w}px`;
    const h = el.offsetHeight;
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, vw - w - 12));
    const below = rect.bottom + 10 + h <= vh - 12;
    let top = below ? rect.bottom + 10 : rect.top - 10 - h;
    top = Math.max(12, Math.min(top, vh - h - 12));
    const arrow = Math.max(18, Math.min(rect.left + rect.width / 2 - left, w - 18));
    setStyle({ left, top, width: w, visibility: "visible", "--arrow": `${arrow}px`, "--below": below ? 1 : 0 });
  }, [rect, info]);

  useEffect(() => {
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); onClose(); } };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const speak = info.kind === "word" ? { file: info.form ? "" : info.audio || "", text: (!info.form && info.reading) || info.text } : null;
  return (
    <div className={`wpop ${style["--below"] ? "below" : "above"}`} role="dialog" aria-label={info.text} ref={ref} style={style} onClick={(e) => e.stopPropagation()}>
      <div className="wpop-head">
        <div className="grow">
          <div className="wpop-word" lang="ja">{info.text}</div>
          {info.reading && !info.form && info.reading !== info.text && <div className="wpop-reading" lang="ja">{info.reading}</div>}
          {info.form && <div className="wpop-reading"><span lang="ja">{info.base}</span>{info.reading ? <span lang="ja"> ・{info.reading}</span> : null} · {info.form}</div>}
        </div>
        {speak && <SpeakBtn part={speak} label="Hear it" className="small-btn" size={20} />}
      </div>
      {info.meaning && <div className="wpop-meaning">{info.meaning}</div>}
      {info.kind === "grammar" && info.lesson && <div className="wpop-note">Lesson: {info.lesson}</div>}
      {info.parts && info.parts.length > 0 && !(info.parts.length === 1 && info.parts[0].ch === info.base) && !(info.parts.length === 1 && info.parts[0].ch === info.text) && (
        <div className="wpop-parts">
          {info.parts.map((p) => <span key={p.ch}><b lang="ja">{p.ch}</b> {p.kw}</span>)}
        </div>
      )}
      {info.mnemonic && (
        <div className="wpop-story">
          <span className="label">{info.mnemonicFor ? `Story for ${info.mnemonicFor}` : "Memory story"}</span>
          {info.mnemonic}
        </div>
      )}
      {info.note && <div className="wpop-note">{info.note}</div>}
    </div>
  );
}
