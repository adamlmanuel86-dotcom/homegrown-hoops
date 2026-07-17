/** Parse CLOUDINARY_URL (cloudinary://key:secret@cloud_name) into its components. */
export function parseCloudinaryUrl(): { apiKey: string; apiSecret: string; cloudName: string } | null {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) return null;
  try {
    const parsed = new URL(raw.replace(/^cloudinary:\/\//, "https://"));
    return {
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
      cloudName: parsed.hostname,
    };
  } catch {
    return null;
  }
}
