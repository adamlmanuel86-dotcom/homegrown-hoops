import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";

const router: IRouter = Router();

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

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    res.status(500).json({ error: "Cloudinary not configured" });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "homegrown-hoops";

  const paramStr = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramStr + apiSecret)
    .digest("hex");

  res.json({ signature, apiKey, cloudName, timestamp, folder });
});

router.post("/cloudinary/profile-signature", async (_req, res): Promise<void> => {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    res.status(500).json({ error: "Cloudinary not configured" });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "homegrown-hoops/profiles";

  const paramStr = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramStr + apiSecret)
    .digest("hex");

  res.json({ signature, apiKey, cloudName, timestamp, folder });
});

export default router;
