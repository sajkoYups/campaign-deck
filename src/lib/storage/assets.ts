import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

export const ASSET_MAX_BYTES = 100 * 1024 * 1024;

export const ALLOWED_ASSET_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
]);

export function isImageMime(mime: string) {
  return mime.startsWith("image/") && mime !== "image/svg+xml";
}

export function assetStorageKey(
  workspaceId: string,
  campaignId: string,
  filename: string,
) {
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf("."))
    : "";
  return `${workspaceId}/campaigns/${campaignId}/${nanoid()}${ext}`;
}

export function logoStorageKey(workspaceId: string, filename: string) {
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf("."))
    : ".png";
  return `${workspaceId}/logo${ext}`;
}
