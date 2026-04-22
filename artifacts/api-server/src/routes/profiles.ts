import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";
import {
  CreateMyProfileBody,
  UpdateMyProfileBody,
  UpdateProfileBody,
  GetMyProfileResponse,
  GetProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profiles", async (_req, res): Promise<void> => {
  const profiles = await db
    .select()
    .from(userProfilesTable)
    .orderBy(userProfilesTable.lastName);
  res.json(serializeRows(profiles));
});

function requireAuth(
  req: Parameters<Parameters<typeof router.use>[0]>[0],
  res: Parameters<Parameters<typeof router.use>[0]>[1]
): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

router.get("/profiles/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  // If no profile exists yet, check if this is a protected admin email.
  // If so, auto-create a stub admin profile so they never get locked out.
  if (!profile) {
    const protected_ = await isProtectedAdmin(userId);
    if (protected_) {
      let firstName = "Admin";
      let lastName = "";
      try {
        const user = await (await import("@clerk/express")).clerkClient.users.getUser(userId);
        firstName = user.firstName ?? "Admin";
        lastName = user.lastName ?? "";
      } catch {
        // keep defaults
      }
      const [created] = await db
        .insert(userProfilesTable)
        .values({ clerkUserId: userId, firstName, lastName, isAdmin: true, role: "admin" })
        .returning();
      res.json(GetMyProfileResponse.parse(serializeRow(created)));
      return;
    }
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Profile exists — ensure protected admin emails are always admin
  if (profile.role !== "admin") {
    const protected_ = await isProtectedAdmin(userId);
    if (protected_) {
      const [upgraded] = await db
        .update(userProfilesTable)
        .set({ role: "admin", isAdmin: true, updatedAt: new Date() })
        .where(eq(userProfilesTable.clerkUserId, userId))
        .returning();
      res.json(GetMyProfileResponse.parse(serializeRow(upgraded)));
      return;
    }
  }

  res.json(GetMyProfileResponse.parse(serializeRow(profile)));
});

router.post("/profiles/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (existing.length > 0) {
    res.status(409).json({ error: "Profile already exists. Use PUT /profiles/me to update." });
    return;
  }

  const protected_ = await isProtectedAdmin(userId);
  const [{ total }] = await db.select({ total: count() }).from(userProfilesTable);
  const isFirstUser = Number(total) === 0;
  const shouldBeAdmin = protected_ || isFirstUser;
  const role = shouldBeAdmin ? "admin" : "player";

  const [profile] = await db
    .insert(userProfilesTable)
    .values({ ...parsed.data, clerkUserId: userId, isAdmin: shouldBeAdmin, role })
    .returning();

  res.status(201).json(GetMyProfileResponse.parse(serializeRow(profile)));
});

router.put("/profiles/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [profile] = await db
    .update(userProfilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, userId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetMyProfileResponse.parse(serializeRow(profile)));
});

router.get("/profiles/:clerkUserId", async (req, res): Promise<void> => {
  const { clerkUserId } = req.params;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetProfileResponse.parse(serializeRow(profile)));
});

// Admin-only: override teamId and verified status for any profile
router.put("/profiles/:clerkUserId", async (req, res): Promise<void> => {
  const requesterId = requireAuth(req, res);
  if (!requesterId) return;

  const [requesterProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, requesterId));

  if (!requesterProfile?.isAdmin) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return;
  }

  const { clerkUserId } = req.params;

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [profile] = await db
    .update(userProfilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetProfileResponse.parse(serializeRow(profile)));
});

// Admin-only: permanently delete a player profile
router.delete("/profiles/:clerkUserId", async (req, res): Promise<void> => {
  const requesterId = requireAuth(req, res);
  if (!requesterId) return;

  const [requesterProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, requesterId));

  if (!requesterProfile?.isAdmin) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return;
  }

  const { clerkUserId } = req.params;

  // Prevent deletion of protected admin accounts — admin role is tied to
  // the Clerk account, not the profile, so deleting it would strip privileges.
  const targetIsProtected = await isProtectedAdmin(clerkUserId);
  if (targetIsProtected) {
    res.status(403).json({ error: "Cannot delete a protected admin account." });
    return;
  }

  // Also prevent any admin from deleting their own profile
  if (clerkUserId === requesterId) {
    res.status(403).json({ error: "Admins cannot delete their own profile." });
    return;
  }

  const [deleted] = await db
    .delete(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.status(204).send();
});

export default router;
