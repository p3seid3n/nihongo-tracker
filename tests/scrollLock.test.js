import { describe, it, expect, beforeEach, vi } from "vitest";

// no DOM library here: a minimal documentElement is all lockScroll touches
const makeDoc = () => { const set = new Set(); return { documentElement: { classList: { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) } } }; };

describe("lockScroll", () => {
  let lockScroll, html;
  beforeEach(async () => {
    vi.resetModules();
    const doc = makeDoc();
    vi.stubGlobal("document", doc);
    html = doc.documentElement;
    ({ lockScroll } = await import("../src/lib/scrollLock.js"));
  });
  it("is ref-counted: the page stays locked until every owner releases", () => {
    const a = lockScroll();
    const b = lockScroll();
    expect(html.classList.contains("scroll-lock")).toBe(true);
    a();
    expect(html.classList.contains("scroll-lock")).toBe(true);
    b();
    expect(html.classList.contains("scroll-lock")).toBe(false);
  });
  it("releasing twice does not unlock someone else's hold", () => {
    const a = lockScroll();
    const b = lockScroll();
    a(); a();
    expect(html.classList.contains("scroll-lock")).toBe(true);
    b();
    expect(html.classList.contains("scroll-lock")).toBe(false);
  });
});
