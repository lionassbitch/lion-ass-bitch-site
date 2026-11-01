import { ZipArchive, type Archiver } from "archiver";
import { PassThrough, type Readable } from "node:stream";
import { eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { auditEvents, adminAnnotations, mediaAssets, signatures, witnessStatements } from "../db/schema.js";
import { canonicalJson } from "../lib/canonical.js";
import { sha256Hex } from "../lib/crypto.js";
import { extensionFor } from "./filetype.js";
import type { StatementRow } from "./statements.js";
import { computeEntryHash, type ActorType } from "./audit.js";

export interface ManifestFile {
  path: string;
  role: string;
  mediaAssetId: string | null;
  sha256: string;
  sizeBytes: number;
  contentType: string | null;
  receivedAtUtc: string | null;
  sourceType: string | null;
  originalFilename: string | null;
}

/**
 * Builds the per-statement evidence package: signed PDF, original media,
 * documents, signature image, frozen record JSON, signature record,
 * authentication provenance, the audit trail for this statement, a
 * machine-readable manifest and a plain-language audit summary that states
 * only what the system itself can substantiate.
 */
export class BundleService {
  constructor(private readonly ctx: AppContext) {}

  async collect(st: StatementRow) {
    const media = await this.ctx.db.select().from(mediaAssets).where(eq(mediaAssets.statementId, st.id)).orderBy(mediaAssets.createdAt);
    const [sig] = await this.ctx.db.select().from(signatures).where(eq(signatures.statementId, st.id)).limit(1);
    const audit = await this.ctx.db.select().from(auditEvents).where(eq(auditEvents.statementId, st.id)).orderBy(auditEvents.id);
    const notes = await this.ctx.db.select().from(adminAnnotations).where(eq(adminAnnotations.statementId, st.id)).orderBy(adminAnnotations.createdAt);
    let supersedes: StatementRow | null = null;
    if (st.supersedesId) {
      const [prev] = await this.ctx.db.select().from(witnessStatements).where(eq(witnessStatements.id, st.supersedesId)).limit(1);
      supersedes = prev ?? null;
    }
    const laterVersions = await this.ctx.db.select().from(witnessStatements).where(eq(witnessStatements.supersedesId, st.id));
    return { media, sig: sig ?? null, audit, notes, supersedes, laterVersions };
  }

  fileNameFor(st: StatementRow, m: typeof mediaAssets.$inferSelect): string {
    const ext = extensionFor(m.detectedMime);
    switch (m.kind) {
      case "video":
        return `video/original-${m.id}.${ext}`;
      case "document":
        return `documents/${m.id}-${sanitize(m.originalFilename ?? "document")}${m.originalFilename?.includes(".") ? "" : `.${ext}`}`;
      case "signature_image":
        return `signature/signature-${m.id}.png`;
      case "affirmation_pdf":
        return `affirmation-${st.evidenceId}.pdf`;
      default:
        return `other/${m.id}.${ext}`;
    }
  }

  async buildManifestAndSummary(st: StatementRow) {
    const c = await this.collect(st);
    const files: ManifestFile[] = [];
    for (const m of c.media) {
      if (m.status !== "complete") continue;
      files.push({
        path: this.fileNameFor(st, m),
        role: m.kind,
        mediaAssetId: m.id,
        sha256: m.sha256 ?? "",
        sizeBytes: Number(m.sizeBytes ?? 0),
        contentType: m.detectedMime,
        receivedAtUtc: (m.receivedAt ?? m.createdAt).toISOString(),
        sourceType: m.sourceType,
        originalFilename: m.originalFilename,
      });
    }
    const recordJson = st.frozenRecord ? canonicalJson(st.frozenRecord) : null;
    const recordDigestRecomputed = recordJson ? sha256Hex(recordJson) : null;
    const chain = verifyLocalChain(c.audit);
    const manifest = {
      application: "THE WITNESS RECORD",
      manifestVersion: 1,
      generatedAtUtc: new Date().toISOString(),
      evidenceId: st.evidenceId,
      statementId: st.id,
      rootId: st.rootId,
      version: st.version,
      status: st.status,
      supersedesEvidenceId: c.supersedes?.evidenceId ?? null,
      supersededByEvidenceIds: c.laterVersions.map((l) => l.evidenceId),
      createdAtUtc: st.createdAt.toISOString(),
      finalizedAtUtc: st.finalizedAt?.toISOString() ?? null,
      frozenRecordSha256: st.frozenRecordSha256,
      frozenRecordSha256Recomputed: recordDigestRecomputed,
      pdfSha256: st.pdfSha256,
      files,
      signature: c.sig
        ? {
            legalName: c.sig.legalName,
            method: c.sig.method,
            typedValue: c.sig.typedValue,
            imageSha256: c.sig.imageSha256,
            signedAtUtc: c.sig.signedAt.toISOString(),
            affirmationDate: c.sig.affirmationDate,
            consentedToEsign: c.sig.consentedToEsign,
            declaredAccurate: c.sig.declaredAccurate,
            recordSha256: c.sig.recordSha256,
            sessionId: c.sig.sessionId,
          }
        : null,
      authentication: st.authSnapshot,
      auditChain: { entries: c.audit.length, locallyConsistent: chain.ok, firstEntryId: c.audit[0]?.id ?? null, lastEntryId: c.audit.at(-1)?.id ?? null, lastEntryHash: c.audit.at(-1)?.entryHash ?? null },
      storage: { driver: this.ctx.storage.kind, description: this.ctx.storage.description, encryptionAtRest: this.ctx.storage.encryptionAtRest },
      malwareScreening: this.ctx.scanner.configured ? "ClamAV daemon configured; per-file results in files[].scanStatus of the frozen record" : "Not configured; files were not screened",
    };
    const summary = this.auditSummary(st, c, files, chain);
    return { manifest, summary, collected: c };
  }

  private auditSummary(st: StatementRow, c: Awaited<ReturnType<BundleService["collect"]>>, files: ManifestFile[], chain: { ok: boolean }): string {
    const L: string[] = [];
    L.push("THE WITNESS RECORD — AUDIT SUMMARY");
    L.push("=".repeat(60));
    L.push(`Evidence ID: ${st.evidenceId}`);
    L.push(`Statement ID: ${st.id}`);
    L.push(`Version: ${st.version}${c.supersedes ? ` (supersedes ${c.supersedes.evidenceId})` : ""}`);
    if (c.laterVersions.length) L.push(`Superseded by: ${c.laterVersions.map((l) => l.evidenceId).join(", ")}`);
    L.push(`Status: ${st.status}`);
    L.push(`Draft created (UTC): ${st.createdAt.toISOString()}`);
    L.push(`Finalized (UTC): ${st.finalizedAt?.toISOString() ?? "not finalized"}`);
    L.push(`Summary generated (UTC): ${new Date().toISOString()}`);
    L.push("");
    L.push("WHAT THIS SYSTEM CAN SUBSTANTIATE");
    L.push("-".repeat(60));
    const au = st.authSnapshot;
    if (au) {
      L.push(`• The statement was submitted and signed from a session authenticated with ${au.provider === "google" ? "Google" : "Microsoft"} (issuer ${au.providerIssuer}).`);
      L.push(`  Provider account identifier: ${au.providerSubject}`);
      L.push(`  Email claim: ${au.emailClaim ?? "none provided"} (marked verified by provider: ${au.emailVerified ? "yes" : "no"})`);
      L.push(`  Display name reported by provider: ${au.providerDisplayName ?? "none"}`);
      L.push(`  Authenticated at (UTC): ${au.authenticatedAt}`);
      L.push("  Account sign-in shows control of that account at the time. It is NOT government identity verification, NOT proof of physical presence, and NOT verification of truthfulness.");
    } else {
      L.push("• No authentication snapshot (statement not finalized).");
    }
    if (c.sig) {
      L.push(`• An explicit "Sign and Submit Affirmation" action was recorded at ${c.sig.signedAt.toISOString()} (UTC) by legal name "${c.sig.legalName}" using a ${c.sig.method === "drawn" ? "drawn" : "typed"} electronic signature, after the witness affirmed accuracy and consented to electronic signature.`);
      L.push(`  Affirmation form: New York CPLR Rule 2106, dated ${c.sig.affirmationDate.month} ${c.sig.affirmationDate.day}, ${c.sig.affirmationDate.year}.`);
      if (c.sig.ipAddress || c.sig.userAgent) L.push(`  Client metadata at signing: IP ${c.sig.ipAddress ?? "not collected"}; user agent ${c.sig.userAgent ?? "not collected"}.`);
    }
    if (st.frozenRecordSha256) {
      L.push(`• The complete statement was frozen at signing. SHA-256 of the canonical record: ${st.frozenRecordSha256}`);
      L.push(`  Recomputed now from the stored record: ${sha256Hex(canonicalJson(st.frozenRecord))} (${sha256Hex(canonicalJson(st.frozenRecord)) === st.frozenRecordSha256 ? "MATCH" : "MISMATCH"})`);
    }
    if (st.pdfSha256) L.push(`• The affirmation PDF was generated by the system from the frozen record. SHA-256: ${st.pdfSha256}`);
    L.push("");
    L.push("FILES IN THIS PACKAGE");
    L.push("-".repeat(60));
    if (!files.length) L.push("(none)");
    for (const f of files) {
      L.push(`• ${f.path}`);
      L.push(`  role: ${f.role}; source: ${f.sourceType ?? "n/a"}; size: ${f.sizeBytes} bytes; type: ${f.contentType ?? "unknown"}`);
      L.push(`  received by server (UTC): ${f.receivedAtUtc ?? "n/a"}`);
      L.push(`  SHA-256 computed from stored bytes at receipt: ${f.sha256}`);
      if (f.originalFilename) L.push(`  original filename as supplied by witness: ${f.originalFilename}`);
    }
    L.push("");
    L.push("INTEGRITY AND LIMITS");
    L.push("-".repeat(60));
    L.push(`• Audit entries for this statement: ${c.audit.length}; hash chain locally consistent: ${chain.ok ? "yes" : "NO"}. The full chain can be verified by the case owner from the dashboard (Audit → Verify chain).`);
    L.push(`• Storage: ${this.ctx.storage.description}. Encryption at rest: ${this.ctx.storage.encryptionAtRest}`);
    L.push(`• Malware screening: ${this.ctx.scanner.configured ? "ClamAV configured (see per-file status)" : "not configured; files were not screened"}.`);
    L.push("• Original media is stored exactly as received. The system does not transcode, trim, crop, enhance, transcribe or otherwise alter it.");
    L.push("• This summary covers events inside the system only. It cannot attest to anything that happened on the witness's device before upload, to the identity of the person operating the account, or to the truth of the statement.");
    L.push("• This platform does not notarize documents and makes no representation about admissibility in any particular proceeding.");
    if (c.notes.length) {
      L.push("");
      L.push("CASE OWNER ANNOTATIONS (separate from witness testimony; never alter it)");
      L.push("-".repeat(60));
      for (const n of c.notes) L.push(`• [${n.createdAt.toISOString()}] ${n.body}`);
    }
    L.push("");
    L.push("AUDIT TRAIL (this statement)");
    L.push("-".repeat(60));
    for (const e of c.audit) {
      L.push(`${e.id}\t${e.occurredAt.toISOString()}\t${e.actorType}\t${e.action}\t${JSON.stringify(e.detail)}\tprev=${e.prevHash.slice(0, 12)}… hash=${e.entryHash.slice(0, 12)}…`);
    }
    return L.join("\n");
  }

  /** Streams a ZIP evidence package for one statement. */
  async zipStream(st: StatementRow): Promise<Readable> {
    const { manifest, summary, collected } = await this.buildManifestAndSummary(st);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const out = new PassThrough();
    archive.on("error", (err: Error) => out.destroy(err));
    archive.pipe(out);
    await this.appendStatementToArchive(archive, st, "", { manifest, summary, collected });
    void archive.finalize();
    return out;
  }

  async appendStatementToArchive(
    archive: Archiver,
    st: StatementRow,
    prefix: string,
    pre?: { manifest: unknown; summary: string; collected: Awaited<ReturnType<BundleService["collect"]>> },
  ) {
    const { manifest, summary, collected } = pre ?? (await this.buildManifestAndSummary(st));
    archive.append(JSON.stringify(manifest, null, 2), { name: `${prefix}manifest.json` });
    archive.append(summary, { name: `${prefix}audit-summary.txt` });
    if (st.frozenRecord) archive.append(canonicalJson(st.frozenRecord), { name: `${prefix}frozen-record.json` });
    archive.append(
      JSON.stringify(
        collected.audit.map((e) => ({
          id: e.id,
          occurredAtUtc: e.occurredAt.toISOString(),
          actorType: e.actorType,
          actorUserId: e.actorUserId,
          sessionId: e.sessionId,
          mediaAssetId: e.mediaAssetId,
          action: e.action,
          detail: e.detail,
          ipAddress: e.ipAddress,
          userAgent: e.userAgent,
          prevHash: e.prevHash,
          entryHash: e.entryHash,
        })),
        null,
        2,
      ),
      { name: `${prefix}audit-trail.json` },
    );
    if (collected.sig) {
      archive.append(
        JSON.stringify(
          {
            legalName: collected.sig.legalName,
            method: collected.sig.method,
            typedValue: collected.sig.typedValue,
            imageSha256: collected.sig.imageSha256,
            affirmationText: collected.sig.affirmationText,
            affirmationDate: collected.sig.affirmationDate,
            declaredAccurate: collected.sig.declaredAccurate,
            consentedToEsign: collected.sig.consentedToEsign,
            consentStatement: collected.sig.consentStatement,
            signedAtUtc: collected.sig.signedAt.toISOString(),
            ipAddress: collected.sig.ipAddress,
            userAgent: collected.sig.userAgent,
            recordSha256: collected.sig.recordSha256,
            sessionId: collected.sig.sessionId,
          },
          null,
          2,
        ),
        { name: `${prefix}signature-record.json` },
      );
    }
    if (st.authSnapshot) archive.append(JSON.stringify(st.authSnapshot, null, 2), { name: `${prefix}authentication-provenance.json` });
    if (collected.notes.length)
      archive.append(JSON.stringify(collected.notes.map((n) => ({ createdAtUtc: n.createdAt.toISOString(), adminUserId: n.adminUserId, body: n.body })), null, 2), {
        name: `${prefix}case-owner-annotations.json`,
      });
    for (const m of collected.media) {
      if (m.status !== "complete") continue;
      const stream = await this.ctx.storage.getObjectStream(m.storageKey);
      archive.append(stream, { name: `${prefix}${this.fileNameFor(st, m)}` });
    }
  }
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
}

function verifyLocalChain(rows: (typeof auditEvents.$inferSelect)[]): { ok: boolean } {
  // Entries for one statement are a subsequence of the global chain, so this
  // checks that each entry's content still matches its recorded hash; chain
  // continuity is verified globally by AuditService.verifyChain().
  for (const r of rows) {
    const expected = computeEntryHash(r.prevHash, {
      occurredAt: r.occurredAt.toISOString(),
      actorType: r.actorType as ActorType,
      actorUserId: r.actorUserId,
      sessionId: r.sessionId,
      statementId: r.statementId,
      mediaAssetId: r.mediaAssetId,
      action: r.action,
      detail: r.detail,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
    });
    if (expected !== r.entryHash) return { ok: false };
  }
  return { ok: true };
}
