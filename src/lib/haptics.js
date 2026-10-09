// Haptic feedback. Android/Chrome: Vibration API. iPhone (Safari 17.4+): toggling a hidden
// "switch" checkbox makes iOS play its system tick, so we use that for taps there.
let enabled = true;
export function setHaptics(on) { enabled = !!on; }

const isIOS = typeof navigator !== "undefined" && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
let iosLabel = null;
export const onIOS = isIOS;
export const canHaptic = isIOS || canVibrate;

function ios() {
  if (typeof document === "undefined") return;
  if (!iosLabel) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = "nt-haptic";
    input.tabIndex = -1;
    const label = document.createElement("label");
    label.htmlFor = "nt-haptic";
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none";
    label.appendChild(input);
    document.body.appendChild(label);
    iosLabel = label;
  }
  iosLabel.click();
}

/** pattern: Android vibrate pattern. ticks: iOS tick delays in ms (first is immediate). */
function fire(pattern, ticks = [0]) {
  if (!enabled) return;
  try {
    if (isIOS) ticks.forEach((d) => (d ? setTimeout(ios, d) : ios()));
    else if (canVibrate) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

/** Selection tick: tabs, chips, list rows. */
export const tick = () => fire(6, [0]);
/** Light tap: buttons, reveal. */
export const tap = () => fire(10, [0]);
/** Medium: confirms, toggles landing. */
export const medium = () => fire(18, [0]);
/** Correct answer, graded Good. */
export const good = () => fire([10, 30, 14], [0, 60]);
/** Graded Easy, lesson step done. */
export const success = () => fire([10, 40, 12, 40, 22], [0, 70, 140]);
/** Wrong answer, graded Again. */
export const bad = () => fire([28, 45, 28], [0, 90]);
/** Session or lesson finished. */
export const done = () => fire([12, 50, 12, 50, 12, 50, 36], [0, 80, 160, 260]);
/** Snap into place (sheet settles, tile lands). */
export const snap = () => fire(8, [0]);
