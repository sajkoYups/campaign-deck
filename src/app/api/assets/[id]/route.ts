import { NextRequest } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { getStorage } from "@/lib/storage";
import {
  ALLOWED_ASSET_MIME,
  ASSET_MAX_BYTES,
  assetStorageKey,
  isImageMime,
} from "@/lib/storage/assets";

type Params = { params: Promise<{ id: string }> };

async function findOwnedAsset(
  id: string,
  workspaceId: string,
  accessibleClientIds: string[] | null = null,
) {
  return prisma.asset.findFirst({
    where: {
      id,
      campaign: {
        client: {
          workspaceId,
          ...(accessibleClientIds ? { id: { in: accessibleClientIds } } : {}),
        },
      },
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true } },
    },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.read");
    if (forbidden) return forbidden;
    const { id } = await params;
    const asset = await findOwnedAsset(
      id,
      result.workspace.id,
      result.accessibleClientIds,
    );
    if (!asset) return jsonError("Asset not found", 404);
    return jsonOk(asset);
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  originalName: z.string().trim().min(1).max(255).optional(),
  folderId: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.write");
    if (forbidden) return forbidden;
    const { id } = await params;

    const existing = await findOwnedAsset(id, result.workspace.id);
    if (!existing) return jsonError("Asset not found", 404);

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("File required", 400);
      if (!ALLOWED_ASSET_MIME.has(file.type)) {
        return jsonError("File type not allowed", 400);
      }
      if (file.size > ASSET_MAX_BYTES) {
        return jsonError("File exceeds 100MB limit", 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const storage = getStorage();
      await storage.delete(existing.storageKey);
      if (existing.thumbnailKey) await storage.delete(existing.thumbnailKey);

      const storageKey = assetStorageKey(
        result.workspace.id,
        existing.campaignId,
        file.name,
      );
      await storage.put(storageKey, buffer, file.type);

      let thumbnailKey: string | null = null;
      if (isImageMime(file.type)) {
        try {
          const thumb = await sharp(buffer)
            .resize(400, 400, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          thumbnailKey = `${storageKey}.thumb.jpg`;
          await storage.put(thumbnailKey, thumb, "image/jpeg");
        } catch {
          thumbnailKey = null;
        }
      }

      const asset = await prisma.asset.update({
        where: { id },
        data: {
          originalName: file.name,
          storageKey,
          thumbnailKey,
          mimeType: file.type,
          sizeBytes: file.size,
        },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      });
      return jsonOk(asset);
    }

    const body = patchSchema.parse(await request.json());
    if (body.folderId) {
      const folder = await prisma.assetFolder.findFirst({
        where: { id: body.folderId, campaignId: existing.campaignId },
      });
      if (!folder) return jsonError("Folder not found", 404);
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(body.originalName !== undefined
          ? { originalName: body.originalName }
          : {}),
        ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return jsonOk(asset);
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

    const existing = await findOwnedAsset(id, result.workspace.id);
    if (!existing) return jsonError("Asset not found", 404);

    const storage = getStorage();
    await storage.delete(existing.storageKey);
    if (existing.thumbnailKey) await storage.delete(existing.thumbnailKey);
    await prisma.asset.delete({ where: { id } });

    return jsonOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
