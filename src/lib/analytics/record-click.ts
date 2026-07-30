import { prisma } from "@/lib/db";
import {
  getClientIp,
  getCountryCode,
  hashVisitor,
  isBot,
} from "@/lib/analytics/visitor";
import { normalizeReferrer, parseUserAgent } from "@/lib/analytics/ua";

export type ClickCaptureInput = {
  linkId: string;
  headers: Headers;
};

function utcDateOnly(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function recordClickEvent(input: ClickCaptureInput): Promise<void> {
  const userAgent = input.headers.get("user-agent");
  const bot = isBot(userAgent);
  if (bot) return;

  const ip = getClientIp(input.headers);
  const visitorHash = hashVisitor(ip, userAgent);
  const { device, browser, operatingSystem } = parseUserAgent(userAgent);
  const country = getCountryCode(input.headers, ip);
  const referrer = normalizeReferrer(input.headers.get("referer"));
  const now = new Date();
  const day = utcDateOnly(now);

  await prisma.$transaction(async (tx) => {
    await tx.clickEvent.create({
      data: {
        linkId: input.linkId,
        timestamp: now,
        visitorHash,
        country,
        referrer,
        device,
        browser,
        operatingSystem,
        isBot: false,
      },
    });

    const alreadySeenToday = await tx.clickEvent.findFirst({
      where: {
        linkId: input.linkId,
        visitorHash,
        timestamp: {
          gte: day,
          lt: now,
        },
        isBot: false,
      },
      select: { id: true },
    });

    const uniqueIncrement = alreadySeenToday ? 0 : 1;

    await tx.dailyLinkStatistic.upsert({
      where: {
        linkId_date: {
          linkId: input.linkId,
          date: day,
        },
      },
      create: {
        linkId: input.linkId,
        date: day,
        totalClicks: 1,
        uniqueClicks: 1,
      },
      update: {
        totalClicks: { increment: 1 },
        uniqueClicks: { increment: uniqueIncrement },
      },
    });
  });
}
