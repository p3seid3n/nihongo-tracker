import React from "react";
import { unpackPitch, pitchPattern, pitchType } from "../lib/pitch.js";

/** One pitch pattern: an overline over the high morae and a step down after the accent. */
export function PitchWord({ k, a }) {
  const cells = pitchPattern(k, a);
  return (
    <span className="pitch" lang="ja" aria-label={`${k}, ${pitchType(k, a)}, accent ${a}`}>
      {cells.map((c, i) => <span key={i} className={`pm ${c.high ? "hi" : ""} ${c.drop ? "drop" : ""}`}>{c.mora}</span>)}
    </span>
  );
}

/** The pitch line on the back of a vocabulary card. `value` is the stored "ワタシ/0|ヒト/2". */
export function PitchLine({ value }) {
  const list = unpackPitch(value);
  if (!list.length) return null;
  return (
    <div className="pitch-line" aria-label="Pitch accent">
      <span className="label">Pitch</span>
      <div className="pitch-list">
        {list.map((v, i) => (
          <span key={i} className="pitch-item"><PitchWord k={v.k} a={v.a} /><small className="faint">{pitchType(v.k, v.a)}</small></span>
        ))}
      </div>
    </div>
  );
}
