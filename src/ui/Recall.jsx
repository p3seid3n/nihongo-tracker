import React, { useEffect, useRef, useState } from "react";
import { toKana } from "../lib/romaji.js";
import { checkRecall, answerKeys } from "../lib/recall.js";
import { plainOf } from "../lib/jp.js";
import * as hap from "../lib/haptics.js";

/** Keep the answer box above an on-screen keyboard that overlays the page. */
export function useKeyboardInset(active) {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return undefined;
    const root = document.documentElement;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty("--kb", inset > 80 ? `${inset}px` : "0px");
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); root.style.removeProperty("--kb"); };
  }, [active]);
}

/** Number of kana in the first accepted reading, shown as a hint. */
function kanaCount(card) {
  const first = answerKeys(card).find((k) => /[ぁ-ゖ]/.test(k));
  return first ? [...first].length : 0;
}

/** What the card shows before you answer: the meaning, and you give the Japanese. */
export function RecallPrompt({ card }) {
  const n = kanaCount(card);
  return (
    <div className="recall-q">
      <span className="recall-tag">How do you say…</span>
      <div className="recall-meaning">{card.m}</div>
      {n > 0 && <span className="faint small">{n} kana</span>}
    </div>
  );
}

/** The answer box. Type romaji or kana; it turns into kana as you type. */
export function RecallInput({ card, onResult }) {
  const [raw, setRaw] = useState("");
  const ref = useRef(null);
  useKeyboardInset(true);
  useEffect(() => { const t = setTimeout(() => ref.current && ref.current.focus({ preventScroll: true }), 60); return () => clearTimeout(t); }, []);
  const submit = (e) => {
    e?.preventDefault();
    const res = checkRecall(raw, card);
    if (res.verdict === "exact") hap.good(); else if (res.verdict === "close") hap.medium(); else hap.bad();
    onResult(res);
  };
  const giveUp = () => { hap.tap(); onResult({ verdict: "empty", grade: 1, typed: "" }); };
  return (
    <form className="recall-form" onSubmit={submit} autoComplete="off">
      <input
        ref={ref} className="input recall-input" lang="ja" value={raw}
        onChange={(e) => setRaw(toKana(e.target.value))}
        placeholder="Type in romaji or kana"
        aria-label="Your answer in Japanese"
        autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done"
      />
      <div className="row">
        <button type="button" className="btn btn-soft" data-haptic="none" onClick={giveUp}>I don't know</button>
        <button type="submit" className="btn btn-primary grow" data-haptic="none" disabled={!raw.trim()}>Check</button>
      </div>
    </form>
  );
}

const VERDICT = { exact: ["Correct", "ok"], close: ["Almost", "near"], wrong: ["Not quite", "bad"], empty: ["The answer", "plain"] };

/** The line above the answer on a recall card's back. */
export function RecallVerdict({ res }) {
  if (!res) return null;
  const [label, cls] = VERDICT[res.verdict] || VERDICT.empty;
  return (
    <div className={`recall-verdict ${cls}`}>
      <b>{label}</b>
      {res.typed && res.verdict !== "exact" && <span className="dim small"> · you wrote <span lang="ja">{res.typed}</span></span>}
    </div>
  );
}

export const recallWord = (card) => plainOf(card.f || "");
