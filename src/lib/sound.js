// Sound: Japanese instruments synthesised in the browser (no recordings, nothing to download).
//
//   koto, shamisen   plucked strings (Karplus-Strong: a burst of noise ringing in a tuned, damped delay line;
//                    the shamisen adds the buzzing "sawari" and a plectrum click)
//   taiko            a skin drum: a sine whose pitch falls as the skin settles, plus the thump of the stick
//   katana           the "shing" of a blade: inharmonic metal partials with a long ring, and a whoosh of air
//   fūrin, rin       a wind chime and a temple bowl: bell partials that beat slowly against each other
//   shakuhachi       a bamboo flute: a breathy tone with vibrato
//   hyōshigi         two wooden clappers, for small things
//
// Melodies use the miyako-bushi scale (D E♭ G A B♭), the sound of koto music. A combo climbs it note by note.
// Everything is quiet by design and can be switched off (Settings → Look and feel → Sound).

let ctx = null;
let master = null, sfxBus = null, musicBus = null;
let prefs = { sfx: true, music: false, volume: 0.7 };
const cache = new Map();

const SCALE = [0, 1, 5, 7, 8]; // semitones above D in the miyako-bushi scale
const D4 = 293.66;
/** Frequency of the n-th note of the scale (0 = D4, 5 = D5, -5 = D3 ...). */
export function scaleNote(n) {
  const oct = Math.floor(n / 5), deg = ((n % 5) + 5) % 5;
  return D4 * Math.pow(2, oct + SCALE[deg] / 12);
}

export function setSoundPrefs(p) {
  prefs = { ...prefs, ...p };
  if (master) master.gain.value = prefs.volume;
  if (prefs.music) startMusic(); else stopMusic();
}
export const soundPrefs = () => prefs;

function audio() {
  if (ctx) return ctx;
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain(); master.gain.value = prefs.volume;
    // a gentle limiter so stacked sounds never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.72; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    // a small room: short noise reverb, shared by everything
    const rev = ctx.createConvolver();
    rev.buffer = impulse(1.6, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    sfxBus.connect(rev); musicBus.connect(rev); rev.connect(wet).connect(master);
  } catch { ctx = null; }
  return ctx;
}

/** Resume the audio engine after a tap (browsers start it suspended). */
export function unlockSound() {
  if (!prefs.sfx && !prefs.music) return false; // nothing to play: don't create an audio engine at all
  const c = audio();
  if (!c) return true;
  if (c.state === "suspended") c.resume().catch(() => {});
  return c.state === "running";
}

function impulse(seconds, decay) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}

const ready = () => prefs.sfx && audio() && ctx.state !== "closed";
const now = () => ctx.currentTime;

// ---------------------------------------------------------------------------
// plucked strings (Karplus-Strong), rendered once per pitch and cached
function pluckBuffer(freq, { seconds = 1.6, damp = 0.996, bright = 0.5, buzz = 0 } = {}) {
  const key = `${Math.round(freq * 10)}:${damp}:${bright}:${buzz}`;
  if (cache.has(key)) return cache.get(key);
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, n, sr);
  const out = buf.getChannelData(0);
  const period = sr / freq;
  const len = Math.max(2, Math.floor(period));
  const frac = period - len;
  const line = new Float32Array(len + 1);
  // the pluck: noise shaped towards the plucking point (brighter = closer to the bridge)
  for (let i = 0; i <= len; i++) line[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.max(0, Math.sin((Math.PI * i) / len)) ** (1 - bright)) // max: sin(π) can come out as -1e-16, and a negative to a fractional power is NaN;
  let idx = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const a = line[idx], b = line[(idx + 1) % (len + 1)];
    let v = (a * (1 - frac) + b * frac);
    // lowpass in the loop: high partials die first, like a real string
    const lp = damp * (bright * v + (1 - bright) * 0.5 * (v + prev));
    prev = v;
    v = lp;
    line[idx] = v;
    // shamisen sawari: the string grazes the neck and buzzes (on the output only, so the loop can't run away)
    out[i] = buzz ? v * (1 - buzz * 0.3) + buzz * Math.tanh(v * 6) * 0.12 : v;
    idx = (idx + 1) % (len + 1);
  }
  // fade the tail
  for (let i = n - 2000; i < n; i++) out[i] *= (n - i) / 2000;
  cache.set(key, buf);
  return buf;
}

