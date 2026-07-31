import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { getStorage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  { params }: Params,
) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "assets.read");
    if (forbidden) return forbidden;
    const { id } = await params;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        campaign: { client: { workspaceId: result.workspace.id } },
      },
    });
    if (!asset) return jsonError("Asset not found", 404);

    const wantThumb = request.nextUrl.searchParams.get("thumb") === "1";
    const key =
      wantThumb && asset.thumbnailKey ? asset.thumbnailKey : asset.storageKey;
    const buf = await getStorage().get(key);
    if (!buf) return jsonError("File missing", 404);

    const download = request.nextUrl.searchParams.get("download") === "1";
    const contentType =
      wantThumb && asset.thumbnailKey ? "image/jpeg" : asset.mimeType;

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${asset.originalName.replace(/"/g, "")}"`,
            }
          : {}),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
