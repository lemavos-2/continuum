import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerContinuumSW } from "./lib/pwa-register";
import { applyAppTheme, readCachedAppTheme } from "./lib/app-theme";

// Apply persisted theme synchronously to avoid flash.
if (typeof document !== "undefined") {
  try {
    applyAppTheme(readCachedAppTheme());
  } catch {
    applyAppTheme("CLASSIC");
  }
}

void registerContinuumSW();

createRoot(document.getElementById("root")!).render(<App />);