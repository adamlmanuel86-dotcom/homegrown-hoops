---
name: Clerk v6 sign-up Safari ITP + finalize() bug
description: Two-layer bug in custom email sign-up that prevents onboarding from being reached, especially in Safari.
---

## The Bug

After email verification in the custom sign-up page, two things go wrong:

### 1. signUp.finalize() does not exist in Clerk v6
`@clerk/types@4.30.0` has no `finalize` method on the SignUp object. Calling it throws `TypeError: signUp.finalize is not a function`, which the catch block converts to "Invalid code." — the session is never activated.

**Fix:** Use `setActive({ session: signUp.createdSessionId })` from `useClerk()`.

```ts
const { setActive } = useClerk();
// after verifyEmailCode succeeds:
if (setActive && signUp.createdSessionId) {
  await setActive({ session: signUp.createdSessionId });
}
```

### 2. window.location.href breaks Safari (ITP)
After `setActive()`, redirecting with `window.location.href = ".../onboarding"` causes a **full page reload**. Safari's ITP blocks Clerk's dev-mode cookies from being re-read on the new load. Result: `isSignedIn` stays `false`, the onboarding page's guard fires, and the user is bounced back to `/sign-in`.

**Fix:** Use wouter's `setLocation` (SPA navigation) instead — keeps Clerk's in-memory session alive, no cookie re-read needed.

```ts
import { useLocation } from "wouter";
const [, setLocation] = useLocation();
// after setActive():
setLocation("/onboarding");
```

**Why:** SPA navigation doesn't reload the page, so the Clerk React context (which already has the session from `setActive()`) remains intact. Safari never needs to re-read any cookies.

**How to apply:** Any post-sign-up navigation in this app should use `setLocation` from wouter, not `window.location.href`, unless a full reload is explicitly required for a non-Clerk reason.
