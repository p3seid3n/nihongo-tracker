export function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
/** Deck id embedded as prefix of a card id: "deckId.rest" */
export function deckOf(cardId) {
  const i = cardId.indexOf(".");
  return i < 0 ? cardId : cardId.slice(0, i);
}
