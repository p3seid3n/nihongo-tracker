// Spring physics for gestures. CSS handles the standard transitions (see springs.css);
// this is for motion that starts from where the user's finger let go, with its velocity.

/** Simulate a damped spring (mass 1). Returns sampled values at 60 fps. */
export function simulateSpring({ from = 0, to = 1, velocity = 0, stiffness = 700, damping = 0.8, maxMs = 1400 }) {
  const c = 2 * damping * Math.sqrt(stiffness);
  const dt = 1 / 240;
  let x = from, v = velocity;
  const out = [from];
  let settled = 0;
  const range = Math.max(1, Math.abs(to - from));
  for (let t = 0, i = 0; t < maxMs / 1000; t += dt, i++) {
    const a = -stiffness * (x - to) - c * v;
    v += a * dt;
    x += v * dt;
    if (i % 4 === 3) out.push(x);
    if (Math.abs(x - to) < 0.002 * range && Math.abs(v) < 0.01 * range) { if (++settled > 6) break; } else settled = 0;
  }
  out.push(to);
  return { values: out, duration: Math.round((out.length - 1) * (1000 / 60)) };
}

/** Animate an element with a spring. `build(v)` returns the transform for value v. Resolves when done. */
export function springAnimate(el, { from, to, velocity = 0, stiffness = 700, damping = 0.8, build }) {
  if (!el || !el.animate) { return Promise.resolve(); }
  const reduced = document.documentElement.dataset.motion === "reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced) { el.style.transform = build(to); return Promise.resolve(); }
  const { values, duration } = simulateSpring({ from, to, velocity, stiffness, damping });
  const anim = el.animate(values.map((v) => ({ transform: build(v) })), { duration: Math.max(60, duration), easing: "linear", fill: "forwards" });
  return anim.finished.then(() => { el.style.transform = build(to); anim.cancel(); }).catch(() => {});
}
