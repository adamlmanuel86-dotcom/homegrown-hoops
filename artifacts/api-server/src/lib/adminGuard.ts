import { clerkClient } from "@clerk/express";

/**
 * Returns true if the given Clerk user ID belongs to the hardcoded
 * admin email address (ADMIN_EMAIL env var). This account's role can
 * never be changed and it always receives admin privileges.
 */
export async function isProtectedAdmin(clerkUserId: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail) return false;
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    return user.emailAddresses.some(
      (e) => e.emailAddress.toLowerCase() === adminEmail
    );
  } catch {
    return false;
  }
}
