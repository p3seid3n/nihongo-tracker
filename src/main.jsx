import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./styles.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./ui/ErrorBoundary.jsx";
import { registerServiceWorker } from "./registerSW.js";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

registerServiceWorker();
