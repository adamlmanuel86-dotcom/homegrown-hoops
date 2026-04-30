import { ClerkProvider, ClerkLoading, ClerkLoaded } from "@clerk/react";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ClerkLoading>
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1e", color: "#fb923c", fontFamily: "monospace", fontSize: "1.2rem" }}>
          Clerk loading…
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1e", color: "#4ade80", fontFamily: "monospace", fontSize: "1.5rem" }}>
          ✅ App loaded — Clerk is working
        </div>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default App;
