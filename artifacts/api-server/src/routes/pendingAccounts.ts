import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

async function requireAdmin(
  req: Parameters<Parameters<typeof router.use>[0]>[0],
  res: Parameters<Parameters<typeof router.use>[0]>[1],
): Promise<boolean> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const [profile] = await db
    .select({ role: userProfilesTable.role })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));
  if (!profile || profile.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/admin/pending-accounts", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const rows = await db
    .select({
      id: userProfilesTable.id,
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      requestedRole: userProfilesTable.requestedRole,
      createdAt: userProfilesTable.createdAt,
    })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.isPending, true))
    .orderBy(userProfilesTable.createdAt);

  res.json(serializeRows(rows));
});

router.post("/admin/pending-accounts/:clerkUserId/approve", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const { clerkUserId } = req.params as Record<string, string>;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  if (!profile) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const newRole =
    profile.requestedRole === "parent"
      ? "parent"
      : profile.requestedRole === "manager"
        ? "manager"
        : "player";

  const [updated] = await db
    .update(userProfilesTable)
    .set({ isPending: false, role: newRole, requestedRole: null, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning({
      id: userProfilesTable.id,
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      requestedRole: userProfilesTable.requestedRole,
      createdAt: userProfilesTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json(serializeRow(updated));
});

router.post("/admin/pending-accounts/:clerkUserId/reject", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const { clerkUserId } = req.params as Record<string, string>;

  const [updated] = await db
    .update(userProfilesTable)
    .set({ isPending: false, role: "player", requestedRole: null, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning({
      id: userProfilesTable.id,
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      requestedRole: userProfilesTable.requestedRole,
      createdAt: userProfilesTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json(serializeRow(updated));
});

export default router;
