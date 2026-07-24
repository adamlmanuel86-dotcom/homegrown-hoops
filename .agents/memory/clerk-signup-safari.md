---
name: Clerk v6 sign-up API methods + Safari ITP bug
description: Three-layer bug in custom email sign-up. Wrong API methods (v4/v5 vs v6), wrong finalize() call, and Safari ITP blocking cookie re-read on reload.
---

## Bug 1: Wrong Clerk v6 API methods (SignUpVerificationsResource has NO methods)

`SignUpVerificationsResource` in Clerk v6 is a **data-only** object:
```typescript
interface SignUpVerificationsResource {
  emailAddress: SignUpVerificationResource;
  phoneNumber: SignUpVerificationResource;
  externalAccount: VerificationResource;
  web3Wallet: VerificationResource;
}
```
No callable methods — `sendEmailCode()`, `verifyEmailCode()`, `sendEmailLink()` all throw TypeError.

**Correct Clerk v6 methods (on `SignUpResource` directly):**
```ts
// Send verification code email:
await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

// Verify the code:
await signUp.attemptEmailAddressVerification({ code });

// Magic link:
const { startEmailLinkFlow } = signUp.createEmailLinkFlow();
const result = await startEmailLinkFlow({ redirectUrl: "..." });
```

**Why:** Clerk v4/v5 used a `verifications` namespace with methods. Clerk v6 moved all methods to the top-level `SignUpResource`. The `verifications` property now only holds verification state data.

**How to apply:** Any code calling `signUp.verifications.anything()` is broken in Clerk v6. Use the direct methods on `signUp` instead.

---

## Bug 2: signUp.finalize() does not exist in Clerk v6

`@clerk/types@4.30.0` has no `finalize` method. It throws `TypeError: signUp.finalize is not a function`.

**Fix:** Use `setActive({ session: signUp.createdSessionId })` from `useClerk()`.

```ts
const { setActive } = useClerk();
await setActive({ session: signUp.createdSessionId });
```

---

## Bug 3: window.location.href after setActive breaks Safari (ITP)

After `setActive()`, a `window.location.href` full-page reload causes Safari's ITP to block Clerk's dev-mode cookies from being re-read. Result: `isSignedIn` stays `false`, onboarding guard bounces user to `/sign-in`.

**Fix:** Use wouter's `setLocation` (SPA navigation) — keeps Clerk's in-memory session intact, no cookie re-read needed.

```ts
import { useLocation } from "wouter";
const [, setLocation] = useLocation();
// after setActive():
setLocation("/onboarding");
```

**Why:** SPA navigation doesn't reload the React tree, so Clerk's context (already updated by `setActive()`) remains valid.

**How to apply:** All post-sign-up navigation should use `setLocation` from wouter, not `window.location.href`.
