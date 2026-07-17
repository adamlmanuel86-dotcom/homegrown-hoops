import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";
import { parseCloudinaryUrl } from "../lib/cloudinary";

const router: IRouter = Router();

/**
 * Parse Cloudinary credentials from CLOUDINARY_URL (Railway's default single
 * env var, format: cloudinary://key:secret@cloud_name) using a regex so that
 * API secrets containing URL-special characters (+, =, /, @) are handled
 * correctly. Falls back to three individual env vars for local development.
 */
/** Safely percent-decode a string; returns the original if decoding throws. */
function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/**
 * Parse Cloudinary credentials from CLOUDINARY_URL (Railway's default single
 * env var, format: cloudinary://key:secret@cloud_name) using a regex so that
 * API secrets containing URL-special characters (+, =, /, @) are handled
 * correctly. Percent-decodes key+secret in case Railway URL-encoded them.
 * Falls back to three individual env vars for local development.
 */
function parseCloudinaryCredentials(): {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
} | null {
  const url = (process.env.CLOUDINARY_URL ?? "").trim();
  if (url) {
    // (.+)@([^@]+)$ — greedy match up to the LAST @ handles @ inside secret.
    const match = url.match(/^cloudinary:\/\/([^:]+):(.+)@([^@]+)$/);
    if (match) {
      const apiKey    = safeDecode(match[1]);
      const apiSecret = safeDecode(match[2]);
      const cloudName = match[3].trim();
      if (apiKey && apiSecret && cloudName) return { apiKey, apiSecret, cloudName };
    }
  }
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (apiKey && apiSecret && cloudName) return { apiKey, apiSecret, cloudName };
  return null;
}

/**
 * Generate a signed-upload signature for a given folder.
 * The secret never leaves the server — only the signature, key, cloud name,
 * and timestamp are returned to the browser.
 */
function buildSignature(
  apiSecret: string,
  folder: string,
  timestamp: number,
): string {
  const paramStr = `folder=${folder}&timestamp=${timestamp}`;
  return crypto.createHash("sha1").update(paramStr + apiSecret).digest("hex");
}

// Admin-only: signed credentials for game video uploads (browser → Cloudinary directly)
router.post("/cloudinary/signature", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Only admins can upload videos" });
    return;
  }

  const creds = parseCloudinaryCredentials();
  if (!creds) {
    req.log.error(
      { CLOUDINARY_URL_set: !!process.env.CLOUDINARY_URL },
      "cloudinary/signature: not configured — set CLOUDINARY_URL or CLOUDINARY_API_KEY/SECRET/CLOUD_NAME",
    );
    res.status(500).json({ error: "Cloudinary not configured on this server" });
    return;
  }

  const { apiKey, apiSecret, cloudName } = creds;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "homegrown-hoops";
  const signature = buildSignature(apiSecret, folder, timestamp);

  req.log.info({ cloudName, folder }, "cloudinary/signature: issuing signed credentials");
  res.json({ signature, apiKey, cloudName, timestamp, folder });
});

// Signed upload credentials for player self-upload (my-profile.tsx) and admin
// profile photo uploads (profile.tsx).  Both pages upload directly from the
// browser to Cloudinary using this signature — the API secret never leaves
// the server; only the time-limited HMAC signature + public API key are sent.
// Requires the caller to be authenticated (any role).
router.post("/cloudinary/profile-signature", async (req, res): Promise<void> => {
  // Diagnostic logging — visible in Railway logs to confirm auth headers arrive.
  const rawAuth = req.headers.authorization ?? "";
  req.log.info(
    {
      hasAuthorizationHeader: !!rawAuth,
      // Show scheme + first 8 chars of token only — never log the full token
      authorizationPrefix: rawAuth ? rawAuth.substring(0, Math.min(rawAuth.length, 20)) + "…" : "(none)",
      CLERK_SECRET_KEY_set: !!process.env.CLERK_SECRET_KEY,
      CLERK_SECRET_KEY_prefix: process.env.CLERK_SECRET_KEY
        ? process.env.CLERK_SECRET_KEY.substring(0, 12)
        : "(not set)",
    },
    "cloudinary/profile-signature: incoming auth diagnostic",
  );

  const { userId } = getAuth(req);

  req.log.info(
    { clerkUserId: userId ?? "(null — getAuth returned no userId)" },
    "cloudinary/profile-signature: Clerk getAuth result",
  );

  if (!userId) {
    res.status(401).json({
      error: "Unauthorized",
      hint: "getAuth() returned no userId — check Railway logs for auth diagnostic to confirm CLERK_SECRET_KEY is set and matches the frontend publishable key",
    });
    return;
  }

  const creds = parseCloudinaryCredentials();
  if (!creds) {
    req.log.error(
      { CLOUDINARY_URL_set: !!process.env.CLOUDINARY_URL },
      "cloudinary/profile-signature: not configured — set CLOUDINARY_URL or CLOUDINARY_API_KEY/SECRET/CLOUD_NAME",
    );
    res.status(500).json({ error: "Cloudinary not configured on this server" });
    return;
  }

  const { apiKey, apiSecret, cloudName } = creds;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "homegrown-hoops/profiles";
  const signature = buildSignature(apiSecret, folder, timestamp);

  req.log.info({ cloudName, folder }, "cloudinary/profile-signature: issuing signed credentials");
  res.json({ signature, apiKey, cloudName, timestamp, folder });
});

export default router;
