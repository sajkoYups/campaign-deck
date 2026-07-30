import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireApiWorkspace } from "@/lib/api-auth";
import { validateUtmSchema } from "@/lib/validations";
import {
  normalizeUtmValue,
  validateUtmAgainstAllowlist,
} from "@/lib/analytics/utm";
import { getOrCreateUtmSettings } from "@/lib/analytics/utm-settings";

export async function POST(request: NextRequest) {
  try {
    const result = await requireApiWorkspace();
    if ("error" in result) return result.error;

    const body = validateUtmSchema.parse(await request.json());
    const settings = await getOrCreateUtmSettings(result.workspace.id);

    if (body.field === "source") {
      const validated = validateUtmAgainstAllowlist(
        body.value,
        settings.allowedSources,
        "Source",
      );
      if (!validated.ok) return jsonError(validated.error, 400);
      return jsonOk({ value: validated.value });
    }

    if (body.field === "medium") {
      const validated = validateUtmAgainstAllowlist(
        body.value,
        settings.allowedMediums,
        "Medium",
      );
      if (!validated.ok) return jsonError(validated.error, 400);
      return jsonOk({ value: validated.value });
    }

    const value = normalizeUtmValue(body.value);
    if (!value) return jsonError("Invalid value", 400);
    return jsonOk({ value });
  } catch (error) {
    return handleApiError(error);
  }
}
