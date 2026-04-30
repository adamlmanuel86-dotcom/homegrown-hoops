console.log("[DEBUG] VITE_CLERK_PUBLISHABLE_KEY:", import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "(undefined — not baked into bundle)");

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error("[RENDER ERROR]", msg);
    if (typeof (window as any).__showError === "function") {
      (window as any).__showError("[RENDER ERROR] " + msg);
    }
  }
}
