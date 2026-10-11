/* The opening animation's conductor. Inlined into index.html by the Vite plugin (after renderer.js), so it starts
 * before the app bundle. __INK_CONSTANTS__ and __INK_FIELD__ are filled in by the plugin.
 *
 * Paper shows at once (plain CSS colour). As soon as the ink texture is decoded, 言 is brushed in and bleeds into the
 * paper, fast and then in slow motion, while a drop of vermilion spreads into the sun. When the app has started and
 * the animation has had its moment, the page floods with the app's background colour and the app appears.
 * The drawing runs in a Web Worker when the browser can (OffscreenCanvas), so a busy page can't make it stutter.
 * A reopen within a minute, reduced motion, or no WebGL: just a quick fade. A tap skips it.
 */
/* eslint-disable */
(function () {
  var K = __INK_CONSTANTS__;
  var FIELD = __INK_FIELD__, FLOOD = __INK_FLOOD__;
  var SLOW = 0.3, KNEE = 0.6;     // ink time: full speed at first, then 30 % (slow motion)
  var MIN_MS = 1200;              // the least time the ink gets before the app may take over (icon: ink time at this moment)
  var EXIT_MS = 600;              // the flood
  var PAPER = [0.925, 0.89, 0.816];
  var sp = document.getElementById("splash");
  if (!sp) return;
  window.__ntSplashActive = true;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var mm = function (q) { return !!(window.matchMedia && matchMedia(q).matches); };
  var theme = get("nt-theme") || "dark";
  var light = theme === "light" || (theme === "system" && mm("(prefers-color-scheme: light)"));
  var BG_HEX = light ? "#fbf7f3" : "#151413";
  var BG = light ? [0.984, 0.969, 0.953] : [0.082, 0.078, 0.075];
  sp.style.setProperty("--sp-bg", BG_HEX);
  var reduced = get("nt-motion") === "reduced" || mm("(prefers-reduced-motion: reduce)");
  var last = Number(get("nt-last")) || 0;
  var calm = reduced || (last && Date.now() - last < 60000);
  var meta = document.querySelector('meta[name="theme-color"]');

  var now = function () { return performance.timeOrigin + performance.now(); };
  var booted = false, readyAt = 0, exiting = false, hidden = false, worker = null, mainLoop = null, exitTimer = 0;

  function stamp() { set("nt-last", String(Date.now())); }
  function finish() {
    if (hidden) return; hidden = true;
    window.__ntSplashActive = false;
    if (meta) meta.setAttribute("content", window.__ntThemeColor || BG_HEX);
    sp.className += " out";
    clearTimeout(exitTimer);
    setTimeout(function () {
      if (worker) { try { worker.postMessage({ type: "stop" }); worker.terminate(); } catch (e) {} }
      if (mainLoop) mainLoop.stop();
      if (sp.parentNode) sp.parentNode.removeChild(sp);
    }, 320);
  }
  function startExit() {
    if (exiting || hidden) return; exiting = true;
    if (!readyAt) return finish(); // the ink never started (slow decode, no WebGL): don't make anyone wait for it
    var at = now();
    if (worker) worker.postMessage({ type: "exit", at: at });
    if (mainLoop) mainLoop.exit(at);
    exitTimer = setTimeout(finish, EXIT_MS + 500); // in case the "done" message never comes
  }
  var waited = false;
  function maybeExit() {
    if (!booted || exiting) return;
    if (!readyAt) {
      // the app was quicker than the ink: give the ink a moment to start, otherwise just open the app
      if (waited) return startExit();
      waited = true;
      return setTimeout(function () { if (!readyAt) startExit(); else maybeExit(); }, 450);
    }
    setTimeout(startExit, Math.max(0, readyAt + MIN_MS - now()));
  }
  window.addEventListener("nt-booted", function () { booted = true; stamp(); maybeExit(); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") stamp(); });
  window.addEventListener("pagehide", stamp);
  sp.addEventListener("pointerdown", function () { if (booted) startExit(); });
  setTimeout(finish, 7000); // never cover the "app didn't start" help

  if (calm) { sp.className = "calm"; return; }
  if (meta) meta.setAttribute("content", "#ece3d0");

  // ---- layout: the picture sits a little above the middle, as large as the screen allows
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(1.4e6 / (w * h)));
    var size = Math.min(w * 0.84, h * 0.5, 400);
    return { w: Math.round(w * dpr), h: Math.round(h * dpr), scale: dpr, box: [w / 2 * dpr, h * 0.44 * dpr, size * dpr] };
  }
  var L = layout();
  var canvas = sp.querySelector("canvas");
  canvas.width = L.w; canvas.height = L.h;
  function onReady(start, mode) { readyAt = start; sp.className = "inked"; sp.setAttribute("data-mode", mode); maybeExit(); }
  function onExited() { finish(); }

  function bitmap(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.blob(); })
      .then(function (b) { return createImageBitmap(b, { premultiplyAlpha: "none", colorSpaceConversion: "none" }); });
  }
  var fieldP = null;
  function fields() { return fieldP || (fieldP = Promise.all([bitmap(FIELD), bitmap(FLOOD)])); }

  function runOnMainThread(cv) {
    var gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;
    fields().then(function (imgs) {
      if (hidden) return;
      var r = window.KotobaInk.create(gl, imgs[0], imgs[1], K), start = now(), exitAt = -1, stopped = false;
      mainLoop = { exit: function (at) { exitAt = at; }, stop: function () { stopped = true; } };
      (function loop() {
        if (stopped) return;
        var t = (now() - start) / 1000, e = exitAt < 0 ? -1 : Math.min(1, (now() - exitAt) / EXIT_MS);
        r.draw({ w: L.w, h: L.h, box: L.box, scale: L.scale, sim: window.KotobaInk.inkTime(t, SLOW, KNEE), time: t, exit: e, paper: PAPER, bg: BG });
        if (e >= 1) return onExited();
        requestAnimationFrame(loop);
      })();
      onReady(start, "page");
    }).catch(function () {});
  }

  var canWorker = canvas.transferControlToOffscreen && window.Worker && window.createImageBitmap && window.Blob && window.URL;
  if (!canWorker) { if (window.createImageBitmap) runOnMainThread(canvas); return; }
  try {
    var src = "(" + kotobaInk.toString() + ")(self);(" + kotobaInkWorker.toString() + ")(self);";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    var off = canvas.transferControlToOffscreen();
    worker.onmessage = function (e) {
      var m = e.data;
      if (m.type === "ready") onReady(m.start, "worker");
      else if (m.type === "exited") onExited();
      else if (m.type === "need-field") fields().then(function (imgs) { if (worker) worker.postMessage({ type: "field", image: imgs[0], flood: imgs[1] }, imgs); }).catch(function () {});
      else if (m.type === "fail") {
        // no WebGL inside workers on this browser: draw on the page instead, on a fresh canvas
        try { worker.terminate(); } catch (x) {}
        worker = null;
        if (readyAt || hidden) return;
        var fresh = document.createElement("canvas");
        fresh.width = L.w; fresh.height = L.h;
        canvas.parentNode.replaceChild(fresh, canvas);
        canvas = fresh;
        runOnMainThread(fresh);
      }
    };
    var abs = function (u) { return new URL(u, location.href).href; };
    worker.postMessage({ type: "init", canvas: off, urls: [abs(FIELD), abs(FLOOD)], w: L.w, h: L.h, box: L.box, scale: L.scale, k: K, slow: SLOW, knee: KNEE, exitMs: EXIT_MS, paper: PAPER, bg: BG }, [off]);
    window.addEventListener("resize", function () {
      if (!worker || hidden) return;
      L = layout();
      worker.postMessage({ type: "resize", w: L.w, h: L.h, box: L.box, scale: L.scale });
    });
  } catch (e) {
    worker = null;
    var fresh2 = document.createElement("canvas");
    fresh2.width = L.w; fresh2.height = L.h;
    canvas.parentNode.replaceChild(fresh2, canvas);
    canvas = fresh2;
    runOnMainThread(fresh2);
  }
})();
