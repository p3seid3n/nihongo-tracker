// Feedback that you feel, hear and see at once: every moment of the app goes through here, so the vibration, the
// sound and the animation (drawn by FxLayer in ui/Dojo.jsx) always agree.
import * as hap from "./haptics.js";
import { sfx } from "./sound.js";

const subs = new Set();
/** Listen to visual effects: fn(type, detail). Types: slash, xp, combo, petals, celebrate, answer. */
export function onFx(fn) { subs.add(fn); return () => subs.delete(fn); }
export function emit(type, detail = {}) { for (const fn of subs) { try { fn(type, detail); } catch (e) { console.error(e); } } }

// ---------------------------------------------------------------------------
// the combo of this sitting (the saved one is worked out from the log in game.js)
let combo = 0;
let lastAt = 0;
const GAP = 10 * 60 * 1000;
export const currentCombo = () => (Date.now() - lastAt > GAP ? 0 : combo);
export function resetCombo() { if (combo) { combo = 0; emit("combo", { n: 0 }); } }

const MILESTONES = new Set([5, 10, 15, 20, 25, 30, 40, 50, 75, 100]);
export const isMilestone = (n) => MILESTONES.has(n) || (n > 100 && n % 25 === 0);

/**
 * An answer.
 *   grade: 1..4 for flashcards (Again, Hard, Good, Easy); leave out for exercises and use ok
 *   el: the element the answer belongs to (the card): the blade cuts across it
 *   xp: points earned, shown floating up
 */
export function answer({ grade = 0, ok = grade ? grade >= 2 : false, el = null, xp = 0 } = {}) {
  if (Date.now() - lastAt > GAP) combo = 0;
  lastAt = Date.now();
  const builds = grade ? grade >= 3 : ok;
  const breaks = grade ? grade === 1 : !ok;
  if (builds) combo++; else if (breaks) combo = 0;
  const milestone = builds && isMilestone(combo);

  if (grade === 1) { hap.again(); sfx.again(); }
  else if (grade === 2) { hap.hard(); sfx.hard(); }
  else if (grade === 3) { (milestone ? hap.combo : hap.good)(); sfx.good(combo); }
  else if (grade === 4) { (milestone ? hap.combo : hap.easy)(); sfx.easy(combo); }
  else if (ok) { (milestone ? hap.combo : hap.correct)(); sfx.correct(combo); }
  else { hap.wrong(); sfx.wrong(); }

  if (builds) {
    emit("slash", { el, strong: grade === 4 || milestone, combo });
    if (grade === 4 && !milestone) sfx.slash();
  } else if (breaks) emit("miss", { el });
  if (milestone) { sfx.combo(combo); emit("combo", { n: combo, milestone: true }); }
  else emit("combo", { n: combo });
  if (xp > 0) emit("xp", { el, xp });
  return { combo, milestone };
}

/** Turning a card over. */
export function reveal() { hap.reveal(); sfx.reveal(); }
/** A tile placed into a sentence, a choice picked. */
export function place(i = 0) { hap.snap(); sfx.place(i); }
export function select() { hap.tap(); sfx.select(); }
/** A small miss that doesn't end anything (a wrong pair in a matching exercise). */
export function nope(el) { hap.wrong(); sfx.wrong(); emit("miss", { el }); }
/** A session, lesson or practice set finished (big: a lesson or a full session). */
export function finish({ big = true } = {}) {
  (big ? hap.done : hap.success)();
  sfx.finish();
  emit("petals", { n: big ? 34 : 18 });
}
/** Celebrations (from DojoWatcher). */
export function levelUp() { hap.levelUp(); sfx.levelUp(); emit("petals", { n: 56 }); }
export function badge() { hap.badge(); sfx.badge(); }
export function quest() { hap.quest(); sfx.quest(); }
export function goal() { hap.success(); sfx.goal(); emit("petals", { n: 26 }); }
/** The samurai draws his sword when you tap him. */
export function flourish() { hap.slash(); sfx.combo(5); emit("flourish", {}); }
export function stamp() { hap.stamp(); sfx.stamp(); }
