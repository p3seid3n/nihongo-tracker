// Pronunciation check. The browser's speech recognizer (Chrome, Edge, Safari) turns what you say
// into text; we compare that text with the word or sentence you were meant to say. Where the
// recognizer isn't available the app records you instead so you can compare by ear.

import { parseFuri } from "./jp.js";

const DIGITS = "〇一二三四五六七八九";
const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** Comparison form: width-normalised, katakana as hiragana, no spaces or punctuation, digits as kanji. */
export function norm(s) {
  return toHira(String(s ?? "").normalize("NFKC"))
    .toLowerCase()
    .replace(/[\s、。，．,.!?！？「」『』（）()[\]{}・…~〜～\-—–"'’”“:;：；]/g, "")
    .replace(/[0-9]/g, (d) => DIGITS[Number(d)]);
}

/** Which characters of a appear, in order, in b (longest common subsequence). Returns { hits, lcs }. */
export function align(a, b) {
  const A = [...a], B = [...b];
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hits = new Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { hits[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return { hits, lcs: dp[0][0] };
}

/**
 * Compare what was heard with what was meant.
 * targets: forms of the answer to accept, e.g. [{ text: "橋" }, { text: "はし" }] (surface first).
 * heard: array of alternatives, best first: [{ text, conf }] or plain strings.
 * Returns { score 0..1, level "great"|"close"|"retry", target (the form it matched), chars, heard }.
 */
export function judge(targets, heard, { units } = {}) {
  const alts = (heard || []).map((h) => (typeof h === "string" ? { text: h } : h)).filter((h) => h && norm(h.text));
  const forms = targets.map((t) => (typeof t === "string" ? t : t.text)).filter((t) => norm(t));
  if (!alts.length || !forms.length) return { score: 0, level: "retry", target: forms[0] || "", chars: [...(forms[0] || "")].map((c) => ({ c, ok: false })), heard: alts[0]?.text || "" };
  let best = null;
  for (const form of forms) {
    const t = norm(form);
    for (const alt of alts) {
      const h = norm(alt.text);
      const { hits, lcs } = align(t, h);
      const score = (2 * lcs) / (t.length + h.length);
      if (!best || score > best.score + 1e-9) best = { score, form, alt, t, hits };
    }
  }
  // sentences: a kanji word heard as kana (or the other way round) still counts
  if (units && units.length) {
    let bu = null;
    for (const alt of alts) {
      const r = alignUnits(units, norm(alt.text));
      if (!bu || r.score > bu.score) bu = { ...r, alt };
    }
    if (bu && bu.score > best.score + 1e-9) {
      const chars = [];
      units.forEach((u, k) => { for (const c of [...u.text]) chars.push(u.forms.length ? { c, ok: !!bu.matched[k] } : { c, ok: true, skip: true }); });
      const len = units.reduce((a, u) => a + (u.forms.length ? [...u.forms[0]].length : 0), 0);
      const great = len <= 2 ? bu.score >= 0.999 : bu.score >= 0.93;
      const close = len <= 2 ? false : bu.score >= 0.7;
      return { score: bu.score, level: great ? "great" : close ? "close" : "retry", target: units.map((u) => u.text).join(""), chars, heard: bu.alt.text };
    }
  }
  // map hits back onto the displayed characters (punctuation and spaces count as hit)
  const shown = [...best.form];
  let k = 0;
  const chars = shown.map((c) => {
    const n = norm(c);
    if (!n) return { c, ok: true, skip: true };
    const ok = !!best.hits[k];
    k += [...n].length;
    return { c, ok };
  });
  const len = best.t.length;
  const great = len <= 2 ? best.score >= 0.999 : best.score >= 0.93;
  const close = len <= 2 ? false : best.score >= 0.7;
  return { score: best.score, level: great ? "great" : close ? "close" : "retry", target: best.form, chars, heard: best.alt.text };
}

/**
 * Units for sentence checking: each kanji run may be matched by its surface or by its reading (a
 * recogniser sometimes writes a word in kana), every other character is its own unit.
 * markup: furigana markup like "私[わたし]はアンです。"
 */
export function unitsFromMarkup(markup) {
  const units = [];
  for (const seg of parseFuri(markup)) {
    if (seg.r != null && seg.t) units.push({ text: seg.t, forms: [norm(seg.t), norm(seg.r)].filter(Boolean) });
    else for (const c of [...seg.t]) units.push({ text: c, forms: [norm(c)].filter(Boolean) });
  }
  return units;
}

/** Best alignment of units against what was heard (normalised). */
function alignUnits(units, heard) {
  const H = [...heard];
  const n = units.length, m = H.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  const how = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null)); // null | "skipU" | "skipH" | form length
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      let best = dp[i - 1][j], h = "skipU";
      if (j > 0 && dp[i][j - 1] > best) { best = dp[i][j - 1]; h = "skipH"; }
      for (const f of units[i - 1].forms) {
        const L = [...f].length;
        if (j >= L && H.slice(j - L, j).join("") === f && dp[i - 1][j - L] + L > best) { best = dp[i - 1][j - L] + L; h = L; }
      }
      dp[i][j] = best; how[i][j] = h;
    }
  }
  const matched = new Array(n).fill(0);
  let i = n, j = m;
  while (i > 0) {
    const h = how[i][j];
    if (h === "skipH") j--;
    else if (h === "skipU" || h == null) i--;
    else { matched[i - 1] = h; j -= h; i--; }
  }
  let target = 0, got = 0;
  units.forEach((u, k) => { if (!u.forms.length) return; if (matched[k]) { target += matched[k]; got += matched[k]; } else target += [...u.forms[0]].length; });
  return { score: target + m ? (2 * got) / (target + m) : 0, matched };
}

