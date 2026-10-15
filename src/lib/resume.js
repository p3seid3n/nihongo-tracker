// Remembers where you were in a lesson or a practice set, so leaving and coming back carries on from there.
// Kept on this device (localStorage) for a day; finishing or starting over clears it.
const PREFIX = "nt-resume:";
const MAX_AGE = 24 * 60 * 60 * 1000;

export function loadResume(key, now = Date.now()) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || now - (v.at || 0) > MAX_AGE) { localStorage.removeItem(PREFIX + key); return null; }
    return v;
  } catch { return null; }
}

export function saveResume(key, state, now = Date.now()) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ ...state, at: now })); } catch { /* full or private mode: just don't remember */ }
}

export function clearResume(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}
