import { prisma } from "@/lib/db";
import {
  applyUtmToUrl,
  normalizeUtmValue,
  validateUtmAgainstAllowlist,
  type UtmParams,
} from "@/lib/analytics/utm";

export async function getOrCreateUtmSettings(workspaceId: string) {
  return prisma.workspaceUtmSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      allowedSources: [
        "facebook",
        "instagram",
        "google",
        "newsletter",
        "linkedin",
        "tiktok",
      ],
      allowedMediums: [
        "email",
        "paid-social",
        "organic-social",
        "cpc",
        "organic",
        "referral",
        "qr",
        "print",
      ],
    },
    update: {},
  });
}

export type NormalizedUtm = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

export async function normalizeAndValidateUtm(
  workspaceId: string,
  input: UtmParams,
): Promise<{ data?: NormalizedUtm; error?: string }> {
  const settings = await getOrCreateUtmSettings(workspaceId);

  const fields: Array<{
    key: keyof NormalizedUtm;
    raw: string | null | undefined;
    allowlist: string[] | null;
    label: string;
  }> = [
    {
      key: "utmSource",
      raw: input.utmSource,
      allowlist: settings.allowedSources,
      label: "Source",
    },
    {
      key: "utmMedium",
      raw: input.utmMedium,
      allowlist: settings.allowedMediums,
      label: "Medium",
    },
    {
      key: "utmCampaign",
      raw: input.utmCampaign,
      allowlist: null,
      label: "Campaign",
    },
    {
      key: "utmContent",
      raw: input.utmContent,
      allowlist: null,
      label: "Content",
    },
    {
      key: "utmTerm",
      raw: input.utmTerm,
      allowlist: null,
      label: "Term",
    },
  ];

  const result: NormalizedUtm = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
  };

  for (const field of fields) {
    if (!field.raw) continue;
    if (field.allowlist) {
      const validated = validateUtmAgainstAllowlist(
        field.raw,
        field.allowlist,
        field.label,
      );
      if (!validated.ok) return { error: validated.error };
      result[field.key] = validated.value;
    } else {
      const value = normalizeUtmValue(field.raw);
      if (!value) return { error: `${field.label} is invalid` };
      result[field.key] = value;
    }
  }

  return { data: result };
}

export function buildDestinationWithUtm(
  baseUrl: string,
  utm: NormalizedUtm,
): string {
  return applyUtmToUrl(baseUrl, utm);
}
