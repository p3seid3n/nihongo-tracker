// Export to Anki (.apkg), to continue in AnkiDroid or Anki desktop.
//
// The package holds a classic Anki collection (schema 11, "collection.anki2"), which every Anki and AnkiDroid
// version imports. Each deck becomes an Anki deck of the same name with three note types (vocabulary, kanji, kana)
// whose fields carry everything the app knows about a card: reading and furigana, meaning, example sentence,
// notes, your own mnemonic, audio and pictures. A word's recall card becomes a second card of the same note.
//
// Scheduling comes along: due dates, intervals, repetitions, lapses, suspended cards, and the FSRS memory state
// (stability, difficulty, last review) in each card's data, so AnkiDroid with FSRS on carries on exactly where you
// are. Your review history goes into the revlog, your FSRS parameters and retention into the deck options.
import { NEW, LEARNING, RELEARNING, REVIEW, DEFAULT_W } from "../fsrs.js";
import { DAY, dayIndex, dayStart } from "../time.js";
import { prodId } from "../ids.js";
import { ACTIVITY } from "../effort.js";
import { parseSteps } from "../store.js";
import { cardFurigana, readingsFromCards } from "../furigana.js";

// ---------------------------------------------------------------------------
// small helpers
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
const sound = (f) => (f ? `[sound:${f}]` : "");
const picture = (f) => (f ? `<img src="${String(f).replace(/"/g, "&quot;")}">` : "");
const plain = (m) => String(m ?? "").replace(/\[[^\]]*\]/g, "");
const markup = (m) => String(m ?? "").replace(/\|/g, "").replace(/\*\*/g, "");

