export const BOX_DAYS = [0, 1, 3, 7, 16, 35, 75];

export function freshCard(front, back, extra = {}) {
  return {
    id: extra.id || crypto.randomUUID(),
    front, back,
    box: 0, streak: 0, lapses: 0,
    due: Date.now(), lastSeen: null,
    ...extra,
  };
}

export function grade(card, rating) {
  const c = { ...card, lastSeen: Date.now() };
  if (rating === 0) {
    c.lapses += 1;
    c.streak = 0;
    c.box = Math.max(0, c.box - 1);
  } else {
    c.streak += 1;
    c.box = Math.min(BOX_DAYS.length - 1, c.box + (rating === 3 ? 2 : 1));
  }
  const days = BOX_DAYS[c.box] * (rating === 1 ? 0.6 : 1);
  c.due = Date.now() + days * 86400000;
  return c;
}

export function isDue(card) { return card.due <= Date.now(); }

export function mastery(card) {
  const boxPct = (card.box / (BOX_DAYS.length - 1)) * 100;
  const penalty = Math.min(30, card.lapses * 6);
  return Math.max(0, Math.round(boxPct - penalty));
}

export function isMastered(card) { return mastery(card) >= 70; }
export function dueToday(deck) { return deck.filter(isDue).sort((a, b) => a.due - b.due); }

export function buildSession(deck, newCards, maxNew = 10, maxTotal = 30) {
  const due = dueToday(deck);
  const fresh = newCards.filter((c) => !deck.find((d) => d.id === c.id)).slice(0, maxNew);
  return [...due, ...fresh].slice(0, maxTotal);
}