// ---------------------------------------------------------------------------
// Browser APIs
const w = typeof window !== "undefined" ? window : {};
const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition || null;
export const recognitionSupported = !!Recognition;
export const recordingSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
export const micSupported = recognitionSupported || recordingSupported;

/** Starts listening. Callbacks: onInterim(text), onResult([{text, conf}]), onError(code). Returns { stop, abort }. */
export function listen({ lang = "ja-JP", onInterim, onResult, onError }) {
  const r = new Recognition();
  r.lang = lang;
  r.interimResults = true;
  r.maxAlternatives = 5;
  r.continuous = false;
  let settled = false, err = "";
  const settle = (fn) => { if (settled) return; settled = true; fn(); };
  r.onresult = (e) => {
    const res = e.results[e.results.length - 1];
    if (!res) return;
    if (res.isFinal) settle(() => onResult(Array.from(res).map((a) => ({ text: a.transcript, conf: a.confidence }))));
    else onInterim?.(res[0]?.transcript || "");
  };
  r.onerror = (e) => { err = e.error || "error"; };
  r.onend = () => settle(() => onError(err || "no-speech"));
  try { r.start(); } catch (e) { settle(() => onError("start-failed")); }
  return {
    stop: () => { try { r.stop(); } catch { /* ignore */ } },
    abort: () => { settled = true; try { r.abort(); } catch { /* ignore */ } },
  };
}

/** Records the microphone. Returns { stop(): Promise<{ url, blob }>, cancel() }. Rejects if the mic is blocked. */
export async function record(maxMs = 15000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const done = new Promise((resolve) => {
    rec.onstop = () => {
      release();
      const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
      resolve({ blob, url: URL.createObjectURL(blob) });
    };
  });
  rec.start();
  const timer = setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, maxMs);
  return {
    stop: () => { clearTimeout(timer); if (rec.state !== "inactive") rec.stop(); return done; },
    cancel: () => { clearTimeout(timer); rec.onstop = null; try { if (rec.state !== "inactive") rec.stop(); } catch { /* ignore */ } release(); },
  };
}

export const ERRORS = {
  "no-speech": "I didn't hear anything. Tap the mic and say it clearly.",
  "not-allowed": "The microphone is blocked. Allow it for this site in your browser settings.",
  "service-not-allowed": "Speech recognition isn't available here.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs an internet connection.",
  "language-not-supported": "This browser can't recognise Japanese.",
  "start-failed": "Couldn't start the microphone. Try again.",
};
