import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  bigserial,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { WitnessProfile, StatementAnswers, ConsentRecord, AuthSnapshot, FrozenRecord } from "../types.js";

/**
 * Typed mirror of migrations/*.sql. The SQL migrations are the source of truth
 * (they also carry the append-only / immutability triggers that the ORM cannot
 * express). Keep both in sync when changing the schema.
 */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(), // google | microsoft
    providerSubject: text("provider_subject").notNull(),
    providerIssuer: text("provider_issuer").notNull(),
    email: text("email"),
    emailVerified: boolean("email_verified").notNull().default(false),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_provider_subject_idx").on(t.provider, t.providerSubject)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    authProvider: text("auth_provider").notNull(),
    authenticatedAt: timestamp("authenticated_at", { withTimezone: true }).notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    mfaVerifiedAt: timestamp("mfa_verified_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("sessions_token_hash_idx").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const adminMfa = pgTable("admin_mfa", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  secretEncrypted: text("secret_encrypted").notNull(),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedStep: bigint("last_used_step", { mode: "number" }),
});

export const inviteLinks = pgTable(
  "invite_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    label: text("label").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    openCount: integer("open_count").notNull().default(0),
  },
  (t) => [uniqueIndex("invite_links_token_hash_idx").on(t.tokenHash)],
);

export const witnessStatements = pgTable(
  "witness_statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evidenceId: text("evidence_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    rootId: uuid("root_id").notNull(),
    version: integer("version").notNull().default(1),
    supersedesId: uuid("supersedes_id"),
    inviteId: uuid("invite_id"),
    status: text("status").notNull().default("draft"), // draft | signed | abandoned
    language: text("language").notNull().default("en"),
    consent: jsonb("consent").$type<ConsentRecord | null>(),
    profile: jsonb("profile").$type<WitnessProfile | null>(),
    answers: jsonb("answers").$type<StatementAnswers | null>(),
    authSnapshot: jsonb("auth_snapshot").$type<AuthSnapshot | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    frozenRecord: jsonb("frozen_record").$type<FrozenRecord | null>(),
    frozenRecordSha256: text("frozen_record_sha256"),
    pdfStorageKey: text("pdf_storage_key"),
    pdfSha256: text("pdf_sha256"),
    pdfBytes: bigint("pdf_bytes", { mode: "number" }),
    lastError: text("last_error"),
  },
  (t) => [
    uniqueIndex("witness_statements_evidence_id_idx").on(t.evidenceId),
    index("witness_statements_user_idx").on(t.userId),
    index("witness_statements_root_idx").on(t.rootId),
  ],
);

export const signatures = pgTable("signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  statementId: uuid("statement_id")
    .notNull()
    .references(() => witnessStatements.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  sessionId: uuid("session_id").notNull(),
  legalName: text("legal_name").notNull(),
  method: text("method").notNull(), // drawn | typed
  typedValue: text("typed_value"),
  imageStorageKey: text("image_storage_key"),
  imageSha256: text("image_sha256"),
  affirmationText: text("affirmation_text").notNull(),
  affirmationDate: jsonb("affirmation_date").$type<{ day: string; month: string; year: string }>().notNull(),
  declaredAccurate: boolean("declared_accurate").notNull(),
  consentedToEsign: boolean("consented_to_esign").notNull(),
  consentStatement: text("consent_statement").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  recordSha256: text("record_sha256").notNull(),
});

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    statementId: uuid("statement_id")
      .notNull()
      .references(() => witnessStatements.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(), // video | document | signature_image | affirmation_pdf
    sourceType: text("source_type").notNull(), // live_capture | uploaded_file | system_generated
    originalFilename: text("original_filename"),
    declaredMime: text("declared_mime"),
    detectedMime: text("detected_mime"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    sha256: text("sha256"),
    storageKey: text("storage_key").notNull(),
    status: text("status").notNull().default("uploading"), // uploading | complete | rejected | removed_before_signing
    scanStatus: text("scan_status").notNull().default("not_configured"), // not_configured | pending | clean | infected | error
    scanDetail: text("scan_detail"),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    description: text("description"),
    recordingConsent: jsonb("recording_consent").$type<{ acceptedAt: string; text: string } | null>(),
  },
  (t) => [index("media_assets_statement_idx").on(t.statementId)],
);

export const uploadSessions = pgTable("upload_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  mediaAssetId: uuid("media_asset_id")
    .notNull()
    .references(() => mediaAssets.id),
  userId: uuid("user_id").notNull(),
  storageUploadRef: text("storage_upload_ref"),
  declaredBytes: bigint("declared_bytes", { mode: "number" }).notNull(),
  bytesReceived: bigint("bytes_received", { mode: "number" }).notNull().default(0),
  partsReceived: integer("parts_received").notNull().default(0),
  chunkBytes: integer("chunk_bytes").notNull(),
  status: text("status").notNull().default("open"), // open | completed | aborted | failed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorType: text("actor_type").notNull(), // witness | admin | system | anonymous
    actorUserId: uuid("actor_user_id"),
    sessionId: uuid("session_id"),
    statementId: uuid("statement_id"),
    mediaAssetId: uuid("media_asset_id"),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    prevHash: text("prev_hash").notNull(),
    entryHash: text("entry_hash").notNull(),
  },
  (t) => [index("audit_events_statement_idx").on(t.statementId), index("audit_events_actor_idx").on(t.actorUserId)],
);

export const adminAnnotations = pgTable("admin_annotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  statementId: uuid("statement_id")
    .notNull()
    .references(() => witnessStatements.id),
  adminUserId: uuid("admin_user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const privacyRequests = pgTable("privacy_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  statementId: uuid("statement_id"),
  requestType: text("request_type").notNull(), // access | correction | deletion | withdrawal | other
  message: text("message").notNull(),
  status: text("status").notNull().default("received"), // received | in_review | resolved | declined
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNote: text("resolution_note"),
  handledBy: uuid("handled_by"),
});

export const schema = {
  users,
  sessions,
  adminMfa,
  inviteLinks,
  witnessStatements,
  signatures,
  mediaAssets,
  uploadSessions,
  auditEvents,
  adminAnnotations,
  privacyRequests,
};
