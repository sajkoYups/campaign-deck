import { createHash } from "node:crypto";

const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baidu/i,
  /duckduck/i,
  /facebookexternalhit/i,
  /facebot/i,
  /meta-externalagent/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /slack-imgproxy/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /preview/i,
  /embedly/i,
  /quora link preview/i,
  /pinterest/i,
  /redditbot/i,
  /applebot/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /chatgpt/i,
  /headless/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /libwww/i,
  /httpclient/i,
  /okhttp/i,
];

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length === 0) return true;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function hashVisitor(
  ip: string | null | undefined,
  userAgent: string | null | undefined,
): string {
  const raw = `${ip ?? "unknown"}|${userAgent ?? "unknown"}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("true-client-ip") ||
    null
  );
}

export function getCountryCode(
  headers: Headers,
  ip: string | null,
): string | null {
  const headerCountry =
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country") ||
    headers.get("cloudfront-viewer-country");

  if (headerCountry && headerCountry !== "XX" && headerCountry !== "T1") {
    return headerCountry.toUpperCase();
  }

  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;

  try {
    // Lazy require keeps redirect path light when geo DB is unused
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geoip = require("geoip-lite") as {
      lookup: (ip: string) => { country?: string } | null;
    };
    const result = geoip.lookup(ip);
    return result?.country?.toUpperCase() || null;
  } catch {
    return null;
  }
}
