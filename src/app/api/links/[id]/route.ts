import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { updateLinkSchema } from "@/lib/validations";
import { buildShortUrl, isSlugTaken } from "@/lib/links/slug";
import { generateQrPng } from "@/lib/links/qr";
import {
  buildDestinationWithUtm,
  normalizeAndValidateUtm,
} from "@/lib/analytics/utm-settings";

type Params = { params: Promise<{ id: string }> };

async function findOwnedLink(
  id: string,
  workspaceId: string,
  accessibleClientIds: string[] | null = null,
) {
  return prisma.link.findFirst({
    where: {
      id,
      campaign: {
        client: {
          workspaceId,
          ...(accessibleClientIds ? { id: { in: accessibleClientIds } } : {}),
        },
      },
    },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const link = await prisma.link.findFirst({
      where: {
        id,
        campaign: {
          client: {
            workspaceId: result.workspace.id,
            ...(result.accessibleClientIds
              ? { id: { in: result.accessibleClientIds } }
              : {}),
          },
        },
      },
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

    if (!link) return jsonError("Link not found", 404);
    return jsonOk(link);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "links.write");
    if (forbidden) return forbidden;
    const { id } = await params;

    const existing = await findOwnedLink(id, result.workspace.id);
    if (!existing) return jsonError("Link not found", 404);

    const body = await request.json();
    const data = updateLinkSchema.parse(body);

    if (data.slug && data.slug !== existing.slug) {
      if (await isSlugTaken(data.slug, id)) {
        return jsonError("Slug already exists", 409);
      }
    }

    const utmInput = {
      utmSource:
        data.utmSource !== undefined ? data.utmSource : existing.utmSource,
      utmMedium:
        data.utmMedium !== undefined ? data.utmMedium : existing.utmMedium,
      utmCampaign:
        data.utmCampaign !== undefined
          ? data.utmCampaign
          : existing.utmCampaign,
      utmContent:
        data.utmContent !== undefined ? data.utmContent : existing.utmContent,
      utmTerm: data.utmTerm !== undefined ? data.utmTerm : existing.utmTerm,
    };

    const utmResult = await normalizeAndValidateUtm(
      result.workspace.id,
      utmInput,
    );
    if (utmResult.error || !utmResult.data) {
      return jsonError(utmResult.error || "Invalid UTM values", 400);
    }
    const utm = utmResult.data;

    const slug = data.slug ?? existing.slug;
    const shortUrl = buildShortUrl(slug);
    const baseDestination = data.destinationUrl ?? existing.destinationUrl;
    // Strip existing utm_* then re-apply from stored fields
    const cleaned = new URL(baseDestination);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ].forEach((key) => cleaned.searchParams.delete(key));
    const destinationUrl = buildDestinationWithUtm(cleaned.toString(), utm);
    const shouldRefreshQr =
      slug !== existing.slug || shortUrl !== existing.shortUrl;

    const link = await prisma.link.update({
      where: { id },
      data: {
        name: data.name,
        destinationUrl,
        slug,
        shortUrl,
        notes: data.notes,
        qrPlacement:
          data.qrPlacement !== undefined
            ? data.qrPlacement ?? null
            : undefined,
        ...utm,
      },
    });

    if (shouldRefreshQr) {
      const qrCodePath = await generateQrPng(link.id, shortUrl);
      const updated = await prisma.link.update({
        where: { id },
        data: { qrCodePath },
      });
      return jsonOk(updated);
    }

    return jsonOk(link);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "links.write");
    if (forbidden) return forbidden;
    const { id } = await params;

    const existing = await findOwnedLink(id, result.workspace.id);
    if (!existing) return jsonError("Link not found", 404);

    await prisma.link.delete({ where: { id } });
    return jsonOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
