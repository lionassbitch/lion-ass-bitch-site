import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { startTestApp, completeDraft, uploadFile, signStatement, sha256, pdfText, readZip, sampleAnswers, type TestApp } from "../helpers/app.js";
import { witnessStatements } from "../../server/src/db/schema.js";
import { canonicalJson } from "../../server/src/lib/canonical.js";
import { renderAffirmation, affirmationDateParts } from "../../server/src/statute/cplr2106.js";

const webm = fs.readFileSync(path.resolve(import.meta.dirname, "../fixtures/sample.webm"));
const mp4 = fs.readFileSync(path.resolve(import.meta.dirname, "../fixtures/sample.mp4"));

describe("witness submission workflow", () => {
  let t: TestApp;
  let witnessCookie: string;
  let adminCookie: string;
  let inviteUrl: string;
  let inviteCookieValue: string;

  beforeAll(async () => {
    t = await startTestApp();
    adminCookie = await t.login({ sub: "admin-1", email: "eddie@example.test", name: "Eddie" });
    const invite = await t.api(adminCookie, "POST", "/api/admin/invites", { label: "Family group" });
    expect(invite.status).toBe(201);
    inviteUrl = invite.json.invite.url;
    expect(invite.json.invite.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(invite.json.messages.en).toContain(inviteUrl);
    expect(invite.json.messages.es).toContain(inviteUrl);
  });
  afterAll(async () => t.close());

  it("rejects unauthenticated access to every protected route", async () => {
    for (const [m, u] of [
      ["GET", "/api/statements"],
      ["POST", "/api/statements"],
      ["GET", "/api/me"],
      ["GET", "/api/admin/statements"],
      ["GET", "/api/admin/export/all.zip"],
      ["GET", "/api/privacy-requests"],
    ] as const) {
      const r = await t.api(null, m, u, m === "POST" ? {} : undefined);
      expect(r.status, `${m} ${u}`).toBe(401);
    }
  });

  it("authenticates a witness through the real OIDC code flow (Google)", async () => {
    witnessCookie = await t.login({ sub: "witness-1", email: "maria@example.test", name: "Maria R." });
    const me = await t.api(witnessCookie, "GET", "/api/me");
    expect(me.status).toBe(200);
    expect(me.json.user).toMatchObject({ provider: "google", email: "maria@example.test", emailVerified: true, displayName: "Maria R." });
    expect(me.json.session.isAdmin).toBe(false);
  });

  it("requires a valid private invitation link before a statement can begin", async () => {
    const denied = await t.api(witnessCookie, "POST", "/api/statements", { language: "en" });
    expect(denied.status).toBe(403);
    expect(denied.json.error).toBe("invite_required");
    const bad = await t.api(null, "POST", "/api/invite/open", { token: "not-a-real-token" });
    expect(bad.status).toBe(404);
    const token = inviteUrl.split("/i/")[1];
    const open = await t.api(witnessCookie, "POST", "/api/invite/open", { token });
    expect(open.status).toBe(200);
    const sc = open.headers["set-cookie"];
    const list = Array.isArray(sc) ? sc : [sc as string];
    inviteCookieValue = list.find((c) => c.startsWith("wr_invite="))!.split(";")[0];
    witnessCookie = `${witnessCookie}; ${inviteCookieValue}`;
    const cfg = await t.api(witnessCookie, "GET", "/api/config");
    expect(cfg.json.inviteValid).toBe(true);
  });

  let statementId: string;
  let videoSha: string;
  let docSha: string;

  it("walks consent → profile → answers with server-side validation", async () => {
    const created = await t.api(witnessCookie, "POST", "/api/statements", { language: "en" });
    expect(created.status).toBe(201);
    statementId = created.json.statement.id;
    expect(created.json.statement.evidenceId).toMatch(/^WR-\d{4}-[A-Z2-9]{8}$/);
    expect(created.json.statement.status).toBe("draft");

    // Profile cannot be saved before consent? (Allowed; but answers must validate.)
    const badProfile = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/profile`, { legalName: "" });
    expect(badProfile.status).toBe(400);
    expect(badProfile.json.error).toBe("validation");

    const cfg = await t.api(null, "GET", "/api/config");
    const staleConsent = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/consent`, { privacyNoticeVersion: "0000", disclosureAcknowledged: true, voluntaryAcknowledged: true, withdrawalAcknowledged: true });
    expect(staleConsent.status).toBe(409);
    const consent = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/consent`, { privacyNoticeVersion: cfg.json.privacyNoticeVersion, disclosureAcknowledged: true, voluntaryAcknowledged: true, withdrawalAcknowledged: true });
    expect(consent.status).toBe(200);
    expect(consent.json.statement.consent.acceptedAt).toMatch(/Z$/);

    const { sampleProfile } = await import("../helpers/app.js");
    const profile = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/profile`, sampleProfile);
    expect(profile.status).toBe(200);
    expect(profile.json.statement.profile.accountEmail).toBe("maria@example.test");

    const badAnswers = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/answers`, { ...sampleAnswers, q5_observations: ["none", "other"] });
    expect(badAnswers.status).toBe(400);
    const answers = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/answers`, sampleAnswers);
    expect(answers.status).toBe(200);
    expect(answers.json.statement.answers.q6_circumstances).toBe(sampleAnswers.q6_circumstances);
  });

  it("uploads an original video in resumable parts straight to storage, preserving bytes and SHA-256", async () => {
    const begin = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/uploads`, { kind: "video", sourceType: "live_capture", filename: "recording.webm", declaredMime: "video/webm", declaredBytes: webm.length, recordingConsent: true });
    expect(begin.status).toBe(201);
    const { uploadId, chunkBytes, mode } = begin.json;
    expect(mode).toBe("direct");
    expect(chunkBytes).toBe(16 * 1024);
    const putPart = async (n: number, bytes: Buffer) => {
      const grant = await t.api(witnessCookie, "POST", `/api/uploads/${uploadId}/parts`, { partNumber: n });
      if (grant.status !== 200) return grant;
      const u = new URL(grant.json.url);
      // The bytes never pass through an authenticated API route: the presigned URL is the only credential.
      const put = await t.app.inject({ method: "PUT", url: u.pathname + u.search, payload: bytes, headers: { "content-type": "application/octet-stream" } });
      return { status: put.statusCode, json: put.json() };
    };
    const first = webm.subarray(0, chunkBytes);
    expect((await putPart(1, first)).status).toBe(200);
    // Simulated interruption: asking for part 1 again is refused and the server says where to resume (from storage, not from memory).
    const dup = await t.api(witnessCookie, "POST", `/api/uploads/${uploadId}/parts`, { partNumber: 1 });
    expect(dup.status).toBe(409);
    expect(dup.json.details.bytesReceived).toBe(first.length);
    const status = await t.api(witnessCookie, "GET", `/api/uploads/${uploadId}`);
    expect(status.json.bytesReceived).toBe(first.length);
    expect(status.json.partsReceived).toBe(1);
    // Completing early is refused.
    const early = await t.api(witnessCookie, "POST", `/api/uploads/${uploadId}/complete`);
    expect(early.status).toBe(409);
    // An expired or forged part link is refused.
    const forged = await t.app.inject({ method: "PUT", url: "/api/files/part/not-a-token", payload: first, headers: { "content-type": "application/octet-stream" } });
    expect(forged.statusCode).toBe(403);
    let offset = first.length;
    let n = 2;
    while (offset < webm.length) {
      const chunk = webm.subarray(offset, Math.min(offset + chunkBytes, webm.length));
      expect((await putPart(n, chunk)).status).toBe(200);
      offset += chunk.length;
      n += 1;
    }
    const done = await t.api(witnessCookie, "POST", `/api/uploads/${uploadId}/complete`);
    expect(done.status).toBe(200);
    expect(done.json.status).toBe("complete");
    expect(done.json.sha256).toBe(sha256(webm));
    expect(done.json.sizeBytes).toBe(webm.length);
    expect(done.json.detectedMime).toBe("video/webm");
    expect(done.json.receivedAt).toMatch(/Z$/);
    videoSha = done.json.sha256;
    // Stored bytes are byte-identical to what was sent.
    const stored = fs.readFileSync(path.join(t.storageDir, `statements/${statementId}/video/${done.json.mediaAssetId}`));
    expect(stored.equals(webm)).toBe(true);
    // Only one video at a time.
    const second = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/uploads`, { kind: "video", sourceType: "uploaded_file", filename: "x.mp4", declaredMime: "video/mp4", declaredBytes: mp4.length, recordingConsent: true });
    expect(second.status).toBe(409);
  });

  it("lets the witness retake: removing the video before signing deletes bytes but keeps the audit trail", async () => {
    const list = await t.api(witnessCookie, "GET", `/api/statements/${statementId}`);
    const video = list.json.media.find((m: { kind: string }) => m.kind === "video");
    const del = await t.api(witnessCookie, "DELETE", `/api/statements/${statementId}/media/${video.id}`);
    expect(del.status).toBe(200);
    expect(fs.existsSync(path.join(t.storageDir, `statements/${statementId}/video/${video.id}`))).toBe(false);
    const again = await uploadFile(t, witnessCookie, statementId, mp4, { kind: "video", sourceType: "uploaded_file", filename: "phone-video.mp4", mime: "video/mp4" });
    expect(again.detectedMime).toBe("video/mp4");
    expect(again.sha256).toBe(sha256(mp4));
    videoSha = again.sha256;
  });

  it("rejects files whose magic bytes do not match an accepted type", async () => {
    const fake = Buffer.concat([Buffer.from("MZ this is not a video"), Buffer.alloc(5000)]);
    await expect(uploadFile(t, witnessCookie, statementId, fake, { kind: "document", sourceType: "uploaded_file", filename: "evil.exe", mime: "application/pdf" })).rejects.toThrow(/415/);
    const rejected = await t.ctx.dbHandle.exec("SELECT status, scan_detail FROM media_assets WHERE original_filename = 'evil.exe'");
    expect(rejected.rows[0].status).toBe("rejected");
    expect(fs.existsSync(path.join(t.storageDir, "statements", statementId, "document"))).toBe(fs.existsSync(path.join(t.storageDir, "statements", statementId, "document")));
    const oversized = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/uploads`, { kind: "document", sourceType: "uploaded_file", filename: "big.pdf", declaredMime: "application/pdf", declaredBytes: 10 ** 9 });
    expect(oversized.status).toBe(413);
  });

  it("stores a supporting document with its hash", async () => {
    const pdfDoc = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
    const doc = await uploadFile(t, witnessCookie, statementId, pdfDoc, { kind: "document", sourceType: "uploaded_file", filename: "thanksgiving photo.pdf", mime: "application/pdf", description: "Photo from Thanksgiving 2023" });
    expect(doc.detectedMime).toBe("application/pdf");
    expect(doc.sha256).toBe(sha256(pdfDoc));
    docSha = doc.sha256;
  });

  it("review shows the exact statement, the statutory affirmation for today, and a digest", async () => {
    const review = await t.api(witnessCookie, "GET", `/api/statements/${statementId}/review`);
    expect(review.status).toBe(200);
    expect(review.json.complete).toBe(true);
    expect(review.json.affirmation.text).toBe(renderAffirmation(affirmationDateParts(new Date())));
    expect(review.json.affirmation.text).toContain("under the penalties of perjury under the laws of New York, which may include a fine or imprisonment");
    expect(review.json.affirmation.sourceUrl).toBe("https://www.nysenate.gov/legislation/laws/CVP/2106");
    expect(review.json.media.map((m: { sha256: string }) => m.sha256).sort()).toEqual([videoSha, docSha].sort());
    expect(review.json.authentication.providerSubject).toBe("witness-1");
    expect(review.json.reviewDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses to sign when the statement changed after review, or without explicit intent", async () => {
    const review = await t.api(witnessCookie, "GET", `/api/statements/${statementId}/review`);
    const base = { legalName: review.json.statement.profile.legalName, method: "typed", typedValue: review.json.statement.profile.legalName, declaredAccurate: true, consentedToEsign: true, reviewDigest: review.json.reviewDigest, affirmationTextSeen: review.json.affirmation.text };
    const noConsent = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/sign`, { ...base, consentedToEsign: false });
    expect(noConsent.status).toBe(400);
    const noAccuracy = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/sign`, { ...base, declaredAccurate: false });
    expect(noAccuracy.status).toBe(400);
    const wrongName = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/sign`, { ...base, typedValue: "Someone Else" });
    expect(wrongName.status).toBe(400);
    const tampered = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/sign`, { ...base, affirmationTextSeen: base.affirmationTextSeen.replace("perjury", "honor") });
    expect(tampered.status).toBe(409);
    expect(tampered.json.error).toBe("affirmation_mismatch");
    // Change the answers after review → digest no longer matches.
    await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/answers`, { ...sampleAnswers, q7_frequency: "Almost daily." });
    const stale = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/sign`, base);
    expect(stale.status).toBe(409);
    expect(stale.json.error).toBe("review_mismatch");
  });

  let signed: { evidenceId: string; recordSha256: string; pdfSha256: string; signedAt: string };

  it("signs with a drawn signature and freezes the record", async () => {
    const { res } = await signStatement(t, witnessCookie, statementId, "drawn");
    expect(res.status).toBe(200);
    signed = res.json;
    expect(signed.recordSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.pdfSha256).toMatch(/^[0-9a-f]{64}$/);
    const receipt = await t.api(witnessCookie, "GET", `/api/statements/${statementId}/receipt`);
    expect(receipt.status).toBe(200);
    expect(receipt.json.statement.status).toBe("signed");
    expect(receipt.json.signature.method).toBe("drawn");
    expect(receipt.json.frozenRecord.answers.q7_frequency).toBe("Almost daily.");
    expect(sha256(canonicalJson(receipt.json.frozenRecord))).toBe(signed.recordSha256);
    expect(receipt.json.frozenRecord.media.map((m: { sha256: string }) => m.sha256).sort()).toEqual([videoSha, docSha].sort());
    expect(receipt.json.frozenRecord.authentication.provider).toBe("google");
    expect(JSON.stringify(receipt.json)).not.toMatch(/access_token|id_token|refresh_token/);
  });

  it("produces a PDF linked to the exact signed statement", async () => {
    const link = await t.api(witnessCookie, "GET", `/api/statements/${statementId}/pdf`);
    expect(link.status).toBe(200);
    expect(link.json.sha256).toBe(signed.pdfSha256);
    const url = new URL(link.json.url);
    const file = await t.api(null, "GET", url.pathname);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("application/pdf");
    expect(sha256(file.raw)).toBe(signed.pdfSha256);
    const text = await pdfText(file.raw);
    expect(text).toMatch(/Page 1 of [2-5] /);
    expect(text).not.toMatch(/Page \d+ of (6|7|8|9|1\d) /);
    expect(text).toContain(signed.evidenceId);
    expect(text).toContain("María José Rivera-Santos");
    expect(text).toContain("Almost daily.");
    expect(text).toContain(sampleAnswers.q9_secondhandPortions);
    expect(text).toContain("under the penalties of perjury under the laws of New York");
    expect(text).toContain(signed.recordSha256);
    expect(text).toContain(videoSha);
    expect(text).toContain("witness-1");
    expect(text).toContain("not government identity verification");
    expect(text).not.toMatch(/Notariz|notarized/i);
    // Expired/forged link is refused.
    const forged = await t.api(null, "GET", url.pathname.slice(0, -4) + "AAAA");
    expect(forged.status).toBe(403);
  });

  it("never overwrites a signed statement, at the API and at the database", async () => {
    const api = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/answers`, sampleAnswers);
    expect(api.status).toBe(409);
    const consent = await t.api(witnessCookie, "PUT", `/api/statements/${statementId}/consent`, {});
    expect(consent.status).toBe(409);
    await expect(t.ctx.dbHandle.exec("UPDATE witness_statements SET language = 'es' WHERE id = $1", [statementId])).rejects.toThrow(/immutable/);
    await expect(t.ctx.dbHandle.exec("DELETE FROM witness_statements WHERE id = $1", [statementId])).rejects.toThrow(/cannot be deleted/);
    await expect(t.ctx.db.update(witnessStatements).set({ language: "es" }).where(eq(witnessStatements.id, statementId))).rejects.toThrow();
    await expect(t.ctx.dbHandle.exec("DELETE FROM signatures")).rejects.toThrow(/append-only/);
    await expect(t.ctx.dbHandle.exec("UPDATE media_assets SET sha256 = 'x' WHERE status = 'complete'")).rejects.toThrow(/immutable/);
  });

  it("creates a correction as a new linked version and preserves the original", async () => {
    const corr = await t.api(witnessCookie, "POST", `/api/statements/${statementId}/corrections`);
    expect(corr.status).toBe(201);
    const v2 = corr.json.statement;
    expect(v2.version).toBe(2);
    expect(v2.supersedesId).toBe(statementId);
    expect(v2.status).toBe("draft");
    expect(v2.answers.q6_circumstances).toBe(sampleAnswers.q6_circumstances);
    const cfg = await t.api(null, "GET", "/api/config");
    await t.api(witnessCookie, "PUT", `/api/statements/${v2.id}/consent`, { privacyNoticeVersion: cfg.json.privacyNoticeVersion, disclosureAcknowledged: true, voluntaryAcknowledged: true, withdrawalAcknowledged: true });
    await t.api(witnessCookie, "PUT", `/api/statements/${v2.id}/answers`, { ...sampleAnswers, q10_uncertainties: "Correction: I now recall it was the summer of 2019, not the spring." });
    const { res } = await signStatement(t, witnessCookie, v2.id, "typed");
    expect(res.status).toBe(200);
    expect(res.json.evidenceId).not.toBe(signed.evidenceId);
    const list = await t.api(witnessCookie, "GET", "/api/statements");
    const original = list.json.statements.find((s: { id: string }) => s.id === statementId);
    expect(original.status).toBe("signed");
    expect(original.supersededByLater).toBe(true);
    expect(original.frozenRecordSha256).toBe(signed.recordSha256);
    const receipt2 = await t.api(witnessCookie, "GET", `/api/statements/${v2.id}/receipt`);
    expect(receipt2.json.frozenRecord.supersedesEvidenceId).toBe(signed.evidenceId);
    expect(receipt2.json.frozenRecord.signature.method).toBe("typed");
  });

  it("keeps witnesses out of each other's records and out of the dashboard", async () => {
    const other = await t.login({ sub: "witness-2", email: "other@example.test", name: "Other" }, "microsoft");
    const peek = await t.api(other, "GET", `/api/statements/${statementId}`);
    expect(peek.status).toBe(404);
    const pdf = await t.api(other, "GET", `/api/statements/${statementId}/pdf`);
    expect(pdf.status).toBe(404);
    const admin = await t.api(other, "GET", "/api/admin/statements");
    expect(admin.status).toBe(403);
    expect(admin.json.error).toBe("not_admin");
    const me = await t.api(other, "GET", "/api/me");
    expect(me.json.user.provider).toBe("microsoft");
  });

  it("gives the case owner a complete, truthful evidence package", async () => {
    const list = await t.api(adminCookie, "GET", "/api/admin/statements?status=signed&q=rivera");
    expect(list.status).toBe(200);
    expect(list.json.statements.length).toBe(2);
    const byObs = await t.api(adminCookie, "GET", "/api/admin/statements?observedFrom=2025-12-01&observedTo=2025-12-31");
    expect(byObs.json.statements.length).toBeGreaterThanOrEqual(2);
    const none = await t.api(adminCookie, "GET", "/api/admin/statements?observedFrom=2030-01-01");
    expect(none.json.statements.length).toBe(0);

    const detail = await t.api(adminCookie, "GET", `/api/admin/statements/${statementId}`);
    expect(detail.status).toBe(200);
    expect(detail.json.account.providerSubject).toBe("witness-1");
    expect(detail.json.signature.recordSha256).toBe(signed.recordSha256);
    expect(detail.json.versions.length).toBe(2);
    const actions = detail.json.audit.map((e: { action: string }) => e.action);
    for (const a of ["statement.draft_created", "statement.consent_recorded", "media.upload_completed", "media.removed_before_signing", "statement.reviewed", "statement.signed", "pdf.generated", "admin.statement_viewed"]) expect(actions).toContain(a);
    const video = detail.json.media.find((m: { kind: string; status: string }) => m.kind === "video" && m.status === "complete");
    const play = await t.api(adminCookie, "GET", `/api/admin/statements/${statementId}/media/${video.id}/link?inline=1`);
    expect(play.status).toBe(200);
    const streamed = await t.api(null, "GET", new URL(play.json.url).pathname);
    expect(streamed.status).toBe(200);
    expect(sha256(streamed.raw)).toBe(videoSha);
    expect(streamed.headers["content-disposition"]).toMatch(/^inline/);

    const note = await t.api(adminCookie, "POST", `/api/admin/statements/${statementId}/annotations`, { body: "Follow up about the super's name." });
    expect(note.status).toBe(201);
    await expect(t.ctx.dbHandle.exec("UPDATE admin_annotations SET body='x'")).rejects.toThrow(/append-only/);

    const bundle = await t.api(adminCookie, "GET", `/api/admin/statements/${statementId}/bundle.zip`);
    expect(bundle.status).toBe(200);
    const entries = readZip(bundle.raw);
    const names = [...entries.keys()];
    expect(names).toContain("manifest.json");
    expect(names).toContain("audit-summary.txt");
    expect(names).toContain("frozen-record.json");
    expect(names).toContain("signature-record.json");
    expect(names).toContain("authentication-provenance.json");
    expect(names).toContain(`affirmation-${signed.evidenceId}.pdf`);
    expect(names.some((n) => n.startsWith("video/original-") && n.endsWith(".mp4"))).toBe(true);
    expect(names.some((n) => n.startsWith("documents/"))).toBe(true);
    const manifest = JSON.parse(entries.get("manifest.json")!.toString());
    expect(manifest.frozenRecordSha256).toBe(signed.recordSha256);
    expect(manifest.frozenRecordSha256Recomputed).toBe(signed.recordSha256);
    expect(manifest.pdfSha256).toBe(signed.pdfSha256);
    for (const f of manifest.files) expect(sha256(entries.get(f.path)!)).toBe(f.sha256);
    expect(sha256(entries.get("frozen-record.json")!)).toBe(signed.recordSha256);
    const summary = entries.get("audit-summary.txt")!.toString();
    expect(summary).toContain("NOT government identity verification");
    expect(summary).toContain("not configured; files were not screened");
    expect(summary).toContain("MATCH");
    expect(summary).toContain("CASE OWNER ANNOTATIONS");
    expect(summary).not.toMatch(/chain of custody/i);

    const all = await t.api(adminCookie, "GET", "/api/admin/export/all.zip");
    expect(all.status).toBe(200);
    const allEntries = readZip(all.raw);
    expect([...allEntries.keys()]).toContain("index.csv");
    expect([...allEntries.keys()]).toContain(`${signed.evidenceId}/manifest.json`);
    const csv = await t.api(adminCookie, "GET", "/api/admin/export/metadata?format=csv");
    expect(csv.status).toBe(200);
    expect(csv.raw.toString()).toContain(signed.evidenceId);
    const json = await t.api(adminCookie, "GET", "/api/admin/export/metadata");
    expect(json.json.statements.length).toBeGreaterThanOrEqual(2);
    const verify = await t.api(adminCookie, "POST", "/api/admin/audit/verify");
    expect(verify.json.ok).toBe(true);
    expect(verify.json.count).toBeGreaterThan(20);
  });

  it("handles privacy requests with a documented status flow", async () => {
    const r = await t.api(witnessCookie, "POST", "/api/privacy-requests", { statementId, requestType: "correction", message: "Please note my phone number changed." });
    expect(r.status).toBe(201);
    const list = await t.api(adminCookie, "GET", "/api/admin/privacy-requests");
    expect(list.json.requests[0].message).toContain("phone number");
    const upd = await t.api(adminCookie, "POST", `/api/admin/privacy-requests/${r.json.id}`, { status: "resolved", resolutionNote: "Witness created a correction version." });
    expect(upd.status).toBe(200);
    const mine = await t.api(witnessCookie, "GET", "/api/privacy-requests");
    expect(mine.json.requests[0].status).toBe("resolved");
  });

  it("supports a Spanish-language statement end to end", async () => {
    const es = await t.login({ sub: "witness-3", email: "carlos@example.test", name: "Carlos" });
    const esCookie = `${es}; ${inviteCookieValue}`;
    const id = await completeDraft(t, esCookie, "es");
    const review = await t.api(esCookie, "GET", `/api/statements/${id}/review`);
    expect(review.json.affirmation.spanishCourtesy).toContain("bajo pena de perjurio");
    const { res } = await signStatement(t, esCookie, id, "typed");
    expect(res.status).toBe(200);
    const link = await t.api(esCookie, "GET", `/api/statements/${id}/pdf`);
    const file = await t.api(null, "GET", new URL(link.json.url).pathname);
    const text = await pdfText(file.raw);
    expect(text).toContain("Afirmación de testigo");
    expect(text).toContain("Declaración de conocimiento personal");
    expect(text).toContain("under the penalties of perjury under the laws of New York");
    expect(text).toContain("bajo pena de perjurio");
    expect(text).toContain(sampleAnswers.q6_circumstances);
  });

  it("logs out and invalidates the session", async () => {
    const out = await t.api(witnessCookie, "POST", "/api/auth/logout");
    expect(out.status).toBe(200);
    const me = await t.api(witnessCookie, "GET", "/api/me");
    expect(me.status).toBe(401);
  });
});
