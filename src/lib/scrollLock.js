// Keeps the page behind a full-screen view or sheet from scrolling (and from being dragged by the browser).
let count = 0;
export function lockScroll() {
  if (typeof document === "undefined") return () => {};
  count++;
  document.documentElement.classList.add("scroll-lock");
  let done = false;
  return () => {
    if (done) return;
    done = true;
    count = Math.max(0, count - 1);
    if (!count) document.documentElement.classList.remove("scroll-lock");
  };
}
