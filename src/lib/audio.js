// Listening: native clips imported from Anki decks (kept in IndexedDB on this device) with the
// phone's Japanese text-to-speech voice as the fallback.
import { createStore, get as idbGet, set as idbSet, clear as idbClear } from "idb-keyval";
import { plainOf } from "./jp.js";

let prefs = { autoplay: true, rate: 1, voiceURI: "" };
export function setAudioPrefs(p) { prefs = { ...prefs, ...p }; }
export const getAudioPrefs = () => prefs;

// ---------------------------------------------------------------------------
// Clip storage
let db = null;
const clips = () => (db = db || createStore("nt-audio", "clips"));

export async function putClip(name, bytes, mime = "audio/mpeg") {
  await idbSet(name, new Blob([bytes], { type: mime }), clips());
}
export async function hasClip(name) {
  if (!name) return false;
  try { return !!(await idbGet(name, clips())); } catch { return false; }
}
export async function getAudioInfo() {
  try { return (await idbGet("\u0000meta", clips())) || { count: 0, bytes: 0 }; } catch { return { count: 0, bytes: 0 }; }
}
export async function addAudioInfo(count, bytes) {
  const cur = await getAudioInfo();
  await idbSet("\u0000meta", { count: cur.count + count, bytes: cur.bytes + bytes }, clips());
}
export async function clearAudio() { stop(); await idbClear(clips()); urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear(); }

// ---------------------------------------------------------------------------
// Playback
const urls = new Map();
let el = null;
let token = 0; // bumped on every new request so an older one can't start late

function audioEl() {
  if (!el && typeof Audio !== "undefined") { el = new Audio(); el.preload = "auto"; }
  return el;
}

async function urlFor(name) {
  if (urls.has(name)) return urls.get(name);
  const blob = await idbGet(name, clips());
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(name, u);
  if (urls.size > 40) { const first = urls.keys().next().value; URL.revokeObjectURL(urls.get(first)); urls.delete(first); }
  return u;
}

/** Plays a stored clip. Resolves true when it finished, false if missing or blocked. */
export async function playClip(name, myToken = ++token) {
  const a = audioEl();
  if (!a || !name) return false;
  let url;
  try { url = await urlFor(name); } catch { return false; }
  if (!url || myToken !== token) return false;
  return new Promise((resolve) => {
    const end = (ok) => { a.onended = a.onerror = null; resolve(ok); };
    a.onended = () => end(true);
    a.onerror = () => end(false);
    try {
      a.pause();
      a.src = url;
      a.playbackRate = Math.min(1.25, Math.max(0.6, prefs.rate || 1));
      const p = a.play();
      if (p && p.catch) p.catch(() => end(false));
    } catch { end(false); }
  });
}

// ---------------------------------------------------------------------------
// Text to speech
const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
export const ttsSupported = hasTTS;
let voicesP = null;
let utter = null; // keep a reference: Chrome can garbage-collect a speaking utterance and never fire onend

export function loadVoices() {
  if (!hasTTS) return Promise.resolve([]);
  if (voicesP) return voicesP;
  voicesP = new Promise((resolve) => {
    const read = () => window.speechSynthesis.getVoices().filter((v) => /^ja([-_]|$)/i.test(v.lang));
    const first = read();
    if (first.length) return resolve(first);
    let done = false;
    const finish = () => { if (done) return; done = true; window.speechSynthesis.removeEventListener?.("voiceschanged", finish); resolve(read()); };
    window.speechSynthesis.addEventListener?.("voiceschanged", finish);
    setTimeout(finish, 1500);
  }).then((v) => { if (!v.length) voicesP = null; return v; }); // try again later if none showed up yet
  return voicesP;
}

const QUALITY = /(premium|enhanced|natural|neural|siri)/i;
export function pickVoice(voices, uri = prefs.voiceURI) {
  if (!voices.length) return null;
  const chosen = uri && voices.find((v) => v.voiceURI === uri);
  if (chosen) return chosen;
  const score = (v) => (QUALITY.test(v.name) ? 4 : 0) + (v.localService ? 2 : 0) + (/google|kyoko|otoya|nanami|haruka|ichiro/i.test(v.name) ? 1 : 0) + (/^ja-JP$/i.test(v.lang) ? 0.5 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

export async function hasJapaneseVoice() { return (await loadVoices()).length > 0; }

/** Speaks text with the Japanese voice. Resolves true when finished, false if it could not. */
export async function speak(text, myToken = ++token) {
  if (!hasTTS || !text) return false;
  const voices = await loadVoices();
  if (myToken !== token) return false;
  const voice = pickVoice(voices);
  if (!voice) return false; // never read Japanese with an English voice
  const synth = window.speechSynthesis;
  synth.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice.lang || "ja-JP";
    u.voice = voice;
    u.rate = Math.min(1.2, Math.max(0.5, prefs.rate || 1));
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    utter = u;
    // Chrome drops a speak() issued in the same tick as cancel()
    setTimeout(() => { if (myToken === token) synth.speak(u); else resolve(false); }, 30);
  });
}

export function stop() {
  token++;
  try { if (hasTTS) window.speechSynthesis.cancel(); } catch { /* ignore */ }
  try { if (el) el.pause(); } catch { /* ignore */ }
}

/** Native clip if we have one, otherwise synthesized. part = { file, text } */
export async function say(part) {
  if (!part) return false;
  const my = ++token;
  stop();
  token = my;
  if (part.file && (await playClip(part.file, my))) return true;
  if (my !== token) return false;
  return speak(part.text, my);
}

/** First user gesture: unlocks audio and speech on iOS so later auto-play works. */
let unlocked = false;
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    if (hasTTS) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); }
    const a = audioEl();
    if (a) { a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA="; a.volume = 0; const p = a.play(); const reset = () => { a.volume = 1; }; if (p && p.then) p.then(reset, reset); else reset(); }
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// What to say for a card
const HAS_KANA = /[ぁ-ゟ゠-ヿ]/;
export function wordPart(card, kind) {
  if (!card || kind === "kanji") return null; // readings are not stored for kanji cards
  const x = card.x || {};
  if (kind === "kana") return card.f ? { file: x.wa || "", text: card.f } : null;
  const text = card.r && HAS_KANA.test(card.r) ? card.r : plainOf(card.f || "");
  return text ? { file: x.wa || "", text } : null;
}
export function sentencePart(card) {
  const x = card?.x || {};
  const text = plainOf(x.sent || x.sentF || "").replace(/\s+/g, "");
  return text ? { file: x.sa || "", text } : null;
}
/** Plain Japanese from furigana markup (lesson examples). */
export const markupPart = (markup) => {
  const text = plainOf(String(markup || "").replace(/\|/g, "").replace(/\*/g, "").replace(/^=/, "")).replace(/\s+/g, "");
  return text ? { file: "", text } : null;
};
