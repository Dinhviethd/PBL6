import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).optional();
const website = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((s) => /^https?:\/\//i.test(s), "Chỉ chấp nhận URL HTTP hoặc HTTPS.");
const logo = z
  .string()
  .max(2000)
  .refine(
    (s) => /^https?:\/\//i.test(s) || /^\/uploads\/[0-9a-f-]+\.webp$/.test(s),
    "Logo không hợp lệ.",
  );
export const organizerProfilePatch = z
  .object({
    version: z.string().regex(/^[0-9a-f]{64}$/),
    organizationName: optionalText(200),
    contactName: optionalText(150),
    contactEmail: z.string().trim().toLowerCase().email().max(254).optional(),
    contactPhone: optionalText(30),
    headOfficeAddress: optionalText(500),
    description: optionalText(4000),
    websiteOrSocial: website.optional(),
    logoUrl: logo.nullable().optional(),
  })
  .strict();
export const organizerLegalRequest = z
  .object({
    version: z.string().regex(/^[0-9a-f]{64}$/),
    changes: z
      .object({
        businessName: z.string().trim().min(1).max(200).optional(),
        taxIdOrBusinessLicense: z.string().trim().min(1).max(100).optional(),
      })
      .strict()
      .refine(
        (value) => Object.keys(value).length > 0,
        "Cần ít nhất một thay đổi pháp nhân.",
      ),
  })
  .strict();
export const organizerLegalReview = z
  .object({
    approve: z.boolean(),
    reason: z.string().trim().max(2000).default(""),
  })
  .strict();
