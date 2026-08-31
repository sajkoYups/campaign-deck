import { prisma } from "@/lib/db";

export type DateRange = {
  from: Date;
  to: Date;
};

export function resolveDateRange(
  range: string | null,
  fromParam?: string | null,
  toParam?: string | null,
): DateRange {
  const now = new Date();
  const to = new Date(now);

  if (range === "custom" && fromParam && toParam) {
    return {
      from: new Date(fromParam),
      to: new Date(toParam),
    };
  }

  const days =
    range === "today"
      ? 0
      : range === "7d"
        ? 7
        : range === "90d"
          ? 90
          : 30;

  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (days > 0) {
    from.setUTCDate(from.getUTCDate() - (days - 1));
  }

  return { from, to };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function sumDailyStats(linkIds: string[], range: DateRange) {
  if (linkIds.length === 0) {
    return { totalClicks: 0, uniqueClicks: 0 };
  }

  const rows = await prisma.dailyLinkStatistic.aggregate({
    where: {
      linkId: { in: linkIds },
      date: {
        gte: startOfUtcDay(range.from),
        lte: startOfUtcDay(range.to),
      },
    },
    _sum: {
      totalClicks: true,
      uniqueClicks: true,
    },
  });

  return {
    totalClicks: rows._sum.totalClicks ?? 0,
    uniqueClicks: rows._sum.uniqueClicks ?? 0,
  };
}

export async function clicksOverTime(linkIds: string[], range: DateRange) {
  if (linkIds.length === 0) return [];

  const rows = await prisma.dailyLinkStatistic.findMany({
    where: {
      linkId: { in: linkIds },
      date: {
        gte: startOfUtcDay(range.from),
        lte: startOfUtcDay(range.to),
      },
    },
    select: {
      date: true,
      totalClicks: true,
      uniqueClicks: true,
    },
    orderBy: { date: "asc" },
  });

  const byDate = new Map<string, { clicks: number; uniques: number }>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const current = byDate.get(key) ?? { clicks: 0, uniques: 0 };
    current.clicks += row.totalClicks;
    current.uniques += row.uniqueClicks;
    byDate.set(key, current);
  }

  return Array.from(byDate.entries()).map(([date, value]) => ({
    date,
    clicks: value.clicks,
    uniqueClicks: value.uniques,
  }));
}

export async function breakdown(
  linkIds: string[],
  range: DateRange,
  field: "country" | "referrer" | "device" | "browser" | "operatingSystem",
  limit = 10,
) {
  if (linkIds.length === 0) return [];

  const rows = await prisma.clickEvent.groupBy({
    by: [field],
    where: {
      linkId: { in: linkIds },
      isBot: false,
      timestamp: { gte: range.from, lte: range.to },
      [field]: { not: null },
    },
    _count: { _all: true },
  });

  return rows
    .filter((row) => row[field])
    .map((row) => ({
      label: String(row[field]),
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function lastClickedAt(linkIds: string[]) {
  if (linkIds.length === 0) return null;
  const row = await prisma.clickEvent.findFirst({
    where: { linkId: { in: linkIds }, isBot: false },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });
  return row?.timestamp ?? null;
}

export async function topLinksByClicks(
  workspaceId: string,
  range: DateRange,
  take = 5,
  accessibleClientIds: string[] | null = null,
) {
  const links = await prisma.link.findMany({
    where: {
      campaign: {
        client: {
          workspaceId,
          ...(accessibleClientIds ? { id: { in: accessibleClientIds } } : {}),
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      shortUrl: true,
      campaign: { select: { id: true, name: true } },
    },
  });

  if (links.length === 0) return [];

  const stats = await prisma.dailyLinkStatistic.groupBy({
    by: ["linkId"],
    where: {
      linkId: { in: links.map((l) => l.id) },
      date: {
        gte: startOfUtcDay(range.from),
        lte: startOfUtcDay(range.to),
      },
    },
    _sum: { totalClicks: true, uniqueClicks: true },
    orderBy: { _sum: { totalClicks: "desc" } },
    take,
  });

  const byId = new Map(links.map((l) => [l.id, l]));
  return stats.map((row) => {
    const link = byId.get(row.linkId)!;
    return {
      id: link.id,
      name: link.name,
      slug: link.slug,
      shortUrl: link.shortUrl,
      campaign: link.campaign,
      totalClicks: row._sum.totalClicks ?? 0,
      uniqueClicks: row._sum.uniqueClicks ?? 0,
    };
  });
}

export async function topCampaignsByClicks(
  workspaceId: string,
  range: DateRange,
  take = 5,
  accessibleClientIds: string[] | null = null,
) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      client: {
        workspaceId,
        ...(accessibleClientIds ? { id: { in: accessibleClientIds } } : {}),
      },
    },
    select: {
      id: true,
      name: true,
      client: { select: { name: true } },
      links: { select: { id: true } },
    },
  });

  const scored = await Promise.all(
    campaigns.map(async (campaign) => {
      const linkIds = campaign.links.map((l) => l.id);
      const totals = await sumDailyStats(linkIds, range);
      return {
        id: campaign.id,
        name: campaign.name,
        clientName: campaign.client.name,
        ...totals,
      };
    }),
  );

  return scored
    .filter((c) => c.totalClicks > 0)
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, take);
}
