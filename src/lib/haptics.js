let enabled = true;
export function setHaptics(on) { enabled = !!on; }
function buzz(p) {
  try { if (enabled && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(p); } catch { /* ignore */ }
}
export const tap = () => buzz(8);
export const good = () => buzz(14);
export const bad = () => buzz([30, 40, 30]);
export const done = () => buzz([12, 40, 12, 40, 24]);
