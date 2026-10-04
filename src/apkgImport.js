import { unzipSync } from "fflate";
import initSqlJs from "sql.js";

let SQL = null;
async function getSQL() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/${f}`,
    });
  }
  return SQL;
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
  const sql = await getSQL();
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(buf);

  const dbName = entries["collection.anki21"] ? "collection.anki21" : "collection.anki2";
  if (!entries[dbName]) throw new Error("Not a valid .apkg file — no collection database found.");

  const db = new sql.Database(entries[dbName]);
  const notesRes = db.exec("SELECT id, flds, tags FROM notes");
  if (!notesRes.length) throw new Error("No notes found in this deck.");

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
  return { deckName, cards };
}
