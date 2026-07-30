import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { isOnboardingStep } from "@/lib/onboarding-steps";

const bodySchema = z.object({
  action: z.enum(["complete", "skip", "step", "replay"]),
  step: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const body = bodySchema.parse(await request.json());

    if (body.action === "replay") {
      const workspace = await prisma.workspace.update({
        where: { id: result.workspace.id },
        data: {
          onboardingCompletedAt: null,
          onboardingStep: "welcome",
        },
      });
      return jsonOk(workspace);
    }

    if (body.action === "complete" || body.action === "skip") {
      const workspace = await prisma.workspace.update({
        where: { id: result.workspace.id },
        data: {
          onboardingCompletedAt: new Date(),
          onboardingStep: null,
        },
      });
      return jsonOk(workspace);
    }

    if (body.action === "step") {
      if (!body.step || !isOnboardingStep(body.step)) {
        return jsonError("Invalid onboarding step", 400);
      }
      const workspace = await prisma.workspace.update({
        where: { id: result.workspace.id },
        data: { onboardingStep: body.step },
      });
      return jsonOk(workspace);
    }

    return jsonError("Invalid action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const [workspace, firstClient] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: result.workspace.id },
        select: {
          id: true,
          onboardingCompletedAt: true,
          onboardingStep: true,
        },
      }),
      prisma.client.findFirst({
        where: { workspaceId: result.workspace.id },
        orderBy: { createdAt: "asc" },
        include: {
          campaigns: {
            orderBy: { createdAt: "asc" },
            take: 1,
            include: {
              links: {
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    const campaign = firstClient?.campaigns[0] ?? null;
    const link = campaign?.links[0] ?? null;

    return jsonOk({
      workspace,
      progress: {
        client: firstClient
          ? { id: firstClient.id, name: firstClient.name }
          : null,
        campaign: campaign
          ? { id: campaign.id, name: campaign.name, clientId: campaign.clientId }
          : null,
        link: link
          ? {
              id: link.id,
              name: link.name,
              shortUrl: link.shortUrl,
              slug: link.slug,
              campaignId: link.campaignId,
            }
          : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
