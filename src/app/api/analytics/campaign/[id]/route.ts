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

    const campaign = await prisma.campaign.findFirst({
      where: { id, client: { workspaceId: result.workspace.id } },
      include: {
        client: { select: { id: true, name: true } },
        links: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortUrl: true,
            destinationUrl: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            qrPlacement: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) return jsonError("Campaign not found", 404);

    const rangeKey = request.nextUrl.searchParams.get("range") ?? "30d";
    const range = resolveDateRange(
      rangeKey,
      request.nextUrl.searchParams.get("from"),
      request.nextUrl.searchParams.get("to"),
    );

    const linkIds = campaign.links.map((l) => l.id);
    const [
      totals,
      series,
      lastClick,
      countries,
      referrers,
      devices,
      linkStats,
    ] = await Promise.all([
      sumDailyStats(linkIds, range),
      clicksOverTime(linkIds, range),
      lastClickedAt(linkIds),
      breakdown(linkIds, range, "country"),
      breakdown(linkIds, range, "referrer"),
      breakdown(linkIds, range, "device"),
      Promise.all(
        campaign.links.map(async (link) => {
          const stats = await sumDailyStats([link.id], range);
          return { ...link, ...stats };
        }),
      ),
    ]);

    const topLink = [...linkStats].sort(
      (a, b) => b.totalClicks - a.totalClicks,
    )[0];

    return jsonOk({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        client: campaign.client,
      },
      range: rangeKey,
      totals,
      lastClickedAt: lastClick,
      topLink: topLink
        ? {
            id: topLink.id,
            name: topLink.name,
            totalClicks: topLink.totalClicks,
          }
        : null,
      series,
      countries,
      referrers,
      devices,
      links: linkStats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
