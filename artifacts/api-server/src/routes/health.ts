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
  const raw = (process.env.CLOUDINARY_URL ?? "").trim();
  const hasUrl = !!raw;
  let parsed: { ok: boolean; cloudName?: string; apiKeyPrefix?: string; error?: string } = { ok: false };

  if (hasUrl) {
    const match = raw.match(/^cloudinary:\/\/([^:]+):(.+)@([^@]+)$/);
    if (match) {
      const [, apiKey, apiSecret, cloudName] = match;
      if (apiKey && apiSecret && cloudName) {
        parsed = {
          ok: true,
          cloudName,
          // Show only first 6 chars of key — enough to confirm it's the right one
          apiKeyPrefix: apiKey.substring(0, 6) + "…",
        };
      } else {
        parsed = { ok: false, error: "Regex matched but one or more fields is empty" };
      }
    } else {
      parsed = { ok: false, error: `Regex did not match. URL starts with: ${raw.substring(0, 20)}…` };
    }
  }

  const hasIndividualVars = !!(
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME
  );

  res.json({
    CLOUDINARY_URL_set: hasUrl,
    CLOUDINARY_URL_parse: parsed,
    CLOUDINARY_individual_vars_set: hasIndividualVars,
    willWork: parsed.ok || hasIndividualVars,
    hint: !hasUrl && !hasIndividualVars
      ? "Set CLOUDINARY_URL on Railway and redeploy — or set the three individual vars."
      : !parsed.ok && !hasIndividualVars
      ? "CLOUDINARY_URL is set but does not match cloudinary://key:secret@cloudname — check for extra spaces or wrong format."
      : parsed.ok
      ? "Cloudinary config looks good. If uploads still fail, redeploy Railway to pick up env var changes."
      : "Falling back to individual CLOUDINARY_API_KEY/SECRET/CLOUD_NAME vars.",
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
