import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { AppContext } from "../context.js";
import { HttpError } from "../context.js";
import { mediaAssets, signatures, witnessStatements } from "../db/schema.js";
import { canonicalJson } from "../lib/canonical.js";
import { sha256Hex } from "../lib/crypto.js";
import { newEvidenceId } from "../lib/ids.js";
import { answersSchema, consentInputSchema, profileSchema, signInputSchema } from "../validation.js";
import type { AuthSnapshot, ConsentRecord, FrozenMedia, FrozenRecord, Language, StatementAnswers, WitnessProfile } from "../types.js";
import type { CurrentSession, CurrentUser } from "../auth/session.js";
import { clientIp, clientUserAgent } from "../auth/session.js";
import { PRIVACY_NOTICE_VERSION, dict } from "../i18n/index.js";
import { ACCURACY_DECLARATION, ESIGN_CONSENT_STATEMENT, affirmationDateParts, renderAffirmation, renderAffirmationSpanish, CPLR_2106_SOURCE_URL } from "../statute/cplr2106.js";
import { renderAffirmationPdf } from "./pdf.js";
import type { z } from "zod";

export type StatementRow = typeof witnessStatements.$inferSelect;
export type MediaRow = typeof mediaAssets.$inferSelect;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export class StatementService {
  constructor(private readonly ctx: AppContext) {}

  private meta(req: FastifyRequest) {
    return { ipAddress: clientIp(this.ctx, req), userAgent: clientUserAgent(this.ctx, req) };
  }

  async listForUser(userId: string): Promise<StatementRow[]> {
    return this.ctx.db.select().from(witnessStatements).where(eq(witnessStatements.userId, userId)).orderBy(desc(witnessStatements.createdAt));
  }

  async getOwned(userId: string, statementId: string): Promise<StatementRow> {
    const [row] = await this.ctx.db
      .select()
      .from(witnessStatements)
      .where(and(eq(witnessStatements.id, statementId), eq(witnessStatements.userId, userId)))
      .limit(1);
    if (!row) throw new HttpError(404, "Statement not found.", "not_found");
    return row;
  }

  async getById(statementId: string): Promise<StatementRow> {
    const [row] = await this.ctx.db.select().from(witnessStatements).where(eq(witnessStatements.id, statementId)).limit(1);
    if (!row) throw new HttpError(404, "Statement not found.", "not_found");
    return row;
  }

  async currentDraft(userId: string): Promise<StatementRow | null> {
    const [row] = await this.ctx.db
      .select()
      .from(witnessStatements)
      .where(and(eq(witnessStatements.userId, userId), eq(witnessStatements.status, "draft")))
      .orderBy(desc(witnessStatements.createdAt))
      .limit(1);
    return row ?? null;
  }

  async createDraft(req: FastifyRequest, user: CurrentUser, session: CurrentSession, opts: { language: Language; inviteId: string | null }): Promise<StatementRow> {
    const existing = await this.currentDraft(user.id);
    if (existing) return existing;
    for (let attempt = 0; attempt < 5; attempt++) {
      const evidenceId = newEvidenceId();
      try {
        const row = await this.ctx.db.transaction(async (tx) => {
          const [inserted] = await tx
            .insert(witnessStatements)
            .values({ evidenceId, userId: user.id, rootId: "00000000-0000-0000-0000-000000000000", language: opts.language, inviteId: opts.inviteId })
            .returning();
          const [fixed] = await tx.update(witnessStatements).set({ rootId: inserted.id }).where(eq(witnessStatements.id, inserted.id)).returning();
          await this.ctx.audit.record(
            { actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: fixed.id, action: "statement.draft_created", detail: { evidenceId, language: opts.language }, ...this.meta(req) },
            tx as unknown as AppContext["db"],
          );
          return fixed;
        });
        return row;
      } catch (err) {
        if (String((err as Error).message).includes("witness_statements_evidence_id_idx") && attempt < 4) continue;
        throw err;
      }
    }
    throw new HttpError(500, "Could not allocate an evidence ID.");
  }

  private assertDraft(st: StatementRow) {
    if (st.status !== "draft") throw new HttpError(409, "This statement is finalized and cannot be changed. Create a correction instead.", "finalized");
  }

  async setLanguage(req: FastifyRequest, st: StatementRow, user: CurrentUser, session: CurrentSession, language: Language): Promise<StatementRow> {
    this.assertDraft(st);
    const [row] = await this.ctx.db.update(witnessStatements).set({ language }).where(eq(witnessStatements.id, st.id)).returning();
    await this.ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "statement.language_changed", detail: { language }, ...this.meta(req) });
    return row;
  }

  async recordConsent(req: FastifyRequest, st: StatementRow, user: CurrentUser, session: CurrentSession, input: unknown): Promise<StatementRow> {
    this.assertDraft(st);
    const parsed = consentInputSchema.parse(input);
    if (parsed.privacyNoticeVersion !== PRIVACY_NOTICE_VERSION) throw new HttpError(409, "The privacy notice has been updated; please read it again.", "notice_outdated");
    const t = dict(st.language);
    const consent: ConsentRecord = {
      privacyNoticeVersion: parsed.privacyNoticeVersion,
      acceptedAt: new Date().toISOString(),
      acceptedText: [t.consent.ack1, t.consent.ack2, t.consent.ack3].join("\n"),
      disclosureAcknowledged: true,
      voluntaryAcknowledged: true,
      withdrawalAcknowledged: true,
    };
    const [row] = await this.ctx.db.update(witnessStatements).set({ consent }).where(eq(witnessStatements.id, st.id)).returning();
    await this.ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "statement.consent_recorded", detail: { privacyNoticeVersion: consent.privacyNoticeVersion }, ...this.meta(req) });
    return row;
  }

  async saveProfile(req: FastifyRequest, st: StatementRow, user: CurrentUser, session: CurrentSession, input: unknown): Promise<StatementRow> {
    this.assertDraft(st);
    const parsed = profileSchema.parse(input);
    const profile: WitnessProfile = { ...parsed, accountEmail: user.email };
    const [row] = await this.ctx.db.update(witnessStatements).set({ profile }).where(eq(witnessStatements.id, st.id)).returning();
    await this.ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "statement.profile_saved", detail: {}, ...this.meta(req) });
    return row;
  }

  async saveAnswers(req: FastifyRequest, st: StatementRow, user: CurrentUser, session: CurrentSession, input: unknown): Promise<StatementRow> {
    this.assertDraft(st);
    const answers = answersSchema.parse(input) as StatementAnswers;
    const [row] = await this.ctx.db.update(witnessStatements).set({ answers }).where(eq(witnessStatements.id, st.id)).returning();
    await this.ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "statement.answers_saved", detail: {}, ...this.meta(req) });
    return row;
  }

  async mediaFor(statementId: string, statuses: string[] = ["complete"]): Promise<MediaRow[]> {
    return this.ctx.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.statementId, statementId), inArray(mediaAssets.status, statuses)))
      .orderBy(mediaAssets.createdAt);
  }

  static frozenMedia(m: MediaRow): FrozenMedia {
    return {
      mediaAssetId: m.id,
      kind: m.kind as "video" | "document",
      sourceType: m.sourceType as "live_capture" | "uploaded_file",
      originalFilename: m.originalFilename,
      detectedMime: m.detectedMime,
      sizeBytes: m.sizeBytes ?? 0,
      sha256: m.sha256 ?? "",
      receivedAtUtc: (m.receivedAt ?? m.createdAt).toISOString(),
      description: m.description,
      scanStatus: m.scanStatus,
      recordingConsent: m.recordingConsent,
    };
  }

  /** Digest of exactly what the witness reviews; signing must present the same digest. */
  reviewDigest(st: StatementRow, media: MediaRow[]): string {
    return sha256Hex(
      canonicalJson({
        statementId: st.id,
        language: st.language,
        consent: st.consent,
        profile: st.profile,
        answers: st.answers,
        media: media.filter((m) => m.kind === "video" || m.kind === "document").map((m) => ({ id: m.id, sha256: m.sha256, description: m.description })),
      }),
    );
  }

  authSnapshot(user: CurrentUser, session: CurrentSession): AuthSnapshot {
    return {
      provider: user.provider,
      providerIssuer: user.providerIssuer,
      providerSubject: user.providerSubject,
      emailClaim: user.email,
      emailVerified: user.emailVerified,
      providerDisplayName: user.displayName,
      authenticatedAt: session.authenticatedAt.toISOString(),
      sessionId: session.id,
      note: "Account sign-in via OpenID Connect. Not government ID verification, not proof of physical presence, not verification of truthfulness. No tokens stored.",
    };
  }

  async buildReview(st: StatementRow, user: CurrentUser, session: CurrentSession) {
    const media = await this.mediaFor(st.id);
    const parts = affirmationDateParts(new Date());
    const complete = Boolean(st.consent && st.profile && st.answers);
    const problems: string[] = [];
    if (!st.consent) problems.push("consent");
    if (!st.profile) problems.push("profile");
    if (!st.answers) problems.push("answers");
    return {
      statement: publicStatement(st),
      media: media.filter((m) => m.kind === "video" || m.kind === "document").map(publicMedia),
      authentication: this.authSnapshot(user, session),
      affirmation: {
        text: renderAffirmation(parts),
        spanishCourtesy: renderAffirmationSpanish(parts),
        dateParts: parts,
        sourceUrl: CPLR_2106_SOURCE_URL,
        esignConsent: ESIGN_CONSENT_STATEMENT,
        accuracyDeclaration: ACCURACY_DECLARATION,
      },
      reviewDigest: this.reviewDigest(st, media),
      complete,
      problems,
    };
  }

  async sign(req: FastifyRequest, st: StatementRow, user: CurrentUser, session: CurrentSession, rawInput: unknown) {
    this.assertDraft(st);
    const input = signInputSchema.parse(rawInput) as z.infer<typeof signInputSchema>;
    if (!st.consent || !st.profile || !st.answers) throw new HttpError(409, "The statement is incomplete.", "incomplete");
    profileSchema.parse(st.profile);
    answersSchema.parse(st.answers);
    const media = await this.mediaFor(st.id);
    if (media.some((m) => m.scanStatus === "infected")) throw new HttpError(409, "An attached file failed malware screening and must be removed first.", "infected_media");
    const currentDigest = this.reviewDigest(st, media);
    if (currentDigest !== input.reviewDigest) throw new HttpError(409, "The statement changed since it was reviewed.", "review_mismatch");

    // The affirmation the witness saw must be the statutory form dated today
    // (or yesterday, to tolerate a UTC midnight rollover during review).
    const now = new Date();
    const todayParts = affirmationDateParts(now);
    const yesterdayParts = affirmationDateParts(new Date(now.getTime() - 86_400_000));
    let dateParts = todayParts;
    if (input.affirmationTextSeen === renderAffirmation(todayParts)) dateParts = todayParts;
    else if (input.affirmationTextSeen === renderAffirmation(yesterdayParts)) dateParts = yesterdayParts;
    else throw new HttpError(409, "The affirmation text does not match the statutory form for the current date.", "affirmation_mismatch");
    const affirmationText = renderAffirmation(dateParts);

    let signatureImage: Buffer | null = null;
    let typedValue: string | null = null;
    if (input.method === "drawn") {
      if (!input.imageDataUrl?.startsWith("data:image/png;base64,")) throw new HttpError(400, "A drawn signature image is required.", "signature_required");
      signatureImage = Buffer.from(input.imageDataUrl.slice("data:image/png;base64,".length), "base64");
      if (signatureImage.length < 100 || signatureImage.length > 1_500_000 || !signatureImage.subarray(0, 8).equals(PNG_MAGIC))
        throw new HttpError(400, "The signature image is invalid.", "signature_invalid");
    } else {
      typedValue = (input.typedValue ?? "").trim();
      if (!typedValue) throw new HttpError(400, "Type your name to sign.", "signature_required");
      if (typedValue.toLowerCase() !== input.legalName.trim().toLowerCase()) throw new HttpError(400, "The typed signature must match your full legal name.", "signature_mismatch");
    }
    if (input.legalName.trim() !== st.profile.legalName.trim()) throw new HttpError(400, "The legal name on the signature must match the name in your profile.", "name_mismatch");

    const signedAt = new Date();
    const signatureKey = `statements/${st.id}/signature.png`;
    let imageSha256: string | null = null;
    if (signatureImage) {
      imageSha256 = sha256Hex(signatureImage);
      await this.ctx.storage.putObject(signatureKey, signatureImage, "image/png");
    }

    let supersedesEvidenceId: string | null = null;
    if (st.supersedesId) {
      const prev = await this.getById(st.supersedesId);
      supersedesEvidenceId = prev.evidenceId;
    }
    const authentication = this.authSnapshot(user, session);
    const record: FrozenRecord = {
      schemaVersion: 1,
      application: "THE WITNESS RECORD",
      evidenceId: st.evidenceId,
      statementId: st.id,
      rootId: st.rootId,
      version: st.version,
      supersedesEvidenceId,
      language: st.language as Language,
      caseSubject: this.ctx.cfg.env.CASE_SUBJECT_NAME,
      caseAddress: this.ctx.cfg.env.CASE_ADDRESS,
      createdAtUtc: st.createdAt.toISOString(),
      finalizedAtUtc: signedAt.toISOString(),
      consent: st.consent,
      profile: st.profile,
      answers: st.answers,
      media: media.filter((m) => m.kind === "video" || m.kind === "document").map(StatementService.frozenMedia),
      signature: {
        legalName: input.legalName.trim(),
        method: input.method,
        typedValue,
        imageSha256,
        affirmationText,
        affirmationDate: dateParts,
        declaredAccurate: true,
        consentedToEsign: true,
        consentStatement: ESIGN_CONSENT_STATEMENT,
        signedAtUtc: signedAt.toISOString(),
      },
      authentication,
    };
    const recordJson = canonicalJson(record);
    const recordSha256 = sha256Hex(recordJson);

    const pdf = await renderAffirmationPdf({ record, recordSha256, signatureImage, generatedAt: signedAt });
    const pdfSha256 = sha256Hex(pdf);
    const pdfKey = `statements/${st.id}/affirmation-${st.evidenceId}.pdf`;
    await this.ctx.storage.putObject(pdfKey, pdf, "application/pdf");

    const meta = this.meta(req);
    await this.ctx.db.transaction(async (tx) => {
      const txDb = tx as unknown as AppContext["db"];
      await tx.insert(signatures).values({
        statementId: st.id,
        userId: user.id,
        sessionId: session.id,
        legalName: record.signature.legalName,
        method: input.method,
        typedValue,
        imageStorageKey: signatureImage ? signatureKey : null,
        imageSha256,
        affirmationText,
        affirmationDate: dateParts,
        declaredAccurate: true,
        consentedToEsign: true,
        consentStatement: ESIGN_CONSENT_STATEMENT,
        signedAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        recordSha256,
      });
      if (signatureImage) {
        await tx.insert(mediaAssets).values({
          statementId: st.id,
          userId: user.id,
          kind: "signature_image",
          sourceType: "live_capture",
          declaredMime: "image/png",
          detectedMime: "image/png",
          sizeBytes: signatureImage.length,
          sha256: imageSha256,
          storageKey: signatureKey,
          status: "complete",
          scanStatus: "not_configured",
          receivedAt: signedAt,
        });
      }
      await tx.insert(mediaAssets).values({
        statementId: st.id,
        userId: user.id,
        kind: "affirmation_pdf",
        sourceType: "system_generated",
        originalFilename: `affirmation-${st.evidenceId}.pdf`,
        declaredMime: "application/pdf",
        detectedMime: "application/pdf",
        sizeBytes: pdf.length,
        sha256: pdfSha256,
        storageKey: pdfKey,
        status: "complete",
        scanStatus: "not_configured",
        receivedAt: signedAt,
      });
      const updated = await tx
        .update(witnessStatements)
        .set({
          status: "signed",
          finalizedAt: signedAt,
          frozenRecord: record,
          frozenRecordSha256: recordSha256,
          pdfStorageKey: pdfKey,
          pdfSha256,
          pdfBytes: pdf.length,
          authSnapshot: authentication,
        })
        .where(and(eq(witnessStatements.id, st.id), eq(witnessStatements.status, "draft")))
        .returning({ id: witnessStatements.id });
      if (!updated.length) throw new HttpError(409, "The statement was finalized concurrently.", "finalized");
      await this.ctx.audit.record(
        {
          actorType: "witness",
          actorUserId: user.id,
          sessionId: session.id,
          statementId: st.id,
          action: "statement.signed",
          detail: { evidenceId: st.evidenceId, version: st.version, method: input.method, recordSha256, pdfSha256, imageSha256, affirmationDate: dateParts, signedAtUtc: signedAt.toISOString() },
          ...meta,
        },
        txDb,
      );
      await this.ctx.audit.record(
        { actorType: "system", statementId: st.id, action: "pdf.generated", detail: { pdfSha256, pdfBytes: pdf.length, storageKey: pdfKey }, ...meta },
        txDb,
      );
    });
    return { evidenceId: st.evidenceId, statementId: st.id, signedAt: signedAt.toISOString(), recordSha256, pdfSha256 };
  }

  async createCorrection(req: FastifyRequest, original: StatementRow, user: CurrentUser, session: CurrentSession): Promise<StatementRow> {
    if (original.status !== "signed") throw new HttpError(409, "Only signed statements can be corrected.", "not_signed");
    const existing = await this.currentDraft(user.id);
    if (existing) throw new HttpError(409, "Finish or discard your current draft before starting a correction.", "draft_exists");
    const [latest] = await this.ctx.db
      .select()
      .from(witnessStatements)
      .where(eq(witnessStatements.rootId, original.rootId))
      .orderBy(desc(witnessStatements.version))
      .limit(1);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.ctx.db.transaction(async (tx) => {
          const [row] = await tx
            .insert(witnessStatements)
            .values({
              evidenceId: newEvidenceId(),
              userId: user.id,
              rootId: original.rootId,
              version: (latest?.version ?? original.version) + 1,
              supersedesId: original.id,
              inviteId: original.inviteId,
              language: original.language,
              profile: original.profile,
              answers: original.answers,
            })
            .returning();
          await this.ctx.audit.record(
            { actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: row.id, action: "statement.correction_started", detail: { supersedes: original.evidenceId, version: row.version }, ...this.meta(req) },
            tx as unknown as AppContext["db"],
          );
          return row;
        });
      } catch (err) {
        if (String((err as Error).message).includes("witness_statements_evidence_id_idx") && attempt < 4) continue;
        throw err;
      }
    }
    throw new HttpError(500, "Could not allocate an evidence ID.");
  }

  async abandonDraft(req: FastifyRequest, st: StatementRow, user: CurrentUser, session: CurrentSession): Promise<void> {
    this.assertDraft(st);
    const media = await this.mediaFor(st.id, ["complete", "uploading"]);
    for (const m of media) {
      await this.ctx.storage.deleteObject(m.storageKey).catch(() => {});
      await this.ctx.db.update(mediaAssets).set({ status: "removed_before_signing" }).where(eq(mediaAssets.id, m.id));
    }
    await this.ctx.db.update(witnessStatements).set({ status: "abandoned" }).where(eq(witnessStatements.id, st.id));
    await this.ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "statement.draft_abandoned", detail: { mediaRemoved: media.length }, ...this.meta(req) });
  }

  async signatureFor(statementId: string) {
    const [row] = await this.ctx.db.select().from(signatures).where(eq(signatures.statementId, statementId)).limit(1);
    return row ?? null;
  }
}

export function publicStatement(st: StatementRow) {
  return {
    id: st.id,
    evidenceId: st.evidenceId,
    rootId: st.rootId,
    version: st.version,
    supersedesId: st.supersedesId,
    status: st.status,
    language: st.language,
    consent: st.consent,
    profile: st.profile,
    answers: st.answers,
    createdAt: st.createdAt.toISOString(),
    updatedAt: st.updatedAt.toISOString(),
    finalizedAt: st.finalizedAt?.toISOString() ?? null,
    frozenRecordSha256: st.frozenRecordSha256,
    pdfSha256: st.pdfSha256,
    pdfBytes: st.pdfBytes,
  };
}

export function publicMedia(m: MediaRow) {
  return {
    id: m.id,
    kind: m.kind,
    sourceType: m.sourceType,
    originalFilename: m.originalFilename,
    detectedMime: m.detectedMime,
    sizeBytes: m.sizeBytes,
    sha256: m.sha256,
    status: m.status,
    scanStatus: m.scanStatus,
    receivedAt: m.receivedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    description: m.description,
    recordingConsent: m.recordingConsent,
  };
}