function play(buf, { at = 0, gain = 0.5, rate = 1, pan = 0, bus = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buf; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  let node = src.connect(g);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
  node.connect(bus);
  src.start(now() + at);
  return src;
}

function koto(n, at = 0, gain = 0.42, bus) { play(pluckBuffer(scaleNote(n), { damp: 0.9965, bright: 0.55 }), { at, gain, pan: Math.max(-0.5, Math.min(0.5, n / 14)), bus }); }
function shamisen(n, at = 0, gain = 0.38) {
  play(pluckBuffer(scaleNote(n), { seconds: 0.9, damp: 0.992, bright: 0.85, buzz: 0.6 }), { at, gain });
  noise({ at, dur: 0.012, freq: 3500, q: 1.5, gain: 0.25 }); // bachi (plectrum) click
}

// ---------------------------------------------------------------------------
// noise, tones, drums, metal
let noiseBuf = null;
function noise({ at = 0, dur = 0.1, freq = 1000, q = 1, gain = 0.3, sweepTo = null, type = "bandpass" } = {}) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  const t = now() + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function tone({ at = 0, freq = 440, to = null, dur = 0.5, gain = 0.3, type = "sine", attack = 0.005, bus = sfxBus, vibrato = 0 }) {
  const o = ctx.createOscillator(); o.type = type;
  const g = ctx.createGain();
  const t = now() + at;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  if (vibrato) {
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * vibrato, t + dur * 0.5);
    lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}

function taiko(at = 0, gain = 0.9, pitch = 1) {
  tone({ at, freq: 150 * pitch, to: 52 * pitch, dur: 0.75, gain, attack: 0.002 });
  tone({ at, freq: 95 * pitch, to: 48 * pitch, dur: 0.5, gain: gain * 0.5, type: "triangle", attack: 0.002 });
  noise({ at, dur: 0.07, freq: 220, q: 0.8, gain: gain * 0.6, type: "lowpass" }); // the stick on the skin
}
const ka = (at = 0, gain = 0.35) => noise({ at, dur: 0.05, freq: 2600, q: 6, gain }); // taiko rim

function bell(partials, { at = 0, base = 880, dur = 3, gain = 0.2, beat = 0.6 } = {}) {
  partials.forEach(([ratio, amp], i) => {
    tone({ at, freq: base * ratio, dur: dur * (1 - i * 0.12), gain: gain * amp, attack: 0.002 });
    if (beat) tone({ at, freq: base * ratio + beat * (i + 1), dur: dur * 0.8, gain: gain * amp * 0.5, attack: 0.002 });
  });
}
const furin = (at = 0, gain = 0.16) => bell([[1, 1], [2.76, 0.5], [5.4, 0.22]], { at, base: 2093 + Math.random() * 120, dur: 2.4, gain });
const rin = (at = 0, gain = 0.22) => bell([[1, 1], [2.32, 0.6], [4.25, 0.3], [6.8, 0.12]], { at, base: 523, dur: 4.5, gain, beat: 1.3 });

function katana(at = 0, gain = 0.3) {
  noise({ at, dur: 0.22, freq: 900, sweepTo: 7000, q: 0.9, gain: gain * 1.2 }); // the cut through the air
  bell([[1, 1], [1.53, 0.7], [2.41, 0.5], [3.67, 0.3]], { at: at + 0.06, base: 2400, dur: 1.4, gain: gain * 0.55, beat: 4 }); // the blade rings
}
const woosh = (at = 0, gain = 0.32) => noise({ at, dur: 0.28, freq: 500, sweepTo: 3200, q: 0.7, gain });
const hyoshigi = (at = 0, gain = 0.32) => { noise({ at, dur: 0.035, freq: 1700, q: 9, gain }); tone({ at, freq: 1650, dur: 0.06, gain: gain * 0.5, attack: 0.001 }); };

function shakuhachi(notes, at = 0, gain = 0.16) {
  let t = at;
  for (const [n, d] of notes) {
    const f = scaleNote(n);
    tone({ at: t, freq: f * 0.985, to: f, dur: d, gain, type: "triangle", attack: 0.08, vibrato: 0.012 });
    noise({ at: t, dur: d * 0.9, freq: f * 2, q: 2, gain: gain * 0.35 }); // breath
    t += d * 0.85;
  }
}

// ---------------------------------------------------------------------------
// the vocabulary of the app
const safe = (fn) => (...a) => {
  if (!ready()) return;
  if (ctx.state === "suspended" && !(typeof document !== "undefined" && document.hidden)) ctx.resume().catch(() => {});
  try { fn(...a); } catch { /* sound is never essential */ }
};

export const sfx = {
  /** Turning a card over. */
  reveal: safe(() => hyoshigi(0, 0.18)),
  /** A small tap (selecting an answer). */
  select: safe(() => koto(3, 0, 0.12)),
  /** Grades. Again: a low, damped taiko. Hard: a wood knock. Good: two rising koto notes. Easy: a run. */
  again: safe(() => { taiko(0, 0.45, 0.8); shamisen(-5, 0.05, 0.12); }),
  hard: safe(() => { hyoshigi(0, 0.26); koto(2, 0.06, 0.2); }),
  good: safe((combo = 0) => { const b = 3 + Math.min(combo, 10); koto(b, 0, 0.32); koto(b + 2, 0.08, 0.3); }),
  easy: safe((combo = 0) => { const b = 3 + Math.min(combo, 10); [0, 1, 2, 4].forEach((k, i) => koto(b + k, i * 0.06, 0.28)); }),
  /** An exercise answered right / wrong. */
  correct: safe((combo = 0) => { const b = 4 + Math.min(combo, 12); koto(b, 0, 0.34); koto(b + 2, 0.09, 0.32); if (combo >= 3) furin(0.12, 0.08); }),
  wrong: safe(() => { shamisen(-3, 0, 0.3); tone({ freq: 196, to: 160, dur: 0.35, gain: 0.08, type: "triangle" }); }),
  /** A combo milestone: the katana is drawn. */
  combo: safe((n = 5) => { katana(0, n >= 20 ? 0.36 : 0.28); taiko(0.02, 0.5); if (n >= 10) ka(0.18); }),
  /** The slash animation on a correct answer. */
  slash: safe(() => woosh(0, 0.22)),
  /** A finished session, lesson or practice set. */
  finish: safe(() => { taiko(0, 0.8); taiko(0.22, 0.6); ka(0.36); [0, 1, 2, 3, 5].forEach((k, i) => koto(5 + k, 0.42 + i * 0.09, 0.3)); rin(0.95, 0.12); }),
  /** A new rank. */
  levelUp: safe(() => { taiko(0, 0.9); taiko(0.3, 0.7); taiko(0.52, 0.9, 1.15); katana(0.75, 0.32); shakuhachi([[5, 0.5], [7, 0.45], [8, 0.4], [10, 1.4]], 0.9, 0.15); furin(1.9, 0.12); }),
  /** A daily quest done / an achievement. */
  quest: safe(() => { furin(0, 0.16); koto(7, 0.05, 0.26); koto(9, 0.14, 0.24); }),
  badge: safe(() => { rin(0, 0.2); [5, 7, 9, 10].forEach((k, i) => koto(k, 0.1 + i * 0.07, 0.26)); }),
  /** The day's goal reached or the streak extended. */
  goal: safe(() => { taiko(0, 0.6); rin(0.08, 0.18); shakuhachi([[7, 0.4], [10, 1.1]], 0.2, 0.13); }),
  /** A seal pressed on the page. */
  stamp: safe(() => { taiko(0, 0.35, 1.6); hyoshigi(0.01, 0.2); }),
  /** A tile placed in a sentence. */
  place: safe((i = 0) => koto(2 + (i % 6), 0, 0.16)),
};

// ---------------------------------------------------------------------------
// ambient music: slow koto phrases in the scale, a low drone now and then, a wind chime
let musicTimer = null;
function startMusic() {
  if (musicTimer || !audio()) return;
  let step = 0;
  const phrase = () => {
    if (!prefs.music || !ctx || ctx.state !== "running") { musicTimer = setTimeout(phrase, 2000); return; }
    const root = [0, 2, -1, 3][Math.floor(step / 4) % 4];
    const motif = [[0, 0], [2, 0.5], [3, 0.9], [2, 1.6], [4, 2.1], [3, 2.9]];
    for (const [k, t] of motif) if (Math.random() < 0.82) koto(root + k + (Math.random() < 0.15 ? 5 : 0), t + Math.random() * 0.06, 0.2 + Math.random() * 0.08, musicBus);
    if (step % 4 === 0) play(pluckBuffer(scaleNote(root - 5), { seconds: 2.2, damp: 0.998, bright: 0.3 }), { gain: 0.25, bus: musicBus });
    if (Math.random() < 0.18) setTimeout(() => { if (prefs.music && ctx && ctx.state === "running") try { furin(0, 0.05); } catch { /* ignore */ } }, 1500);
    step++;
    musicTimer = setTimeout(phrase, 3800 + Math.random() * 1800);
  };
  musicTimer = setTimeout(phrase, 600);
}
function stopMusic() { clearTimeout(musicTimer); musicTimer = null; }

// pause everything while the app is in the background (and keep the phone's audio focus free)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (prefs.sfx || prefs.music) ctx.resume().catch(() => {});
  });
}

