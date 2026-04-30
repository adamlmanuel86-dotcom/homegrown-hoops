console.log("main.tsx executing");
console.log("[DEBUG] VITE_CLERK_PUBLISHABLE_KEY:", import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "(undefined — not baked into bundle)");

import { createRoot } from "react-dom/client";
import { Component, type ReactNode, type ErrorInfo } from "react";
import App from "./App";
import "./index.css";

class HardErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ERROR BOUNDARY]", error, info);
    if (typeof (window as any).__showError === "function") {
      (window as any).__showError("[ERROR BOUNDARY] " + error.stack + "\n\nComponent stack:" + info.componentStack);
    }
  }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <div style={{ position: "fixed", inset: 0, background: "#7f1d1d", color: "#fecaca", padding: "2rem", fontFamily: "monospace", fontSize: "0.8rem", overflowY: "auto", whiteSpace: "pre-wrap", zIndex: 999999 }}>
          <strong style={{ fontSize: "1rem", display: "block", marginBottom: "0.5rem" }}>⛔ React render crashed</strong>
          {e.stack ?? e.message}
        </div>
      );
    }
    return this.state.error === null ? this.props.children : null;
  }
}

const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.innerHTML = "React mounting…";
  document.body.style.background = "red";
  try {
    createRoot(rootEl).render(
      <HardErrorBoundary>
        <App />
      </HardErrorBoundary>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error("[RENDER ERROR]", msg);
    if (typeof (window as any).__showError === "function") {
      (window as any).__showError("[RENDER ERROR] " + msg);
    }
  }
}
