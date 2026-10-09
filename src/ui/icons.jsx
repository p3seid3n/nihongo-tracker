import React from "react";

// Minimal stroke icon set (24x24, currentColor).
const P = {
  home: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  learn: "M12 4 2.5 9 12 14l9.5-5zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M21.5 9v5",
  cards: "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6M9 13h4",
  stats: "M5 20V11M12 20V4M19 20v-6",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  close: "M6 6l12 12M18 6 6 18",
  volume: "M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  mic: "M12 14.5a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5.5a3 3 0 0 0 3 3zM6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6",
  pen: "M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1zM14 7l3 3",
  stop: "M7 7h10v10H7z",
  play: "M8 5.5v13l10.5-6.5z",
  back: "M15 5l-7 7 7 7",
  chevron: "M9 5l7 7-7 7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  flame: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2.5 1.5 2.5C10 9 10.5 5.5 12 3z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  cloud: "M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-.5 8z",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  book: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11",
  bolt: "M13 3 5 13h6l-1 8 8-10h-6z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12h.01",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  pause: "M9 5v14M15 5v14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  warn: "M12 4 2.5 20h19zM12 10v4M12 17h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  logout: "M10 5H5v14h5M15 8l4 4-4 4M19 12H9",
  refresh: "M20 11a8 8 0 0 0-14.5-3.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14.5 3.5L20 15M20 20v-5h-5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  play: "M7 4.5v15l12-7.5z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  key: "M15 9a4 4 0 1 1-3.9 4.9L4 21v-3h3v-3h3l1.1-1.1A4 4 0 0 1 15 9zM16.5 8.5h.01",
  offline: "M3 3l18 18M8.5 8.5A8 8 0 0 0 5 12M2 9a14 14 0 0 1 5-3M12 20h.01M9 16.5a4.5 4.5 0 0 1 3-1M16.5 12.5A8 8 0 0 0 14 11",
};

export function Icon({ name, size = 24, className, style }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}
