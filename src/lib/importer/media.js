// Audio from Anki packages. Kaishi (and many other decks) reference clips as [sound:file.mp3].
// In a modern .apkg the file list is a zstd-compressed protobuf and every file inside the zip is
// named by its position in that list (and zstd-compressed itself). Older packages use a JSON map
// and plain files. Both are handled here.
import { Unzip, UnzipInflate, UnzipPassThrough } from "fflate";
import { decompress as zstdDecompress } from "fzstd";

export const isZstd = (b) => !!b && b.length > 4 && b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd;

function varint(b, i) {
  let r = 0, mul = 1;
  for (;;) {
    if (i >= b.length) throw new Error("truncated");
    const c = b[i++];
    r += (c & 0x7f) * mul;
    if (!(c & 0x80)) return [r, i];
    mul *= 128;
  }
}

/** Minimal protobuf reader: returns [{field, wire, value}] where value is bytes (wire 2) or number (wire 0). */
function readFields(b) {
  const out = [];
  let i = 0;
  while (i < b.length) {
    let tag; [tag, i] = varint(b, i);
    const field = Math.floor(tag / 8), wire = tag % 8;
    if (wire === 0) { let v; [v, i] = varint(b, i); out.push({ field, wire, value: v }); }
    else if (wire === 2) { let n; [n, i] = varint(b, i); out.push({ field, wire, value: b.subarray(i, i + n) }); i += n; }
    else if (wire === 1) i += 8;
    else if (wire === 5) i += 4;
    else throw new Error("unsupported wire type");
  }
  return out;
}

/** Returns an array indexed by the zip entry number: { name, size } (holes are undefined). */
export function parseMediaList(bytes) {
  if (!bytes || !bytes.length) return [];
  let b = bytes;
  if (isZstd(b)) b = zstdDecompress(b);
  // legacy: {"0": "file.mp3", ...}
  if (b[0] === 0x7b) {
    try {
      const j = JSON.parse(new TextDecoder().decode(b));
      const out = [];
      for (const [k, v] of Object.entries(j)) out[Number(k)] = { name: String(v), size: 0 };
      return out;
    } catch { /* fall through to protobuf */ }
  }
  const out = [];
  for (const f of readFields(b)) {
    if (f.field !== 1 || f.wire !== 2) continue;
    let name = "", size = 0;
    for (const g of readFields(f.value)) {
      if (g.field === 1 && g.wire === 2) name = new TextDecoder().decode(g.value);
      else if (g.field === 2 && g.wire === 0) size = g.value;
    }
    out.push({ name, size });
  }
  return out;
}

const MIME = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", mp4: "audio/mp4", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", flac: "audio/flac", webm: "audio/webm" };
export const mimeOf = (name) => MIME[String(name).split(".").pop().toLowerCase()] || "audio/mpeg";

/** [sound:file.mp3] -> "file.mp3" ("" if none). */
export function soundOf(raw) {
  const m = /\[sound:([^\]]+)\]/.exec(String(raw ?? ""));
  return m ? m[1].trim() : "";
}

function concat(chunks) {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * Plan an audio import: which clips do these cards reference, and where are they in the package?
 * decks: [{ content: { id: { x: { wa, sa } } } }], list: parseMediaList result.
 * Returns { files: [{ index, name, size }], bytes }.
 */
export function planAudio(decks, list) {
  const wanted = new Set();
  for (const d of decks) for (const c of Object.values(d.content)) { if (c.x?.wa) wanted.add(c.x.wa); if (c.x?.sa) wanted.add(c.x.sa); }
  const files = [];
  let bytes = 0;
  list.forEach((e, index) => { if (e && wanted.has(e.name)) { files.push({ index, name: e.name, size: e.size || 0 }); bytes += e.size || 0; } });
  return { files, bytes };
}

/**
 * Second pass over the package: decode the wanted clips and hand them to `put(name, bytes, mime)`.
 * Only a few MB are held in memory at a time. Returns { stored, failed }.
 */
export async function extractAudio(file, files, put, onProgress = () => {}) {
  const byIndex = new Map(files.map((f) => [String(f.index), f.name]));
  let stored = 0, failed = 0;
  let pending = [];
  const un = new Unzip();
  un.register(UnzipInflate);
  un.register(UnzipPassThrough);
  un.onfile = (f) => {
    const name = byIndex.get(f.name);
    if (name == null) return;
    const chunks = [];
    f.ondata = (err, chunk, final) => {
      if (err) { failed++; return; }
      chunks.push(chunk);
      if (!final) return;
      pending.push((async () => {
        try {
          let bytes = concat(chunks);
          if (isZstd(bytes)) bytes = zstdDecompress(bytes);
          await put(name, bytes, mimeOf(name));
          stored++;
        } catch { failed++; }
      })());
    };
    f.start();
  };
  const CH = 4 * 1024 * 1024;
  for (let off = 0; off < file.size; off += CH) {
    const buf = new Uint8Array(await file.slice(off, Math.min(file.size, off + CH)).arrayBuffer());
    un.push(buf, off + CH >= file.size);
    await Promise.all(pending);
    pending = [];
    onProgress(Math.min(1, (off + CH) / file.size), stored);
  }
  await Promise.all(pending);
  onProgress(1, stored);
  return { stored, failed };
}
