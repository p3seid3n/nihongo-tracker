// Day handling. A "study day" starts at 04:00 local time (like Anki), so late-night
// sessions still count towards the day they belong to.
export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
export const ROLLOVER_HOURS = 4;

/** Integer day number (local calendar, shifted by the rollover hour). Stable across DST. */
export function dayIndex(ts) {
  const d = new Date(ts - ROLLOVER_HOURS * HOUR);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

/** Timestamp (ms) of the start of the study day that contains ts. */
export function dayStart(ts) {
  const d = new Date(ts - ROLLOVER_HOURS * HOUR);
  d.setHours(ROLLOVER_HOURS, 0, 0, 0);
  return d.getTime();
}

/** Start of the study day n days after the one containing ts. */
export function addDays(ts, n) {
  const d = new Date(dayStart(ts));
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** "2026-10-09" style key for a study day. */
export function dayKey(ts) {
  const d = new Date(ts - ROLLOVER_HOURS * HOUR);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Key for the month bucket used for the review log, e.g. "2026-10". */
export function monthKey(ts) {
  return dayKey(ts).slice(0, 7);
}

export function dayIndexToDate(idx) {
  const d = new Date(idx * DAY);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function fmtShortDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "10m", "3d", "2.4mo", "1.2y" for a duration in ms. */
export function fmtSpan(ms) {
  if (ms < 0) ms = 0;
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  const d = ms / DAY;
  if (d < 31) return `${Math.round(d)}d`;
  if (d < 365) return `${(d / 30.4).toFixed(1).replace(/\.0$/, "")}mo`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, "")}y`;
}
