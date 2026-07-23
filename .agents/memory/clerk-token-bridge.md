---
name: ClerkTokenBridge required for Vercel→Railway auth
description: setAuthTokenGetter via ClerkTokenBridge inside ClerkProvider is required in this split-deploy setup; cookie forwarding alone is not sufficient
---

The app uses a split deployment: Vercel serves the frontend, Railway serves the API. Vercel rewrites `/api/*` to Railway server-side.

**What works:** Cookie forwarding (Vercel does forward Cookie headers to Railway). BUT the Clerk `__session` cookie contains a short-lived JWT valid for only ~1 minute. If it's stale when Railway receives the request, `clerkMiddleware()` returns 401.

**What's required:** `ClerkTokenBridge` — a component placed inside `ClerkProvider` that calls `setAuthTokenGetter(() => getToken())`. This ensures every API request from the generated React Query hooks attaches a fresh `Authorization: Bearer <token>`. `getToken()` auto-refreshes the token if needed.

```tsx
function ClerkTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}
// Place inside <ClerkProvider><QueryClientProvider>
```

**Why:** The Clerk skill says "don't use setAuthTokenGetter on web" — that guidance assumes same-domain API. In the Vercel→Railway cross-service setup, Bearer token auth is the reliable path.

**Server-side:** `clerkMiddleware()` with no arguments is correct on Railway — it validates either Bearer token or cookie, whichever is present.
