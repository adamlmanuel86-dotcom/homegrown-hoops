import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isProtectedAdmin } from "../lib/adminGuard";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/ping", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * No-auth connectivity probe — confirms Vercel proxy → Railway routing works
 * for this path prefix without any authentication in the way.
 */
router.get("/test-upload", (_req, res) => {
  res.json({
    ok: true,
    message: "Railway is reachable via Vercel proxy",
    timestamp: new Date().toISOString(),
    server: "Railway",
  });
});

/**
 * No-auth Cloudinary config probe — shows whether CLOUDINARY_URL parses
 * correctly without exposing the API key or secret.
 */
router.get("/debug/cloudinary", (_req, res) => {
  // ── Parse CLOUDINARY_URL ──────────────────────────────────────────────────
  const raw = (process.env.CLOUDINARY_URL ?? "").trim();
  const hasUrl = !!raw;

  function safeDecode(s: string): string {
    try { return decodeURIComponent(s); } catch { return s; }
  }

  type ParseResult =
    | { ok: true; cloudName: string; apiKeyPrefix: string; apiKeyLength: number; secretLength: number; secretContainsPct: boolean }
    | { ok: false; error: string };

  let urlParse: ParseResult;
  if (!hasUrl) {
    urlParse = { ok: false, error: "CLOUDINARY_URL not set" };
  } else {
    const match = raw.match(/^cloudinary:\/\/([^:]+):(.+)@([^@]+)$/);
    if (!match) {
      urlParse = { ok: false, error: `Format not recognised. Starts with: "${raw.substring(0, 30)}…" — expected cloudinary://KEY:SECRET@CLOUD_NAME` };
    } else {
      const apiKey    = safeDecode(match[1]);
      const apiSecret = safeDecode(match[2]);
      const cloudName = match[3].trim();
      if (!apiKey || !apiSecret || !cloudName) {
        urlParse = { ok: false, error: "Parsed but one or more fields is empty after decoding" };
      } else {
        urlParse = {
          ok: true,
          cloudName,
          // First 6 + last 4 chars of the API key — enough to identify without exposing it
          apiKeyPrefix: `${apiKey.substring(0, 6)}…${apiKey.slice(-4)}`,
          apiKeyLength: apiKey.length,
          // Length + whether original contained %-encoding (signals URL-encoding issue)
          secretLength: apiSecret.length,
          secretContainsPct: match[2].includes("%"),
        };
      }
    }
  }

  // ── Individual vars ───────────────────────────────────────────────────────
  const indivKey     = process.env.CLOUDINARY_API_KEY    ?? "";
  const indivSecret  = process.env.CLOUDINARY_API_SECRET ?? "";
  const indivCloud   = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const hasIndividual = !!(indivKey && indivSecret && indivCloud);

  // Detect potential conflict: both sets present with different cloud names
  const conflict = urlParse.ok && hasIndividual && urlParse.cloudName !== indivCloud
    ? `CLOUDINARY_URL cloud="${urlParse.cloudName}" vs CLOUDINARY_CLOUD_NAME="${indivCloud}" — mismatched!`
    : null;

  // ── Source that will actually be used by each route ───────────────────────
  // profiles.ts (avatar/upload) → CLOUDINARY_URL only, no fallback
  const profilesRouteSource = urlParse.ok ? "CLOUDINARY_URL" : "none (will 500)";
  // cloudinary.ts (signature, profile-signature) → CLOUDINARY_URL first, then individual
  const cloudinaryRouteSource = urlParse.ok ? "CLOUDINARY_URL" : hasIndividual ? "individual vars" : "none (will 500)";

  const hints: string[] = [];
  if (!hasUrl && !hasIndividual)           hints.push("Set CLOUDINARY_URL on Railway and redeploy.");
  if (hasUrl && !urlParse.ok)              hints.push("CLOUDINARY_URL is set but fails to parse — check format: cloudinary://KEY:SECRET@CLOUD_NAME (no quotes, no trailing slash).");
  if (urlParse.ok && (urlParse as { secretContainsPct: boolean }).secretContainsPct)
                                           hints.push("Secret contained %-encoded characters — decoded before use. If signature still fails, verify the secret in Cloudinary console matches what was stored.");
  if (conflict)                            hints.push(conflict);
  if (!urlParse.ok && hasIndividual)       hints.push("Falling back to individual CLOUDINARY_API_KEY/SECRET/CLOUD_NAME vars for signature routes, but avatar/upload will fail (it only reads CLOUDINARY_URL).");
  if (urlParse.ok && !conflict)            hints.push("Config looks good. If you just updated Railway env vars, trigger a redeploy — vars are read at startup, not live.");

  res.json({
    CLOUDINARY_URL: { set: hasUrl, parse: urlParse },
    CLOUDINARY_individual_vars: {
      CLOUDINARY_API_KEY_set:    !!indivKey,
      CLOUDINARY_API_SECRET_set: !!indivSecret,
      CLOUDINARY_CLOUD_NAME:     indivCloud || "(not set)",
      allPresent: hasIndividual,
    },
    routeSources: {
      "POST /api/profiles/:id/avatar/upload": profilesRouteSource,
      "POST /api/cloudinary/signature":       cloudinaryRouteSource,
      "POST /api/cloudinary/profile-signature": cloudinaryRouteSource,
    },
    conflict,
    hints,
  });
});

