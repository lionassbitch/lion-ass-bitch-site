import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => trimmed(max).min(1);
const longText = (max = 20000) => trimmed(max);

export const approximateDateSchema = z
  .object({
    precision: z.enum(["exact", "approximate", "month_year", "range", "unknown"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    rangeStart: z.string().regex(/^\d{4}(-\d{2}){1,2}$/).optional(),
    rangeEnd: z.string().regex(/^\d{4}(-\d{2}){1,2}$/).optional(),
    note: trimmed(500).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.precision === "exact" || v.precision === "approximate") && !v.date) ctx.addIssue({ code: "custom", message: "date required" });
    if (v.precision === "month_year" && !v.month) ctx.addIssue({ code: "custom", message: "month required" });
    if (v.precision === "range" && (!v.rangeStart || !v.rangeEnd)) ctx.addIssue({ code: "custom", message: "range required" });
    if (v.precision === "range" && v.rangeStart && v.rangeEnd && v.rangeStart > v.rangeEnd)
      ctx.addIssue({ code: "custom", message: "range start must not be after range end" });
  });

export const profileSchema = z.object({
  legalName: requiredText(200),
  phone: trimmed(40).nullable().default(null),
  preferredContact: z.enum(["email", "phone", "text_message", "no_contact"]),
  relationshipCategory: z.enum(["friend", "family", "neighbor", "acquaintance", "service_provider", "former_roommate", "visitor", "other"]),
  relationshipOther: trimmed(200).nullable().default(null),
  relationshipDescription: requiredText(2000),
  howAndWhenMet: requiredText(2000),
  hasPersonalInterest: z.enum(["yes", "no", "unsure"]),
  personalInterestDescription: trimmed(2000).nullable().default(null),
  willingToBeContacted: z.enum(["yes", "no", "maybe"]),
});

export const answersSchema = z
  .object({
    q1_howKnow: requiredText(5000),
    q2_personalKnowledge: z.enum(["yes_personal_observation", "believe_partly_others", "uncertain", "no_firsthand"]),
    q3_firstAware: approximateDateSchema,
    q4_mostRecentObservation: approximateDateSchema,
    q5_observations: z
      .array(
        z.enum([
          "visited_at_address",
          "saw_enter_or_leave",
          "belongings_kept",
          "overnight_stays",
          "key_or_access",
          "mail_or_deliveries",
          "spoke_with_him_there",
          "gatherings",
          "other",
          "none",
        ]),
      )
      .max(10),
    q5_observationsOther: trimmed(2000).nullable().default(null),
    q6_circumstances: requiredText(20000),
    q7_frequency: longText(5000),
    q8_specificRecollections: longText(20000),
    q9_secondhandPortions: longText(10000),
    q10_uncertainties: longText(10000),
    q11_hasMaterials: z.enum(["yes", "no"]),
    q11_materialsDescription: trimmed(5000).nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.q5_observations.includes("none") && v.q5_observations.length > 1)
      ctx.addIssue({ code: "custom", path: ["q5_observations"], message: "'None of the above' cannot be combined with other observations" });
  });

export const consentInputSchema = z.object({
  privacyNoticeVersion: z.string().min(1).max(20),
  disclosureAcknowledged: z.literal(true),
  voluntaryAcknowledged: z.literal(true),
  withdrawalAcknowledged: z.literal(true),
});

export const languageSchema = z.enum(["en", "es"]);

export const signInputSchema = z.object({
  legalName: requiredText(200),
  method: z.enum(["drawn", "typed"]),
  typedValue: trimmed(200).optional(),
  // data:image/png;base64,... produced by the signature canvas
  imageDataUrl: z.string().max(2_000_000).optional(),
  declaredAccurate: z.literal(true),
  consentedToEsign: z.literal(true),
  // Digest of the review payload the witness saw; must match the server's.
  reviewDigest: z.string().length(64),
  affirmationTextSeen: z.string().min(50),
});

export const privacyRequestSchema = z.object({
  statementId: z.string().uuid().nullable().default(null),
  requestType: z.enum(["access", "correction", "deletion", "withdrawal", "other"]),
  message: requiredText(5000),
});
