// Haptic feedback.
//
// Android (Chrome, Brave): the Vibration API. It can only switch the motor on and off, so feel comes from
// rhythm: how long each pulse is (a few ms is a fine tick, 30+ ms is a thud) and how long the gaps are.
// iPhone (Safari 17.4+): there is no vibration API, but toggling a hidden "switch" checkbox makes iOS play
// its system tick. Every pattern below is turned into a list of those ticks (a long pulse becomes a quick pair).
//
// A pattern is a Vibration API array: [on, off, on, off, ...] in milliseconds.
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

/** Ink flow: a quick roll of tiny pulses whose gaps keep growing (fast, then slow motion), ending in a thump. */
export function inkFlowPattern({ pulses = 13, first = 9, ratio = 1.28, thump = 42 } = {}) {
  const out = [];
  let gap = first;
  for (let i = 0; i < pulses; i++) {
    out.push(5);
    out.push(Math.round(gap));
    gap *= ratio;
  }
  out.push(thump);
  return out;
}

/** The vocabulary of the app. */
export const PATTERNS = {
  // controls
  tick: [4],                         // selection: tabs, chips, list rows
  tap: [8],                          // buttons
  press: [12],                       // bigger buttons, confirms
  medium: [18],
  snap: [5, 26, 9],                  // something settles into place
  toggleOn: [6, 24, 14],             // rising: switched on
  toggleOff: [14, 24, 5],            // falling: switched off
  reveal: [5, 20, 10],               // turning a card over: tick-tock
  // grades and answers
  again: [34, 55, 34, 40, 14],       // heavy double knock that dies away
  hard: [20, 70, 8],                 // one firm knock and a soft echo
  good: [8, 26, 16],                 // crisp pair
  easy: [6, 20, 10, 20, 16, 20, 28], // rising run: crescendo
  correct: [10, 24, 18],
  wrong: [30, 52, 22],
  match: [7, 22, 7],                 // a pair clicks together
  stroke: [6, 18, 12],               // a pen stroke accepted
  // moments
  success: [8, 22, 10, 22, 14, 22, 24],
  error: [22, 44, 22, 44, 22],
  stamp: [46, 38, 16, 70, 6],        // a hanko pressed onto paper: thud, rebound, settle
  roll: [6, 14, 6, 14, 8, 14, 8, 14, 10, 14, 10, 14, 12, 14, 14, 14, 18, 14, 24], // drum roll that grows
  inkFlow: inkFlowPattern(),
  done: [12, 40, 12, 40, 14, 40, 18, 60, 44, 90, 12],   // session finished: build up, big thump, echo
  lesson: [10, 30, 14, 30, 18, 30, 26, 70, 46, 80, 10], // lesson finished
};

const MIN_TICK_GAP = 48; // iOS ticks closer than this blur into one

/**
 * Ticks (delays in ms from now) that play a pattern on an iPhone. A pulse of 6 ms or more is a tick;
 * a long one (24 ms or more) adds a second tick right after it so thuds feel heavier than taps.
 * Ticks that would land too close to the previous one are dropped. At most 14 ticks.
 */
export function ticksFor(pattern) {
  const ticks = [];
  let t = 0;
  let last = -Infinity;
  const add = (at) => { if (at - last >= MIN_TICK_GAP && ticks.length < 14) { ticks.push(Math.round(at)); last = at; return true; } return false; };
  for (let i = 0; i < pattern.length; i++) {
    const d = pattern[i];
    if (i % 2 === 0 && d >= 3) {
      const placed = add(t);
      if (placed && d >= 24) { ticks.push(Math.round(t + 30)); last = t + 30; }
    }
    t += d;
  }
  return ticks;
}

function fire(pattern) {
  if (!enabled) return;
  try {
    if (isIOS) ticksFor(pattern).forEach((d) => (d ? setTimeout(ios, d) : ios()));
    else if (canVibrate) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

const make = (name) => () => fire(PATTERNS[name]);

/** Selection tick: tabs, chips, list rows. */
export const tick = make("tick");
/** Light tap: buttons. */
export const tap = make("tap");
export const press = make("press");
/** Medium: confirms. */
export const medium = make("medium");
/** Snap into place (sheet settles, tile lands). */
export const snap = make("snap");
export const toggleOn = make("toggleOn");
export const toggleOff = make("toggleOff");
export const reveal = make("reveal");
export const again = make("again");
export const hard = make("hard");
export const easy = make("easy");
export const correct = make("correct");
export const wrong = make("wrong");
export const match = make("match");
export const stroke = make("stroke");
export const error = make("error");
export const stamp = make("stamp");
export const roll = make("roll");
export const inkFlow = make("inkFlow");
/** Correct answer, graded Good. */
export const good = make("good");
/** Lesson step done. */
export const success = make("success");
/** Wrong answer, graded Again. */
export const bad = make("wrong");
/** Session or lesson finished. */
export const done = make("done");
export const lesson = make("lesson");

/** Length of a pattern in ms. */
export const patternLength = (p) => p.reduce((a, b) => a + b, 0);