/**
 * Diagnostic endpoint — helps debug auth and admin detection issues.
 * Safe to expose publicly: only returns data about the caller's own session.
 * No sensitive data is leaked.
 */
router.get("/debug/auth", async (req, res): Promise<void> => {
  try {
    const rawAuth = req.headers.authorization ?? "";
    const clerkSecret = process.env.CLERK_SECRET_KEY ?? "";

    // Capture env diagnostics before any auth check
    const envDiag = {
      CLERK_SECRET_KEY_set: !!clerkSecret,
      // sk_test_ = development instance, sk_live_ = production instance
      CLERK_SECRET_KEY_prefix: clerkSecret ? clerkSecret.substring(0, 12) : "(not set)",
      NODE_ENV: process.env.NODE_ENV ?? "(not set)",
      hasAuthorizationHeader: !!rawAuth,
      // Show "Bearer eyJ…" prefix only — never the full token
      authorizationPrefix: rawAuth
        ? rawAuth.substring(0, Math.min(rawAuth.length, 20)) + "…"
        : "(none)",
    };

    const { userId } = getAuth(req);

    if (!userId) {
      res.json({
        clerkAuth: false,
        clerkUserId: null,
        env: envDiag,
        note: [
          "getAuth() returned no userId.",
          !clerkSecret && "CLERK_SECRET_KEY is NOT set on this server — set it on Railway to match the frontend publishable key.",
          !rawAuth && "No Authorization header received — the frontend is not sending a Bearer token.",
          clerkSecret && rawAuth && "Both header and key are present but Clerk still rejected the token — possible key mismatch (e.g. sk_test_ key with a live frontend).",
        ].filter(Boolean).join(" "),
        profileExists: false,
        profileRole: null,
        isProtectedAdmin: false,
        adminEmailsSet: !!(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL),
        adminClerkIdsSet: !!process.env.ADMIN_CLERK_IDS,
      });
      return;
    }

    const [profile] = await db
      .select({ role: userProfilesTable.role, id: userProfilesTable.id })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.clerkUserId, userId));

    const adminCheck = await isProtectedAdmin(userId);

    res.json({
      clerkAuth: true,
      clerkUserId: userId,
      env: envDiag,
      profileExists: !!profile,
      profileRole: profile?.role ?? null,
      isProtectedAdmin: adminCheck,
      adminEmailsSet: !!(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL),
      adminClerkIdsSet: !!process.env.ADMIN_CLERK_IDS,
      nextStep: !profile
        ? adminCheck
          ? "Profile will be auto-created on next GET /api/profiles/me call"
          : "User needs to complete onboarding, or add their Clerk ID to ADMIN_CLERK_IDS on Railway"
        : profile.role !== "admin"
        ? adminCheck
          ? "Role will be upgraded on next GET /api/profiles/me call"
          : "Profile exists but not admin — add Clerk ID to ADMIN_CLERK_IDS on Railway"
        : "Admin profile exists — should work",
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
