// Ink and paper: the look of the opening animation, reused for the highlights of the app.
// Ink moves fast at first and then slows right down, like a brush that has just left the paper.
import React, { useEffect, useId } from "react";
import { INK_GLYPH } from "../ink/glyph.js";
import * as hap from "../lib/haptics.js";

// each stroke is drawn a little more slowly than the one before: time itself slows down
const RAMP = [90, 110, 130, 160, 195, 245, 310];
export function strokeTimings(count, scale = 1) {
  let at = 0;
  return Array.from({ length: count }, (_, i) => {
    const ms = Math.round((RAMP[Math.min(i, RAMP.length - 1)]) * scale);
    const t = { delay: Math.round(at), ms };
    at += ms * 0.8;
    return t;
  });
}

/** The brand character 言, drawn stroke by stroke in brush ink. Takes its colour from `color`. */
export function InkBrand({ size = 96, delay = 120, scale = 1.4, label = "言" }) {
  const id = useId().replace(/:/g, "");
  const g = INK_GLYPH;
  const t = strokeTimings(g.outline.length, scale);
  return (
    <svg className="ink-brand" width={size} height={size} viewBox={`0 0 ${g.size} ${g.size}`} role="img" aria-label={label} lang="ja">
      <defs>
        {g.centre.map((d, i) => (
          <mask key={i} id={`${id}m${i}`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="150" height="150">
            <path className="ink-m" d={d} pathLength={Math.round(g.lengths[i])} style={{ "--len": Math.round(g.lengths[i]), "--ms": `${t[i].ms}ms`, "--d": `${delay + t[i].delay}ms` }} />
          </mask>
        ))}
      </defs>
      <g fill="currentColor" filter="url(#nt-ink)">
        {g.outline.map((d, i) => <path key={i} d={d} mask={`url(#${id}m${i})`} />)}
      </g>
    </svg>
  );
}

/** Text that a brush wipes into view: quick across, then slowing. */
export function InkWord({ children, delay = 0, as: Tag = "span" }) {
  return <Tag className="ink-wipe" style={{ "--d": `${delay}ms` }}>{children}</Tag>;
}

/** A red seal pressed onto the page. `haptic` plays the stamp thud when it lands. */
export function Hanko({ char = "済", size = 40, delay = 0, tilt = -7, haptic = false, className = "" }) {
  useEffect(() => {
    if (!haptic) return undefined;
    const t = setTimeout(hap.stamp, delay + 60);
    return () => clearTimeout(t);
  }, [haptic, delay]);
  return (
    <span className={`hanko ${className}`} lang="ja" aria-hidden="true" style={{ "--size": `${size}px`, "--d": `${delay}ms`, "--tilt": `${tilt}deg` }}>{char}</span>
  );
}
