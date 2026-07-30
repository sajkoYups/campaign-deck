export function normalizeUtmValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type UtmParams = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export function applyUtmToUrl(destinationUrl: string, utm: UtmParams): string {
  const url = new URL(destinationUrl);

  const map: Array<[string, string | null | undefined]> = [
    ["utm_source", utm.utmSource],
    ["utm_medium", utm.utmMedium],
    ["utm_campaign", utm.utmCampaign],
    ["utm_content", utm.utmContent],
    ["utm_term", utm.utmTerm],
  ];

  for (const [key, value] of map) {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

export type UtmValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateUtmAgainstAllowlist(
  raw: string,
  allowed: string[],
  fieldLabel: string,
): UtmValidationResult {
  const value = normalizeUtmValue(raw);
  if (!value) {
    return { ok: false, error: `${fieldLabel} is required` };
  }

  if (allowed.length === 0) {
    return { ok: true, value };
  }

  if (!allowed.includes(value)) {
    return {
      ok: false,
      error: `${fieldLabel} must be one of: ${allowed.join(", ")}`,
    };
  }

  return { ok: true, value };
}
