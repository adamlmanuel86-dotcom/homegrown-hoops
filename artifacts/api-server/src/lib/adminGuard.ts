import { clerkClient } from "@clerk/express";

/**
 * Returns true if the given Clerk user ID belongs to any of the
 * protected admin email addresses or Clerk user IDs.
 *
 * Check order:
 *  1. ADMIN_CLERK_IDS  — comma-separated Clerk user IDs (fast path, no API call)
 *  2. ADMIN_EMAILS     — comma-separated email addresses (requires Clerk API call)
 *  3. ADMIN_EMAIL      — legacy single-value fallback
 *
 * Protected admins always receive admin privileges regardless of DB
 * role value, and their role can never be demoted via the admin panel.
 */
export async function isProtectedAdmin(clerkUserId: string): Promise<boolean> {
  // ── 1. Fast path: check by Clerk user ID directly ───────────────────────────
  const rawIds = process.env.ADMIN_CLERK_IDS?.trim() ?? "";
  if (rawIds) {
    const adminIds = rawIds.split(",").map((id) => id.trim()).filter(Boolean);
    if (adminIds.includes(clerkUserId)) return true;
  }

  // ── 2. Email-based check (requires Clerk backend API call) ──────────────────
  const raw =
    process.env.ADMIN_EMAILS?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    "";

  if (!raw) return false;

  const adminEmails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) return false;

  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    return user.emailAddresses.some((e) =>
      adminEmails.includes(e.emailAddress.toLowerCase())
    );
  } catch {
    return false;
  }
}
