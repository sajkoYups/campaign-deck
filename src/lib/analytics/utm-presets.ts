import { normalizeUtmValue } from "@/lib/analytics/utm";

/** Recommended mediums for common sources. Used to cascade the medium picker. */
export const SOURCE_MEDIUM_PRESETS: Record<string, string[]> = {
  facebook: ["paid-social", "organic-social"],
  instagram: ["paid-social", "organic-social"],
  tiktok: ["paid-social", "organic-social"],
  linkedin: ["paid-social", "organic-social", "referral"],
  twitter: ["paid-social", "organic-social"],
  x: ["paid-social", "organic-social"],
  youtube: ["paid-social", "organic-social", "referral"],
  google: ["cpc", "organic", "referral"],
  bing: ["cpc", "organic"],
  newsletter: ["email"],
  mailchimp: ["email"],
  klaviyo: ["email"],
  email: ["email"],
  qr: ["qr", "print"],
  print: ["qr", "print"],
  poster: ["qr", "print"],
};

export function suggestedMediumsForSource(
  source: string | null | undefined,
  allowedMediums: string[] = [],
): string[] {
  const normalized = source ? normalizeUtmValue(source) : "";
  const preset = normalized
    ? SOURCE_MEDIUM_PRESETS[normalized] ?? []
    : [];

  if (allowedMediums.length === 0) {
    return preset.length > 0 ? preset : [];
  }

  if (preset.length === 0) {
    return allowedMediums;
  }

  const filtered = allowedMediums.filter((m) => preset.includes(m));
  // If allowlist has none of the preset mediums, fall back to full allowlist
  // so the user is never stuck with an empty dropdown.
  return filtered.length > 0 ? filtered : allowedMediums;
}

export function defaultUtmCampaignFromName(campaignName: string): string {
  return normalizeUtmValue(campaignName);
}
