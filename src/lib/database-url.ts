export function withProductionSsl(url: string): string {
  if (process.env.NODE_ENV !== "production") return url;
  if (/[?&]sslmode=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require`;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set");
    }
    return "";
  }
  return withProductionSsl(url);
}