/** SHA-1 (hex) of a string, for Anki's duplicate checksum. */
export function sha1(str) {
  const bytes = new TextEncoder().encode(str);
  const ml = bytes.length * 8;
  const n = ((bytes.length + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(n);
  buf.set(bytes); buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(n - 4, ml >>> 0); dv.setUint32(n - 8, Math.floor(ml / 2 ** 32));
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 80; i++) { const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = (x << 1) | (x >>> 31); }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      const f = i < 20 ? (b & c) | (~b & d) : i < 40 ? b ^ c ^ d : i < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d;
      const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6;
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((x) => x.toString(16).padStart(8, "0")).join("");
}
const csum = (s) => parseInt(sha1(plain(s).replace(/<[^>]+>/g, "")).slice(0, 8), 16);

const G91 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";
/** A stable Anki-style guid for a card id (the same card always gets the same guid, so a second export updates it). */
export function guidFor(id) {
  let h = BigInt("0x" + sha1("kotoba:" + id).slice(0, 15));
  let out = "";
  while (h > 0n) { out = G91[Number(h % 91n)] + out; h /= 91n; }
  return out || "a";
}

// ---------------------------------------------------------------------------
// note types
const CSS = `.card { font-family: "Hiragino Sans", "Noto Sans JP", sans-serif; font-size: 22px; text-align: center; color: #211c19; background: #fbf7f3; line-height: 1.5; }
.nightMode.card, .card.nightMode { color: #ede7e2; background: #151413; }
.big { font-size: 64px; line-height: 1.25; } .kanji { font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif; font-size: 96px; }
.mean { font-size: 26px; font-weight: 600; margin: .4em 0; } .sent { font-size: 26px; margin-top: .8em; } .en { opacity: .7; font-size: 18px; }
.extra { font-size: 17px; opacity: .85; margin-top: .8em; text-align: left; max-width: 34em; margin-left: auto; margin-right: auto; }
.mine { font-size: 17px; margin-top: .8em; padding: .6em .8em; border-radius: 12px; background: rgba(238,133,89,.12); text-align: left; }
img { max-width: 260px; max-height: 260px; border-radius: 12px; margin-top: .6em; } rt { font-size: .5em; }`;

const MODELS = {
  vocab: {
    name: "Kotoba Vocabulary",
    fields: ["Word", "Reading", "Furigana", "Meaning", "Sentence", "Sentence Meaning", "Notes", "My Mnemonic", "Word Audio", "Sentence Audio", "Picture", "Recall"],
    tmpls: [
      { name: "Recognition", qfmt: `<div class="big">{{Word}}</div>`, afmt: `<div class="big">{{furigana:Furigana}}</div>{{Word Audio}}<div class="mean">{{Meaning}}</div>{{Picture}}{{#Sentence}}<div class="sent">{{furigana:Sentence}}</div><div class="en">{{Sentence Meaning}}</div>{{Sentence Audio}}{{/Sentence}}{{#Notes}}<div class="extra">{{Notes}}</div>{{/Notes}}{{#My Mnemonic}}<div class="mine">{{My Mnemonic}}</div>{{/My Mnemonic}}` },
      { name: "Recall", qfmt: `{{#Recall}}<div class="mean">{{Meaning}}</div><div class="en">Say or type it in Japanese</div>{{/Recall}}`, afmt: `{{FrontSide}}<hr id=answer><div class="big">{{furigana:Furigana}}</div>{{Word Audio}}{{#Sentence}}<div class="sent">{{furigana:Sentence}}</div>{{/Sentence}}` },
    ],
  },
  kanji: {
    name: "Kotoba Kanji",
    fields: ["Kanji", "Keyword", "Story", "My Mnemonic", "Stroke Count", "Picture"],
    tmpls: [{ name: "Recognition", qfmt: `<div class="kanji">{{Kanji}}</div>`, afmt: `{{FrontSide}}<hr id=answer><div class="mean">{{Keyword}}</div>{{Picture}}{{#Story}}<div class="extra">{{Story}}</div>{{/Story}}{{#My Mnemonic}}<div class="mine">{{My Mnemonic}}</div>{{/My Mnemonic}}` }],
  },
  kana: {
    name: "Kotoba Kana",
    fields: ["Kana", "Romaji", "Mnemonic", "Picture", "Audio"],
    tmpls: [{ name: "Recognition", qfmt: `<div class="big">{{Kana}}</div>`, afmt: `{{FrontSide}}<hr id=answer><div class="mean">{{Romaji}}</div>{{Audio}}{{Picture}}{{#Mnemonic}}<div class="extra">{{Mnemonic}}</div>{{/Mnemonic}}` }],
  },
};

function fieldsFor(kind, c, rec, prodRec, known) {
  const x = c.x || {};
  const note = rec?.note || "";
  if (kind === "kanji") return [c.f, esc(c.m), esc(x.story), esc(note), esc(x.strokes), picture(x.img)];
  if (kind === "kana") return [c.f, esc(c.m || c.r), esc(x.story), picture(x.img), sound(x.wa)];
  const furi = cardFurigana(c, known) || c.f;
  // Anki's furigana filter wants a space before each bracketed part that follows other text
  const ankiFuri = (m) => String(m).replace(/([^\s一-鿿㐀-䶿々〆])([一-鿿㐀-䶿々〆]+\[)/g, "$1 $2");
  return [esc(c.f), esc(c.r), ankiFuri(furi), esc(c.m), x.sentF || x.sent ? ankiFuri(markup(x.sentF || x.sent)) : "", esc(x.sentE), esc(x.notes), esc(note), sound(x.wa), sound(x.sa), picture(x.img), prodRec && prodRec.st !== NEW ? "y" : ""];
}

// ---------------------------------------------------------------------------
/**
 * Build the collection. Returns { bytes, media: [file names the notes use], counts }.
 * opts: { deckIds (default: all), scheduling (true), history (true), now }
 */
export function buildAnkiCollection(SQL, store, opts = {}) {
  const now = opts.now || Date.now();
  const scheduling = opts.scheduling !== false;
  const history = opts.history !== false && scheduling;
  const decks = store.deckList().filter((d) => !opts.deckIds || opts.deckIds.includes(d.id));
  const s = store.settings;
  const w = store.weights ? store.weights() : DEFAULT_W;
  const retention = s.retention || 0.9;

  // the collection's day 0: a day start before anything that happened
  let first = now;
  for (const d of decks) for (const r of Object.values(store.prog[d.id] || {})) if (r && r.last && r.last < first) first = r.last;
  const crtMs = dayStart(first) - DAY;
  const crt = Math.floor(crtMs / 1000);
  const dayNo = (ts) => dayIndex(ts) - dayIndex(crtMs);

  const db = new SQL.Database();
  db.run(`CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn); CREATE INDEX ix_cards_usn on cards (usn); CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid); CREATE INDEX ix_cards_sched on cards (did, queue, due); CREATE INDEX ix_revlog_cid on revlog (cid); CREATE INDEX ix_notes_csum on notes (csum);`);

  const nowSec = Math.floor(now / 1000);
  const idBase = Math.floor(now / 1000) * 1000 - 50_000_000; // ids are millisecond-like and unique
  let seq = 0;
  const nextId = () => idBase + seq++;

  // note types
  const models = {};
  const mid = {};
  Object.entries(MODELS).forEach(([kind, m], i) => {
    const id = 1700000000000 + i * 1000 + 17; // fixed, so a second export reuses the same note types
    mid[kind] = id;
    models[id] = {
      id, name: m.name, type: 0, mod: nowSec, usn: -1, sortf: 0, did: 1,
      tmpls: m.tmpls.map((t, ord) => ({ name: t.name, ord, qfmt: t.qfmt, afmt: t.afmt, bqfmt: "", bafmt: "", did: null, bfont: "", bsize: 0 })),
      flds: m.fields.map((name, ord) => ({ name, ord, sticky: false, rtl: false, font: "Arial", size: 20, media: [] })),
      css: CSS, latexPre: "", latexPost: "", latexsvg: false, req: m.tmpls.map((_, ord) => [ord, "any", [ord === 1 ? m.fields.indexOf("Recall") : 0]]), tags: [], vers: [],
    };
  });

  // deck options: your scheduling, FSRS parameters and retention
  const learn = parseSteps(s.learnSteps, [60000, 600000]).map((ms) => ms / 60000);
  const relearn = parseSteps(s.relearnSteps, [600000]).map((ms) => ms / 60000);
  const PRESET = 1700000000777; // its own preset, so it doesn't land on top of the "Default" one already in Anki
  const dconf = {
    1: { id: 1, name: "Default", mod: nowSec, usn: -1, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false, new: { delays: [1, 10], ints: [1, 4, 0], initialFactor: 2500, order: 1, perDay: 20, bury: false }, lapse: { delays: [10], mult: 0, minInt: 1, leechFails: 8, leechAction: 1 }, rev: { perDay: 200, ease4: 1.3, maxIvl: 36500, hardFactor: 1.2, bury: false, fuzz: 0.05 } },
    [PRESET]: {
      id: PRESET, name: "Kotoba", mod: nowSec, usn: -1, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false,
      new: { delays: learn, ints: [1, 4, 0], initialFactor: 2500, order: 1, perDay: Math.max(...Object.values(s.newPerDay || { a: 20 })), bury: true },
      lapse: { delays: relearn, mult: 0, minInt: 1, leechFails: 8, leechAction: 1 },
      rev: { perDay: s.maxReviews || 200, ease4: 1.3, maxIvl: s.maxInterval || 36500, hardFactor: 1.2, bury: true, fuzz: 0.05 },
      desiredRetention: retention, fsrsParams6: w, fsrsWeights: w, easyDaysPercentages: Array.isArray(s.easyDays) ? s.easyDays : [1, 1, 1, 1, 1, 1, 1],
    },
  };

  const deckJson = { 1: { id: 1, name: "Default", desc: "", mod: nowSec, usn: -1, collapsed: true, browserCollapsed: true, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0], dyn: 0, conf: 1, extendNew: 0, extendRev: 0 } };
  const didOf = {};
  decks.forEach((d, i) => {
    const id = 1700000100000 + (parseInt(sha1("deck:" + d.id).slice(0, 7), 16) % 1e7) + i;
    didOf[d.id] = id;
    deckJson[id] = { id, name: d.name, desc: "Exported from Kotoba", mod: nowSec, usn: -1, collapsed: false, browserCollapsed: false, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0], dyn: 0, conf: PRESET, extendNew: 0, extendRev: 0 };
  });

  const known = readingsFromCards(decks.filter((d) => d.kind === "vocab").flatMap((d) => Object.values(store.content[d.id] || {})));
  const insNote = db.prepare("INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  const insCard = db.prepare("INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const media = new Set();
  const cidOf = new Map();
  const counts = { notes: 0, cards: 0, reviews: 0, review: 0, learning: 0, new: 0, suspended: 0 };
  let newPos = 0;

  const cardRow = (cid, nid, did, ord, rec) => {
    const r = scheduling ? rec : null;
    let type = 0, queue = 0, due = ++newPos, ivl = 0, left = 0, factor = 0;
    const data = {};
    if (r && r.st !== NEW) {
      factor = Math.round(1300 + (10 - Math.min(10, Math.max(1, r.d || 5))) * 170); // an SM-2 ease for when FSRS is off
      if (r.st === REVIEW) {
        type = 2; queue = 2; due = dayNo(r.due);
        ivl = Math.max(1, r.ivl || Math.round((r.due - (r.last || r.due)) / DAY) || 1);
        counts.review++;
      } else {
        type = r.st === RELEARNING ? 3 : 1;
        const sameDay = dayIndex(r.due) <= dayIndex(now);
        queue = sameDay ? 1 : 3;
        due = sameDay ? Math.floor(r.due / 1000) : dayNo(r.due);
        ivl = r.st === RELEARNING ? Math.max(1, r.ivl || 1) : 0;
        const steps = r.st === LEARNING ? learn : relearn;
        const leftN = Math.max(1, steps.length - (r.step || 0));
        left = leftN * 1000 + leftN;
        counts.learning++;
      }
      if (r.s > 0) { data.s = +r.s.toFixed(4); data.d = +(r.d || 5).toFixed(4); data.dr = retention; data.decay = w[20]; }
      if (r.last) data.lrt = Math.floor(r.last / 1000);
    } else counts.new++;
    if (rec && rec.sus) { queue = -1; counts.suspended++; }
    insCard.run([cid, nid, did, ord, nowSec, -1, type, queue, due, ivl, factor, scheduling ? rec?.reps || 0 : 0, scheduling ? rec?.lapses || 0 : 0, left, 0, 0, 0, Object.keys(data).length ? JSON.stringify(data) : ""]);
    counts.cards++;
  };

  for (const d of decks) {
    const kind = d.kind === "kanji" ? "kanji" : d.kind === "kana" ? "kana" : "vocab";
    const content = store.content[d.id] || {};
    const prog = store.prog[d.id] || {};
    for (const id of store.cardIds(d.id)) {
      const c = content[id];
      if (!c || !c.f) continue;
      const rec = prog[id] || null;
      const prodRec = kind === "vocab" ? prog[prodId(id)] || null : null;
      const flds = fieldsFor(kind, c, rec, prodRec, known);
      const x = c.x || {};
      for (const f of [x.wa, x.sa, x.img]) if (f) media.add(f);
      const nid = nextId();
      insNote.run([nid, guidFor(id), mid[kind], nowSec, -1, "", flds.join("\x1f"), plain(flds[0]).replace(/<[^>]+>/g, ""), csum(flds[0]), 0, ""]);
      counts.notes++;
      const cid = nextId();
      cardRow(cid, nid, didOf[d.id], 0, rec);
      cidOf.set(id, cid);
      if (prodRec && prodRec.st !== NEW) {
        const pcid = nextId();
        cardRow(pcid, nid, didOf[d.id], 1, prodRec);
        cidOf.set(prodId(id), pcid);
      }
    }
  }
  insNote.free(); insCard.free();

  // review history
  if (history) {
    const ins = db.prepare("INSERT OR IGNORE INTO revlog VALUES (?,?,?,?,?,?,?,?,?)");
    const used = new Set();
    for (const rows of Object.values(store.log)) {
      for (const r of rows || []) {
        if (!r || r[2] < 1 || r[2] > 4 || r[4] === ACTIVITY) continue;
        const cid = cidOf.get(r[1]);
        if (!cid) continue;
        let id = Math.round(r[0]);
        while (used.has(id)) id++;
        used.add(id);
        const type = r[4] === REVIEW ? 1 : r[4] === RELEARNING ? 2 : 0;
        ins.run([id, cid, -1, r[2], r[5] > 0 ? r[5] : -600, 0, 0, Math.min(r[3] || 0, 60000), type]);
        counts.reviews++;
      }
    }
    ins.free();
  }

  const conf = { nextPos: newPos + 1, estTimes: true, activeDecks: [1], sortType: "noteFld", timeLim: 0, sortBackwards: false, addToCur: true, curDeck: 1, newBury: true, newSpread: 0, dueCounts: true, curModel: String(mid.vocab), collapseTime: 1200 };
  db.run("INSERT INTO col VALUES (1,?,?,?,11,0,0,0,?,?,?,?,?)", [crt, now, now, JSON.stringify(conf), JSON.stringify(models), JSON.stringify(deckJson), JSON.stringify(dconf), "{}"]);
  const bytes = db.export();
  db.close();
  return { bytes, media: [...media], counts };
}

/**
 * Zip the collection and media into an .apkg Blob. `getMedia(name)` resolves to bytes or null (missing files are
 * left out). `zip` is fflate's module.
 */
export async function packApkg(zip, bytes, mediaNames, getMedia, onProgress = () => {}) {
  const chunks = [];
  let fail = null;
  const z = new zip.Zip((err, chunk) => { if (err) fail = err; else chunks.push(chunk); });
  const add = (name, data, compress) => {
    const f = compress ? new zip.ZipDeflate(name, { level: 6 }) : new zip.ZipPassThrough(name);
    z.add(f);
    f.push(data, true);
  };
  add("collection.anki2", bytes, true);
  const map = {};
  let n = 0;
  for (let i = 0; i < mediaNames.length; i++) {
    const data = getMedia ? await getMedia(mediaNames[i]) : null;
    if (data && data.length) { add(String(n), data, false); map[n] = mediaNames[i]; n++; }
    if (i % 25 === 0) onProgress(i / Math.max(1, mediaNames.length));
  }
  add("media", new TextEncoder().encode(JSON.stringify(map)), true);
  z.end();
  if (fail) throw fail;
  onProgress(1);
  return { blob: new Blob(chunks, { type: "application/octet-stream" }), mediaCount: n };
}
