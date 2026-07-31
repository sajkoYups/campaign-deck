import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q) {
      return jsonOk({ clients: [], campaigns: [], links: [], assets: [] });
    }

    const workspaceId = result.workspace.id;

    const [clients, campaigns, links, assets] = await Promise.all([
      prisma.client.findMany({
        where: {
          workspaceId,
          name: { contains: q, mode: "insensitive" },
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
      }),
      prisma.campaign.findMany({
        where: {
          client: { workspaceId },
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
          campaign: { client: { workspaceId } },
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
          campaign: { client: { workspaceId } },
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
