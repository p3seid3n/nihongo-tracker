// Registers the service worker (production only) and tells the app when a new version took over.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return; // first install: nothing to update
    window.dispatchEvent(new CustomEvent("nt-update-ready"));
  });
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      const check = () => reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
      setInterval(check, 60 * 60 * 1000);
    } catch (e) {
      console.warn("Service worker registration failed", e);
    }
  });
}

export function reloadForUpdate() {
  window.location.reload();
}
