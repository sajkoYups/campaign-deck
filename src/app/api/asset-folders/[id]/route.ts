import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { getStorage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

async function findOwnedFolder(id: string, workspaceId: string) {
  return prisma.assetFolder.findFirst({
    where: {
      id,
      campaign: { client: { workspaceId } },
    },
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.write");
    if (forbidden) return forbidden;
    const { id } = await params;

    const existing = await findOwnedFolder(id, result.workspace.id);
    if (!existing) return jsonError("Folder not found", 404);

    const body = patchSchema.parse(await request.json());
    if (body.parentId) {
      if (body.parentId === id) return jsonError("Invalid parent", 400);
      const parent = await prisma.assetFolder.findFirst({
        where: { id: body.parentId, campaignId: existing.campaignId },
      });
      if (!parent) return jsonError("Parent folder not found", 404);
    }

    const folder = await prisma.assetFolder.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
      },
    });

    return jsonOk(folder);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.write");
    if (forbidden) return forbidden;
    const { id } = await params;

    const existing = await findOwnedFolder(id, result.workspace.id);
    if (!existing) return jsonError("Folder not found", 404);

    const assets = await prisma.asset.findMany({
      where: { folderId: id },
      select: { id: true, storageKey: true, thumbnailKey: true },
    });
    const storage = getStorage();
    for (const asset of assets) {
      await storage.delete(asset.storageKey);
      if (asset.thumbnailKey) await storage.delete(asset.thumbnailKey);
    }

    await prisma.assetFolder.delete({ where: { id } });
    return jsonOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
