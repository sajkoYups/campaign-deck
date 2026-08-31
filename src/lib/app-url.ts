export function getPublicAppUrl(): string {
  const url =
    process.env.APP_URL ||
    process.env.BETTER_AUTH_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}
