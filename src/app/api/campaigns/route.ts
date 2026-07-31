import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { createCampaignSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const clientId = request.nextUrl.searchParams.get("clientId");

    const campaigns = await prisma.campaign.findMany({
      where: {
        client: { workspaceId: result.workspace.id },
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { links: true } },
      },
    });

    return jsonOk(campaigns);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "campaigns.write");
    if (forbidden) return forbidden;

    const body = await request.json();
    const data = createCampaignSchema.parse(body);

    const client = await prisma.client.findFirst({
      where: { id: data.clientId, workspaceId: result.workspace.id },
    });
    if (!client) return jsonError("Client not found", 404);

    const campaign = await prisma.campaign.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        description: data.description,
        status: data.status ?? "DRAFT",
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    return jsonOk(campaign, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
