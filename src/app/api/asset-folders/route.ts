import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { getStorage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.read");
    if (forbidden) return forbidden;

    const campaignId = request.nextUrl.searchParams.get("campaignId");
    if (!campaignId) return jsonError("campaignId required", 400);

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        client: { workspaceId: result.workspace.id },
      },
      select: { id: true },
    });
    if (!campaign) return jsonError("Campaign not found", 404);

    const folders = await prisma.assetFolder.findMany({
      where: { campaignId },
      orderBy: { name: "asc" },
      include: { _count: { select: { assets: true, children: true } } },
    });

    return jsonOk(folders);
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  parentId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.write");
    if (forbidden) return forbidden;

    const body = createSchema.parse(await request.json());
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: body.campaignId,
        client: { workspaceId: result.workspace.id },
      },
    });
    if (!campaign) return jsonError("Campaign not found", 404);

    if (body.parentId) {
      const parent = await prisma.assetFolder.findFirst({
        where: { id: body.parentId, campaignId: body.campaignId },
      });
      if (!parent) return jsonError("Parent folder not found", 404);
    }

    const folder = await prisma.assetFolder.create({
      data: {
        campaignId: body.campaignId,
        name: body.name,
        parentId: body.parentId || null,
      },
    });

    return jsonOk(folder, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
