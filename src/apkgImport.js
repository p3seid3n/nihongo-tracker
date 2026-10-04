import { unzipSync } from "fflate";
import { decompress as zstdDecompress } from "fzstd";
import initSqlJs from "sql.js";

const SQLJS_VERSION = "1.13.0";
const SQLJS_SOURCES = [
  `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQLJS_VERSION}/dist/`,
  `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`,
];

let SQL = null;
async function getSQL() {
  if (SQL) return SQL;
  let lastErr;
  for (const base of SQLJS_SOURCES) {
    try {
      SQL = await initSqlJs({ locateFile: (f) => base + f });
      return SQL;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No sql.js source available");
}

function cleanField(s) {
  if (!s) return "";
  return s
    .replace(/\[sound:[^\]]+\]/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, "$1")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function splitDeckName(raw) {
  const parts = raw.split("\x1f");
  return { leaf: parts[parts.length - 1], full: parts.join(" › ") };
}

export async function parseApkg(file) {
  let sql;
  try {
    sql = await getSQL();
  } catch (e) {
    throw new Error("Couldn't load the database engine — check your connection and try again.");
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  let entries;
  try {
    entries = unzipSync(buf);
  } catch (e) {
    throw new Error("Couldn't open this file — make sure it's an .apkg exported from Anki.");
  }

  let dbBytes;
  if (entries["collection.anki21b"]) {
    try {
      dbBytes = zstdDecompress(entries["collection.anki21b"]);
    } catch (e) {
      throw new Error("Couldn't decompress this deck's database — it may be a corrupted export.");
    }
  } else if (entries["collection.anki21"]) {
    dbBytes = entries["collection.anki21"];
  } else if (entries["collection.anki2"]) {
    dbBytes = entries["collection.anki2"];
  } else {
    throw new Error("Not a valid .apkg file — no collection database found inside.");
  }

  const db = new sql.Database(dbBytes);

  let decksRes, cardsRes, notesRes;
  try {
    decksRes = db.exec("SELECT id, name FROM decks");
    cardsRes = db.exec("SELECT nid, did FROM cards");
    notesRes = db.exec("SELECT id, flds FROM notes");
  } catch (e) {
    db.close();
    throw new Error("Couldn't read this deck's contents — the file may use an unsupported Anki version.");
  }

  if (!notesRes.length || !notesRes[0].values.length) {
    db.close();
    throw new Error("No notes found in this deck.");
  }
  if (notesRes[0].values.length === 1 && String(notesRes[0].values[0][1]).includes("update to the latest Anki")) {
    db.close();
    throw new Error("This file only contains a placeholder — try re-exporting from AnkiDroid as a fresh .apkg.");
  }

  const deckNameById = decksRes.length
    ? Object.fromEntries(decksRes[0].values.map(([id, name]) => [id, splitDeckName(String(name))]))
    : {};
  const didByNid = cardsRes.length
    ? Object.fromEntries(cardsRes[0].values.map(([nid, did]) => [nid, did]))
    : {};

  const byDeck = {};
  for (const [id, flds] of notesRes[0].values) {
    const parts = String(flds).split("\x1f");
    const front = cleanField(parts[0]);
    const back = cleanField(parts[1] || parts[0]);
    if (!front || !back) continue;

    const did = didByNid[id];
    const deckInfo = deckNameById[did] || { leaf: file.name.replace(/\.apkg$/i, ""), full: "" };
    const key = deckInfo.leaf;
    if (!byDeck[key]) byDeck[key] = { name: key, cards: [] };
    byDeck[key].cards.push({ id: `apkg-${id}`, front, back });
  }

  db.close();

  const decks = Object.values(byDeck).filter((d) => d.cards.length > 0);
  if (!decks.length) throw new Error("Found notes but none had usable text after cleanup.");
  return { decks };
}
