export function getShortUrlBase(): string {
  const configured = process.env.SHORT_URL_BASE?.replace(/\/$/, "");
  if (configured) return configured;
  const appUrl = (
    process.env.APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${appUrl}/r`;
}

export function buildShortUrl(slug: string): string {
  return `${getShortUrlBase()}/${slug}`;
}

export function slugFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "link"
  );
}
