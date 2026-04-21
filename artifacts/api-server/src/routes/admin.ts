import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";

const router: IRouter = Router();

async function requireAdmin(
  req: Parameters<Parameters<typeof router.use>[0]>[0],
  res: Parameters<Parameters<typeof router.use>[0]>[1]
): Promise<string | null> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return userId;
}

router.get("/admin/users", async (req, res): Promise<void> => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const users = await db
    .select({
      id: userProfilesTable.id,
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      role: userProfilesTable.role,
      isAdmin: userProfilesTable.isAdmin,
      createdAt: userProfilesTable.createdAt,
    })
    .from(userProfilesTable)
    .orderBy(userProfilesTable.createdAt);

  res.json(serializeRows(users));
});

const VALID_ROLES = ["admin", "coach", "player"] as const;
type ValidRole = typeof VALID_ROLES[number];

router.patch("/admin/users/:clerkUserId/role", async (req, res): Promise<void> => {
  const requesterId = await requireAdmin(req, res);
  if (!requesterId) return;

  const { clerkUserId } = req.params;
  const { role } = req.body as { role: unknown };

  if (!role || !VALID_ROLES.includes(role as ValidRole)) {
    res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }

  // The protected admin account's role can never be changed
  const targetIsProtected = await isProtectedAdmin(clerkUserId);
  if (targetIsProtected) {
    res.status(403).json({ error: "The primary admin account role cannot be changed." });
    return;
  }

  const isAdmin = role === "admin";

  const [updated] = await db
    .update(userProfilesTable)
    .set({ role: role as ValidRole, isAdmin, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning({
      id: userProfilesTable.id,
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      role: userProfilesTable.role,
      isAdmin: userProfilesTable.isAdmin,
      createdAt: userProfilesTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(serializeRow(updated));
});

export default router;
