import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { createLinkSchema } from "@/lib/validations";
import {
  buildShortUrl,
  ensureUniqueSlug,
  isSlugTaken,
  slugFromName,
} from "@/lib/links/slug";
import { generateQrPng } from "@/lib/links/qr";
import {
  buildDestinationWithUtm,
  normalizeAndValidateUtm,
} from "@/lib/analytics/utm-settings";

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const campaignId = request.nextUrl.searchParams.get("campaignId");

    const links = await prisma.link.findMany({
      where: {
        campaign: { client: { workspaceId: result.workspace.id } },
        ...(campaignId ? { campaignId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    return jsonOk(links);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const body = await request.json();
    const data = createLinkSchema.parse(body);

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: data.campaignId,
        client: { workspaceId: result.workspace.id },
      },
    });
    if (!campaign) return jsonError("Campaign not found", 404);

    const utmResult = await normalizeAndValidateUtm(result.workspace.id, data);
    if (utmResult.error || !utmResult.data) {
      return jsonError(utmResult.error || "Invalid UTM values", 400);
    }
    const utm = utmResult.data;

    let slug: string;
    if (data.slug) {
      if (await isSlugTaken(data.slug)) {
        return jsonError("Slug already exists", 409);
      }
      slug = data.slug;
    } else {
      slug = await ensureUniqueSlug(slugFromName(data.name));
    }

    const shortUrl = buildShortUrl(slug);
    const destinationUrl = buildDestinationWithUtm(data.destinationUrl, utm);

    const link = await prisma.link.create({
      data: {
        campaignId: data.campaignId,
        name: data.name,
        destinationUrl,
        slug,
        shortUrl,
        notes: data.notes,
        qrPlacement: data.qrPlacement ?? null,
        ...utm,
      },
    });

    const qrCodePath = await generateQrPng(link.id, shortUrl);
    const updated = await prisma.link.update({
      where: { id: link.id },
      data: { qrCodePath },
    });

    return jsonOk(updated, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
