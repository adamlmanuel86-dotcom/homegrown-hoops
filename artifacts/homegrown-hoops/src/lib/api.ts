import { setBaseUrl } from "@workspace/api-client-react";

/**
 * Base URL for all API calls.
 *
 * Same-origin deployments (Replit, single Railway service):
 *   Leave VITE_API_BASE_URL unset. apiBase falls back to Vite's BASE_URL ("/")
 *   so all API calls are relative to the frontend origin.
 *
 * Split deployments (separate frontend + API Railway services):
 *   Set VITE_API_BASE_URL to the full API server URL, e.g.:
 *     https://api-server-production.up.railway.app
 *   apiBase will be that origin and all /api/... calls will go there.
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
