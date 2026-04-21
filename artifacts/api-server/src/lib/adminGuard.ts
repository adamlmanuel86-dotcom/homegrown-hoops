import { clerkClient } from "@clerk/express";

/**
 * Returns true if the given Clerk user ID belongs to any of the
 * protected admin email addresses.
 *
 * Reads ADMIN_EMAILS (comma-separated) first, falls back to the
 * legacy ADMIN_EMAIL single-value var. Matching is case-insensitive.
 * Protected admins always receive admin privileges regardless of DB
 * role value, and their role can never be demoted via the admin panel.
 */
export async function isProtectedAdmin(clerkUserId: string): Promise<boolean> {
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
