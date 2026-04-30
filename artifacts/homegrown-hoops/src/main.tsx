import { createRoot } from "react-dom/client";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<div style={{ color: "white", padding: "2rem", fontFamily: "monospace", fontSize: "2rem" }}>Hello World</div>);
}
