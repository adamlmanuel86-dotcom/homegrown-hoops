import { ClerkProvider, ClerkLoading, ClerkLoaded } from "@clerk/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

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
        <QueryClientProvider client={queryClient}>
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1e", color: "#4ade80", fontFamily: "monospace", fontSize: "1.5rem" }}>
            ✅ App loaded — QueryClient OK
          </div>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default App;
