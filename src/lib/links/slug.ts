import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";

export { buildShortUrl, getShortUrlBase, slugFromName } from "@/lib/links/url";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 5);

export async function ensureUniqueSlug(desired: string): Promise<string> {
  let candidate = desired.replace(/^\/+|\/+$/g, "");
  if (!candidate) candidate = "link";

  for (let attempt = 0; attempt < 20; attempt++) {
    const existing = await prisma.link.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${desired.replace(/^\/+|\/+$/g, "")}-${nanoid()}`;
  }

  return `${desired}-${Date.now()}`;
}

export async function isSlugTaken(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const existing = await prisma.link.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return false;
  if (excludeId && existing.id === excludeId) return false;
  return true;
}
