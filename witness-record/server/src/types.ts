/**
 * Shared record shapes. These are stored as JSONB and, once a statement is
 * signed, frozen verbatim inside FrozenRecord (whose canonical JSON is hashed).
 */

export type Language = "en" | "es";

export type RelationshipCategory =
  | "friend"
  | "family"
  | "neighbor"
  | "acquaintance"
  | "service_provider"
  | "former_roommate"
  | "visitor"
  | "other";

export interface WitnessProfile {
  legalName: string;
  accountEmail: string | null; // read-only copy of the verified provider email (if provided)
  phone: string | null;
  preferredContact: "email" | "phone" | "text_message" | "no_contact";
  relationshipCategory: RelationshipCategory;
  relationshipOther: string | null;
  relationshipDescription: string;
  howAndWhenMet: string;
  hasPersonalInterest: "yes" | "no" | "unsure";
  personalInterestDescription: string | null;
  willingToBeContacted: "yes" | "no" | "maybe";
}

export interface ApproximateDate {
  precision: "exact" | "approximate" | "month_year" | "range" | "unknown";
  date?: string; // ISO yyyy-mm-dd for exact/approximate
  month?: string; // yyyy-mm for month_year
  rangeStart?: string; // yyyy-mm or yyyy-mm-dd
  rangeEnd?: string;
  note?: string; // free text qualifier
}

export type ObservationCategory =
  | "visited_at_address"
  | "saw_enter_or_leave"
  | "belongings_kept"
  | "overnight_stays"
  | "key_or_access"
  | "mail_or_deliveries"
  | "spoke_with_him_there"
  | "gatherings"
  | "other"
  | "none";

export interface StatementAnswers {
  q1_howKnow: string;
  q2_personalKnowledge: "yes_personal_observation" | "believe_partly_others" | "uncertain" | "no_firsthand";
  q3_firstAware: ApproximateDate;
  q4_mostRecentObservation: ApproximateDate;
  q5_observations: ObservationCategory[];
  q5_observationsOther: string | null;
  q6_circumstances: string;
  q7_frequency: string;
  q8_specificRecollections: string;
  q9_secondhandPortions: string;
  q10_uncertainties: string;
  q11_hasMaterials: "yes" | "no";
  q11_materialsDescription: string | null;
}

export interface ConsentRecord {
  privacyNoticeVersion: string;
  acceptedAt: string; // ISO timestamp (server)
  acceptedText: string;
  disclosureAcknowledged: boolean;
  voluntaryAcknowledged: boolean;
  withdrawalAcknowledged: boolean;
}

export interface AuthSnapshot {
  provider: "google" | "microsoft";
  providerIssuer: string;
  providerSubject: string;
  emailClaim: string | null;
  emailVerified: boolean;
  providerDisplayName: string | null;
  authenticatedAt: string;
  sessionId: string;
  note: string;
}

export interface FrozenMedia {
  mediaAssetId: string;
  kind: "video" | "document";
  sourceType: "live_capture" | "uploaded_file";
  originalFilename: string | null;
  detectedMime: string | null;
  sizeBytes: number;
  sha256: string;
  receivedAtUtc: string;
  description: string | null;
  scanStatus: string;
  recordingConsent: { acceptedAt: string; text: string } | null;
}

export interface FrozenSignature {
  legalName: string;
  method: "drawn" | "typed";
  typedValue: string | null;
  imageSha256: string | null;
  affirmationText: string;
  affirmationDate: { day: string; month: string; year: string };
  declaredAccurate: boolean;
  consentedToEsign: boolean;
  consentStatement: string;
  signedAtUtc: string;
}

export interface FrozenRecord {
  schemaVersion: 1;
  application: "THE WITNESS RECORD";
  evidenceId: string;
  statementId: string;
  rootId: string;
  version: number;
  supersedesEvidenceId: string | null;
  language: Language;
  caseSubject: string;
  caseAddress: string;
  createdAtUtc: string;
  finalizedAtUtc: string;
  consent: ConsentRecord;
  profile: WitnessProfile;
  answers: StatementAnswers;
  media: FrozenMedia[];
  signature: FrozenSignature;
  authentication: AuthSnapshot;
}
