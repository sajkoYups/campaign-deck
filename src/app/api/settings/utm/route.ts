import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireApiWorkspace, requirePermission } from "@/lib/api-auth";
import { updateUtmSettingsSchema } from "@/lib/validations";
import { normalizeUtmValue } from "@/lib/analytics/utm";
import { getOrCreateUtmSettings } from "@/lib/analytics/utm-settings";

export async function GET() {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const settings = await getOrCreateUtmSettings(result.workspace.id);
    return jsonOk(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;
    const forbidden = requirePermission(result, "workspace.settings");
    if (forbidden) return forbidden;

    const body = updateUtmSettingsSchema.parse(await request.json());
    const allowedSources = [
      ...new Set(body.allowedSources.map(normalizeUtmValue).filter(Boolean)),
    ];
    const allowedMediums = [
      ...new Set(body.allowedMediums.map(normalizeUtmValue).filter(Boolean)),
    ];

    await getOrCreateUtmSettings(result.workspace.id);
    const settings = await prisma.workspaceUtmSettings.update({
      where: { workspaceId: result.workspace.id },
      data: { allowedSources, allowedMediums },
    });

    return jsonOk(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
