/**
 * KYB onboarding — Zod schemas for the wizard.
 *
 * Step 1 collects business info per country (NG importer / CN supplier).
 * Step 2 is a placeholder for document uploads (no real storage in hackathon).
 * Step 3 is the live verification panel — no form, triggered by step 2 submit.
 */
import { z } from "zod";

const cacNumberRegex = /^RC-?\d{6,8}$/i; // CAC NG corporate registration
const bvnRegex = /^\d{11}$/;
const cnBizLicenseRegex = /^[A-Z0-9]{15,18}$/i; // simplified — real Chinese business license has check digits

export const BusinessInfoSchema = z
  .object({
    legal_name: z.string().min(2, "Legal name must be at least 2 characters"),
    country: z.enum(["NG", "CN"], {
      message: "Country must be Nigeria (NG) or China (CN)",
    }),
    cac_number: z.string().optional(),
    bvn: z.string().optional(),
    business_license: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.country === "NG") {
      if (!val.cac_number || !cacNumberRegex.test(val.cac_number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cac_number"],
          message: "Format CAC: RC-1234567 (Nigeria)",
        });
      }
      if (!val.bvn || !bvnRegex.test(val.bvn)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bvn"],
          message: "BVN: 11 chiffres",
        });
      }
    }
    if (val.country === "CN") {
      if (!val.business_license || !cnBizLicenseRegex.test(val.business_license)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["business_license"],
          message: "Numéro de licence d'exploitation (15–18 caractères)",
        });
      }
    }
  });

export type BusinessInfo = z.infer<typeof BusinessInfoSchema>;

/** Documents step — purely visual in hackathon (no Supabase Storage wiring). */
export const DocumentsAckSchema = z.object({
  cac_certificate_uploaded: z.boolean(),
  proof_of_address_uploaded: z.boolean(),
});
export type DocumentsAck = z.infer<typeof DocumentsAckSchema>;

/** Providers we run sequentially in the verification panel. */
export const PROVIDERS = ["smile_id", "comply_advantage", "tianyancha"] as const;
export type ProviderId = (typeof PROVIDERS)[number];
