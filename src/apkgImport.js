import { unzipSync } from "fflate";
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

  const dbName = entries["collection.anki21"] ? "collection.anki21" : "collection.anki2";
  if (!entries[dbName]) throw new Error("Not a valid .apkg file — no collection database found inside.");

  const db = new sql.Database(entries[dbName]);
  const notesRes = db.exec("SELECT id, flds, tags FROM notes");
  if (!notesRes.length) { db.close(); throw new Error("No notes found in this deck."); }

  const colRes = db.exec("SELECT decks FROM col LIMIT 1");
  let deckName = file.name.replace(/\.apkg$/i, "");
  try {
    const decksJson = JSON.parse(colRes[0].values[0][0]);
    const names = Object.values(decksJson).map((d) => d.name).filter((n) => n !== "Default");
    if (names.length) deckName = names[0];
  } catch (e) { /* fall back to filename */ }

  const rows = notesRes[0].values;
  const cards = rows.map(([id, flds]) => {
    const parts = String(flds).split("\x1f");
    const front = cleanField(parts[0]);
    const back = cleanField(parts[1] || parts[0]);
    return { id: `apkg-${id}`, front, back };
  }).filter((c) => c.front && c.back);

  db.close();
  if (!cards.length) throw new Error("Found notes but none had usable text after cleanup.");
  return { deckName, cards };
}
