import { setBaseUrl } from "@workspace/api-client-react";

/**
 * Base URL for all API calls.
 *
 * Vercel (split deployment):
 *   VITE_API_BASE_URL is not required — vercel.json proxies /api/* to Railway
 *   so all API calls remain relative to the Vercel origin.
 *
 * Local / Replit (same-origin):
 *   Leave VITE_API_BASE_URL unset. apiBase falls back to Vite's BASE_URL ("/")
 *   so all API calls are relative to the dev server origin.
 *
 * Custom / override:
 *   Set VITE_API_BASE_URL to the full API server URL, e.g.:
 *     https://api-server-production.up.railway.app
 */
export const apiBase: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
  import.meta.env.BASE_URL?.replace(/\/+$/, "") ??
  "";

// Configure the generated React Query hooks to use the same base URL.
// setBaseUrl only prepends to relative paths (starting with /), so it is a
// no-op when VITE_API_BASE_URL is not set and apiBase is "" or "/".
setBaseUrl(
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? null
);
