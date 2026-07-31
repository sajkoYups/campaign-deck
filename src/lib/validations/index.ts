import { z } from "zod";

export const urlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "URL must start with http:// or https://",
  );

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  website: urlSchema.optional().or(z.literal("")).transform((v) => v || undefined),
  notes: z.string().trim().max(5000).optional().or(z.literal("")).transform((v) => v || undefined),
});

export const updateClientSchema = createClientSchema.partial();

export const campaignStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const createCampaignSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  status: campaignStatusSchema.optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  endDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export const updateCampaignSchema = createCampaignSchema
  .omit({ clientId: true })
  .partial();

const slugPattern = /^[a-z0-9]+(?:[/_-][a-z0-9]+)*$/;

const optionalUtm = z
  .string()
  .trim()
  .max(100)
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined);

const optionalPlacement = z
  .string()
  .trim()
  .max(120)
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined);

export const createLinkSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  destinationUrl: urlSchema,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .regex(slugPattern, "Slug may only contain lowercase letters, numbers, /, -, _")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  notes: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  utmSource: optionalUtm,
  utmMedium: optionalUtm,
  utmCampaign: optionalUtm,
  utmContent: optionalUtm,
  utmTerm: optionalUtm,
  qrPlacement: optionalPlacement,
});

export const updateLinkSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  destinationUrl: urlSchema.optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .regex(slugPattern)
    .optional(),
  notes: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  utmSource: optionalUtm,
  utmMedium: optionalUtm,
  utmCampaign: optionalUtm,
  utmContent: optionalUtm,
  utmTerm: optionalUtm,
  qrPlacement: optionalPlacement,
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid workspace slug")
    .optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export const updateUtmSettingsSchema = z.object({
  allowedSources: z.array(z.string().trim().min(1).max(100)).max(100),
  allowedMediums: z.array(z.string().trim().min(1).max(100)).max(100),
});

export const validateUtmSchema = z.object({
  field: z.enum(["source", "medium", "campaign", "content", "term"]),
  value: z.string().trim().min(1).max(100),
});

export const analyticsRangeSchema = z.object({
  range: z.enum(["today", "7d", "30d", "90d", "custom"]).default("30d"),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
