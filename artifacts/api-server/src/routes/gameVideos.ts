import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import { db, gameVideosTable, userProfilesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

async function getAuthedUser(req: Parameters<Parameters<typeof router.use>[0]>[0]) {
  const { userId } = getAuth(req);
  if (!userId) return null;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));
  return profile ? { userId, profile } : null;
}

router.get("/games/:id/videos", async (req, res): Promise<void> => {
  const gameId = parseInt(req.params.id);
  if (isNaN(gameId)) {
    res.status(400).json({ error: "Invalid game id" });
    return;
  }
  const videos = await db
    .select()
    .from(gameVideosTable)
    .where(eq(gameVideosTable.gameId, gameId));
  res.json(serializeRows(videos));
});

router.post("/games/:id/videos", async (req, res): Promise<void> => {
  const gameId = parseInt(req.params.id);
  if (isNaN(gameId)) {
    res.status(400).json({ error: "Invalid game id" });
    return;
  }

  const authed = await getAuthedUser(req);
  if (!authed) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { userId, profile } = authed;
  const role = profile?.role ?? "player";

  if (!["admin", "coach", "player"].includes(role)) {
    res.status(403).json({ error: "Must have a profile to upload videos" });
    return;
  }

  const { title, objectPath } = req.body as { title?: string; objectPath?: string };
  if (!title?.trim() || !objectPath?.trim()) {
    res.status(400).json({ error: "title and objectPath are required" });
    return;
  }

  let uploaderName = `${profile.firstName} ${profile.lastName}`.trim();
  if (!uploaderName) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      uploaderName = clerkUser.fullName ?? clerkUser.username ?? "Unknown";
    } catch {
      uploaderName = "Unknown";
    }
  }

  const [video] = await db
    .insert(gameVideosTable)
    .values({
      gameId,
      uploaderClerkUserId: userId,
      uploaderName,
      title: title.trim(),
      objectPath: objectPath.trim(),
    })
    .returning();

  res.status(201).json(serializeRow(video));
});

router.delete("/games/:id/videos/:videoId", async (req, res): Promise<void> => {
  const gameId = parseInt(req.params.id);
  const videoId = parseInt(req.params.videoId);
  if (isNaN(gameId) || isNaN(videoId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const authed = await getAuthedUser(req);
  if (!authed) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { userId, profile } = authed;
  const isAdmin = profile?.role === "admin";

  const [video] = await db
    .select()
    .from(gameVideosTable)
    .where(and(eq(gameVideosTable.id, videoId), eq(gameVideosTable.gameId, gameId)));

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  if (!isAdmin && video.uploaderClerkUserId !== userId) {
    res.status(403).json({ error: "You can only delete your own videos" });
    return;
  }

  await db
    .delete(gameVideosTable)
    .where(and(eq(gameVideosTable.id, videoId), eq(gameVideosTable.gameId, gameId)));

  res.status(204).send();
});

export default router;
