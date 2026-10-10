// Runs the weight fit off the main thread. Cancel by terminating the worker.
import { optimize } from "./optimize.js";

self.onmessage = async (e) => {
  const { rows, current } = e.data || {};
  try {
    const res = await optimize(rows, current, { onProgress: (p) => self.postMessage({ type: "progress", p }) });
    self.postMessage({ type: "done", res });
  } catch (err) {
    self.postMessage({ type: "error", message: String((err && err.message) || err) });
  }
};
