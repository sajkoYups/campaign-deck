import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { clientWhereFilter, nestedClientWhere } from "@/lib/client-access";
import {
  resolveDateRange,
  sumDailyStats,
  topCampaignsByClicks,
  topLinksByClicks,
} from "@/lib/analytics/queries";

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const rangeKey = request.nextUrl.searchParams.get("range") ?? "30d";
    const range = resolveDateRange(
      rangeKey,
      request.nextUrl.searchParams.get("from"),
      request.nextUrl.searchParams.get("to"),
    );
    const today = resolveDateRange("today");
    const workspaceId = result.workspace.id;
    const clientScope = nestedClientWhere(
      workspaceId,
      result.accessibleClientIds,
    );

    const [clientCount, campaignCount, links, recentCampaigns] =
      await Promise.all([
        prisma.client.count({
          where: clientWhereFilter(workspaceId, result.accessibleClientIds),
        }),
        prisma.campaign.count({ where: { client: clientScope } }),
        prisma.link.findMany({
          where: { campaign: { client: clientScope } },
          select: { id: true },
        }),
        prisma.campaign.findMany({
          where: { client: clientScope },
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: { client: { select: { name: true } } },
        }),
      ]);

    const linkIds = links.map((l) => l.id);
    const [allTime, todayStats, last30, topCampaigns, topLinks] =
      await Promise.all([
        sumDailyStats(linkIds, {
          from: new Date(0),
          to: new Date(),
        }),
        sumDailyStats(linkIds, today),
        sumDailyStats(linkIds, range),
        topCampaignsByClicks(
          workspaceId,
          range,
          5,
          result.accessibleClientIds,
        ),
        topLinksByClicks(workspaceId, range, 5, result.accessibleClientIds),
      ]);

    return jsonOk({
      counts: {
        clients: clientCount,
        campaigns: campaignCount,
        links: linkIds.length,
        totalClicks: allTime.totalClicks,
        todayClicks: todayStats.totalClicks,
        rangeClicks: last30.totalClicks,
        rangeUniqueClicks: last30.uniqueClicks,
      },
      range: rangeKey,
      recentCampaigns,
      topCampaigns,
      topLinks,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
