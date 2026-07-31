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

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.read");
    if (forbidden) return forbidden;

    const sp = request.nextUrl.searchParams;
    const campaignId = sp.get("campaignId");
    if (!campaignId) return jsonError("campaignId required", 400);

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        client: { workspaceId: result.workspace.id },
      },
      select: { id: true },
    });
    if (!campaign) return jsonError("Campaign not found", 404);

    const folderId = sp.get("folderId");
    const q = sp.get("q")?.trim();
    const type = sp.get("type");
    const uploadedBy = sp.get("uploadedBy");
    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") || 24)));

    const where = {
      campaignId,
      ...(folderId === "root" || folderId === ""
        ? { folderId: null }
        : folderId
          ? { folderId }
          : {}),
      ...(q
        ? { originalName: { contains: q, mode: "insensitive" as const } }
        : {}),
      ...(type === "image"
        ? { mimeType: { startsWith: "image/" } }
        : type === "video"
          ? { mimeType: { startsWith: "video/" } }
          : type === "pdf"
            ? { mimeType: "application/pdf" }
            : type === "zip"
              ? {
                  mimeType: {
                    in: ["application/zip", "application/x-zip-compressed"],
                  },
                }
              : {}),
      ...(uploadedBy ? { uploadedById: uploadedBy } : {}),
    };

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          folder: { select: { id: true, name: true } },
        },
      }),
    ]);

    return jsonOk({
      items: assets,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.write");
    if (forbidden) return forbidden;

    const form = await request.formData();
    const file = form.get("file");
    const campaignId = String(form.get("campaignId") || "");
    const folderIdRaw = form.get("folderId");
    const folderId =
      typeof folderIdRaw === "string" && folderIdRaw.length > 0
        ? folderIdRaw
        : null;

    if (!(file instanceof File)) return jsonError("File required", 400);
    if (!campaignId) return jsonError("campaignId required", 400);
    if (!ALLOWED_ASSET_MIME.has(file.type)) {
      return jsonError("File type not allowed", 400);
    }
    if (file.size > ASSET_MAX_BYTES) {
      return jsonError("File exceeds 100MB limit", 400);
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        client: { workspaceId: result.workspace.id },
      },
    });
    if (!campaign) return jsonError("Campaign not found", 404);

    if (folderId) {
      const folder = await prisma.assetFolder.findFirst({
        where: { id: folderId, campaignId },
      });
      if (!folder) return jsonError("Folder not found", 404);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = assetStorageKey(
      result.workspace.id,
      campaignId,
      file.name,
    );
    const storage = getStorage();
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

    const asset = await prisma.asset.create({
      data: {
        campaignId,
        folderId,
        originalName: file.name,
        storageKey,
        thumbnailKey,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedById: result.session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return jsonOk(asset, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
