import React from "react";
import { parseFuri, endPunct, defaultEnd, plainOf, KANJI_RE } from "../lib/jp.js";
import { useApp } from "./common.jsx";

/** Japanese text with furigana. Readings are hidden for kanji you already know (setting: auto). */
export function Furi({ m, mode }) {
  const { known, store } = useApp();
  const setting = mode || store.settings.furigana || "auto";
  const segs = parseFuri(m || "");
  return (
    <>
      {segs.map((s, i) => {
        if (s.r == null || !s.t) return <React.Fragment key={i}>{s.t}</React.Fragment>;
        const show = setting === "always" || (setting === "auto" && ![...s.t].filter((c) => KANJI_RE.test(c)).every((c) => known.has(c)));
        return show ? <ruby key={i}>{s.t}<rt>{s.r}</rt></ruby> : <React.Fragment key={i}>{s.t}</React.Fragment>;
      })}
    </>
  );
}

/** A sentence given as `|`-separated markup. `blank` is the index of the gap, `fill` what to show in it. */
export function Sentence({ jp, blank, fill, filled, mode, punct = true }) {
  const raw = String(jp).trim().replace(/ +/g, "").split("|");
  const { tokens, end } = endPunct(raw);
  const last = plainOf((tokens[tokens.length - 1] || "").replace(/\*$/, ""));
  let tail = end ?? defaultEnd(tokens);
  if (!punct || /[。？！?!」）)]$/.test(last)) tail = "";
  return (
    <span className="jp-line" lang="ja">
      {tokens.map((t, i) => {
        const star = t.endsWith("*");
        const m = star ? t.slice(0, -1) : t;
        if (blank === i || (blank == null && star)) {
          return <span key={i} className={`jp-blank ${filled ? "filled" : ""}`}>{fill ? <Furi m={fill} mode={mode} /> : "\u00a0"}</span>;
        }
        return <Furi key={i} m={m} mode={mode} />;
      })}
      {tail}
    </span>
  );
}
