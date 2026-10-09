// Optional fonts for the big characters on cards. "Classic" is the system Mincho (the default and what the app always used).
// "Clear" (Noto Sans JP) and "Textbook" (Klee One) are fetched only when chosen, in small slices, and cached for offline use.
export const KANJI_FONTS = [
  { id: "mincho", label: "Classic", sub: "Elegant, thin strokes" },
  { id: "gothic", label: "Clear", sub: "Even strokes, easy to read" },
  { id: "textbook", label: "Textbook", sub: "Like school handwriting" },
];

const loaded = new Set();
export function ensureFont(id) {
  if (typeof document === "undefined" || id === "mincho" || loaded.has(id)) return;
  if (id !== "gothic" && id !== "textbook") return;
  loaded.add(id);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `/fonts/${id}.css`;
  link.dataset.kfont = id;
  document.head.appendChild(link);
}

export function applyKanjiFont(id) {
  if (typeof document === "undefined") return;
  const ok = KANJI_FONTS.some((f) => f.id === id) ? id : "mincho";
  document.documentElement.dataset.kfont = ok;
  ensureFont(ok);
}
