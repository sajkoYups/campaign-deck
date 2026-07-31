import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { updateCampaignSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

async function findOwnedCampaign(id: string, workspaceId: string) {
  return prisma.campaign.findFirst({
    where: { id, client: { workspaceId } },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, client: { workspaceId: result.workspace.id } },
      include: {
        client: { select: { id: true, name: true } },
        links: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!campaign) return jsonError("Campaign not found", 404);
    return jsonOk(campaign);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "campaigns.write");
    if (forbidden) return forbidden;
    const { id } = await params;

    const existing = await findOwnedCampaign(id, result.workspace.id);
    if (!existing) return jsonError("Campaign not found", 404);

    const body = await request.json();
    const data = updateCampaignSchema.parse(body);

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        startDate:
          data.startDate === undefined
            ? undefined
            : data.startDate
              ? new Date(data.startDate)
              : null,
        endDate:
          data.endDate === undefined
            ? undefined
            : data.endDate
              ? new Date(data.endDate)
              : null,
      },
    });

    return jsonOk(campaign);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "campaigns.write");
    if (forbidden) return forbidden;
    const { id } = await params;

    const existing = await findOwnedCampaign(id, result.workspace.id);
    if (!existing) return jsonError("Campaign not found", 404);

    await prisma.campaign.delete({ where: { id } });
    return jsonOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
