import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { nestedClientWhere } from "@/lib/client-access";

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q) {
      return jsonOk({ clients: [], campaigns: [], links: [], assets: [] });
    }

    const workspaceId = result.workspace.id;
    const clientScope = nestedClientWhere(
      workspaceId,
      result.accessibleClientIds,
    );

    const [clients, campaigns, links, assets] = await Promise.all([
      prisma.client.findMany({
        where: {
          ...clientScope,
          name: { contains: q, mode: "insensitive" },
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
      }),
      prisma.campaign.findMany({
        where: {
          client: clientScope,
          name: { contains: q, mode: "insensitive" },
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          client: { select: { name: true } },
        },
      }),
      prisma.link.findMany({
        where: {
          campaign: { client: clientScope },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { destinationUrl: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { utmSource: { contains: q, mode: "insensitive" } },
            { utmMedium: { contains: q, mode: "insensitive" } },
            { utmCampaign: { contains: q, mode: "insensitive" } },
            { qrPlacement: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          destinationUrl: true,
          shortUrl: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          qrPlacement: true,
        },
      }),
      prisma.asset.findMany({
        where: {
          campaign: { client: clientScope },
          originalName: { contains: q, mode: "insensitive" },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          campaign: { select: { id: true, name: true } },
        },
      }),
    ]);

    return jsonOk({ clients, campaigns, links, assets });
  } catch (error) {
    return handleApiError(error);
  }
}
