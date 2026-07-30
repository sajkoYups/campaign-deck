import { NextRequest } from "next/server";
import { handleApiError, jsonError } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { readQrPng } from "@/lib/links/qr";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const link = await prisma.link.findFirst({
      where: { id, campaign: { client: { workspaceId: result.workspace.id } } },
    });
    if (!link) return jsonError("Link not found", 404);

    const buffer = await readQrPng(link.id, link.shortUrl, link.qrCodePath);
    const download = request.nextUrl.searchParams.get("download") === "1";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${link.slug.replace(/\//g, "-")}-qr.png"`,
            }
          : {}),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
