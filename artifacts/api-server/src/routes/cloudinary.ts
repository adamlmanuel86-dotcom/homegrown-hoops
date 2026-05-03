import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * Parse Cloudinary credentials from CLOUDINARY_URL (Railway's default single
 * env var, format: cloudinary://key:secret@cloud_name) with fallback to the
 * three individual vars for local development.
 */
function parseCloudinaryCredentials(): {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
} | null {
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    try {
      const parsed = new URL(url.replace(/^cloudinary:\/\//, "https://"));
      const apiKey = decodeURIComponent(parsed.username);
      const apiSecret = decodeURIComponent(parsed.password);
      const cloudName = parsed.hostname;
      if (apiKey && apiSecret && cloudName) return { apiKey, apiSecret, cloudName };
    } catch {
      // fall through to individual vars
    }
  }
  const apiKey = process.env.CLOUDINARY_API_KEY;
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
    req.log.error("Cloudinary not configured — set CLOUDINARY_URL or CLOUDINARY_API_KEY/SECRET/CLOUD_NAME");
    res.status(500).json({ error: "Cloudinary not configured on this server" });
    return;
  }

  const { apiKey, apiSecret, cloudName } = creds;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "homegrown-hoops";
  const signature = buildSignature(apiSecret, folder, timestamp);

  res.json({ signature, apiKey, cloudName, timestamp, folder });
});

// Signed upload credentials for player self-upload (my-profile.tsx).
// Used by the "My Profile" page so a signed-in player can upload their own
// photo directly from the browser to Cloudinary.  Admin profile-photo uploads
// go through POST /profiles/:clerkUserId/avatar/upload instead (fully server-side).
// Requires the caller to be authenticated (any role) to prevent unauthenticated
// credential minting.
router.post("/cloudinary/profile-signature", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const creds = parseCloudinaryCredentials();
  if (!creds) {
    req.log.error("Cloudinary not configured — set CLOUDINARY_URL or CLOUDINARY_API_KEY/SECRET/CLOUD_NAME");
    res.status(500).json({ error: "Cloudinary not configured on this server" });
    return;
  }

  const { apiKey, apiSecret, cloudName } = creds;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "homegrown-hoops/profiles";
  const signature = buildSignature(apiSecret, folder, timestamp);

  req.log.info({ cloudName, folder }, "Issuing Cloudinary profile-signature");
  res.json({ signature, apiKey, cloudName, timestamp, folder });
});

export default router;