/** Render a sound offline (for tests): returns the peak level, or null when OfflineAudioContext is missing. */
export async function renderPeak(name, ...args) {
  const OAC = typeof window !== "undefined" && window.OfflineAudioContext;
  if (!OAC) return null;
  const saved = { ctx, master, sfxBus, musicBus, sfx: prefs.sfx };
  const off = new OAC(2, 44100 * 3, 44100);
  ctx = off; master = off.createGain(); master.gain.value = 1; master.connect(off.destination);
  sfxBus = off.createGain(); sfxBus.connect(master); musicBus = off.createGain(); musicBus.connect(master);
  prefs.sfx = true;
  cache.clear(); noiseBuf = null;
  try {
    sfx[name](...args);
    const buf = await off.startRendering();
    let peak = 0, nan = false;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (Number.isNaN(v)) nan = true; else if (v > peak) peak = v; } }
    return nan ? NaN : peak;
  } finally {
    ({ ctx, master, sfxBus, musicBus } = saved); prefs.sfx = saved.sfx; cache.clear(); noiseBuf = null;
  }
}
/** Lower the music while words or sentences are read aloud. */
export function duckMusic(on) {
  if (!musicBus || !ctx) return;
  musicBus.gain.setTargetAtTime(on ? 0.08 : 0.32, ctx.currentTime, 0.15);
}
