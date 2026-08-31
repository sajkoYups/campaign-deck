import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { resolveDateRange, sumDailyStats } from "@/lib/analytics/queries";

type Params = { params: Promise<{ id: string }> };

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        client: {
          workspaceId: result.workspace.id,
          ...(result.accessibleClientIds
            ? { id: { in: result.accessibleClientIds } }
            : {}),
        },
      },
      include: {
        client: { select: { name: true } },
        links: {
          orderBy: { createdAt: "asc" },
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

    const rows = await Promise.all(
      campaign.links.map(async (link) => {
        const stats = await sumDailyStats([link.id], range);
        return {
          campaign: campaign.name,
          client: campaign.client.name,
          linkName: link.name,
          slug: link.slug,
          shortUrl: link.shortUrl,
          destinationUrl: link.destinationUrl,
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
          utmContent: link.utmContent,
          utmTerm: link.utmTerm,
          qrPlacement: link.qrPlacement,
          totalClicks: stats.totalClicks,
          uniqueClicks: stats.uniqueClicks,
        };
      }),
    );

    const header = [
      "campaign",
      "client",
      "link_name",
      "slug",
      "short_url",
      "destination_url",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "qr_placement",
      "total_clicks",
      "unique_clicks",
    ];

    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.campaign,
          row.client,
          row.linkName,
          row.slug,
          row.shortUrl,
          row.destinationUrl,
          row.utmSource,
          row.utmMedium,
          row.utmCampaign,
          row.utmContent,
          row.utmTerm,
          row.qrPlacement,
          row.totalClicks,
          row.uniqueClicks,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];

    const filename = `${campaign.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}-analytics.csv`;

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
