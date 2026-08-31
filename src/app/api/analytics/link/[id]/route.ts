import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import {
  breakdown,
  clicksOverTime,
  lastClickedAt,
  resolveDateRange,
  sumDailyStats,
} from "@/lib/analytics/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const link = await prisma.link.findFirst({
      where: {
        id,
        campaign: {
          client: {
            workspaceId: result.workspace.id,
            ...(result.accessibleClientIds
              ? { id: { in: result.accessibleClientIds } }
              : {}),
          },
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!link) return jsonError("Link not found", 404);

    const rangeKey = request.nextUrl.searchParams.get("range") ?? "30d";
    const range = resolveDateRange(
      rangeKey,
      request.nextUrl.searchParams.get("from"),
      request.nextUrl.searchParams.get("to"),
    );
    const today = resolveDateRange("today");
    const last7 = resolveDateRange("7d");
    const last30 = resolveDateRange("30d");
    const allTime = { from: new Date(0), to: new Date() };

    const linkIds = [link.id];
    const [
      total,
      todayStats,
      weekStats,
      monthStats,
      series,
      lastClick,
      countries,
      referrers,
      devices,
      browsers,
      operatingSystems,
    ] = await Promise.all([
      sumDailyStats(linkIds, allTime),
      sumDailyStats(linkIds, today),
      sumDailyStats(linkIds, last7),
      sumDailyStats(linkIds, last30),
      clicksOverTime(linkIds, range),
      lastClickedAt(linkIds),
      breakdown(linkIds, range, "country"),
      breakdown(linkIds, range, "referrer"),
      breakdown(linkIds, range, "device"),
      breakdown(linkIds, range, "browser"),
      breakdown(linkIds, range, "operatingSystem"),
    ]);

    return jsonOk({
      link: {
        id: link.id,
        name: link.name,
        slug: link.slug,
        shortUrl: link.shortUrl,
        destinationUrl: link.destinationUrl,
        qrPlacement: link.qrPlacement,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
        utmContent: link.utmContent,
        utmTerm: link.utmTerm,
        campaign: link.campaign,
      },
      range: rangeKey,
      totals: {
        totalClicks: total.totalClicks,
        uniqueVisitors: total.uniqueClicks,
        clicksToday: todayStats.totalClicks,
        clicksLast7Days: weekStats.totalClicks,
        clicksLast30Days: monthStats.totalClicks,
        lastClickedAt: lastClick,
      },
      series,
      countries,
      referrers,
      devices,
      browsers,
      operatingSystems,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
