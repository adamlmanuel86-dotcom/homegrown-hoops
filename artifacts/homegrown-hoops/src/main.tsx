console.log("main.tsx executing");
console.log("[DEBUG] VITE_CLERK_PUBLISHABLE_KEY:", import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "(undefined)");

import { createRoot } from "react-dom/client";
import { Component, type ReactNode, type ErrorInfo } from "react";
import App from "./App";
import "./index.css";

class HardErrorBoundary extends Component<{ label: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    const msg = `[${this.props.label}] ${error.stack ?? error.message}\n\nComponent stack:${info.componentStack}`;
    console.error(msg);
    if (typeof (window as any).__showError === "function") {
      (window as any).__showError(msg);
    }
  }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <div style={{ position: "fixed", inset: 0, background: "#450a0a", color: "#fca5a5", padding: "1.5rem", fontFamily: "monospace", fontSize: "0.8rem", overflowY: "auto", whiteSpace: "pre-wrap", zIndex: 999999 }}>
          <strong style={{ fontSize: "1rem" }}>⛔ Crash in {this.props.label}{"\n\n"}</strong>
          {e.stack ?? e.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.textContent = "React mounting…";
  try {
    createRoot(rootEl).render(
      <HardErrorBoundary label="App">
        <App />
      </HardErrorBoundary>
    );
    console.log("createRoot().render() called successfully");
  } catch (err) {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error("[RENDER ERROR]", msg);
    if (typeof (window as any).__showError === "function") {
      (window as any).__showError("[RENDER ERROR] " + msg);
    }
  }
}
