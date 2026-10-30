import PDFDocument from "pdfkit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { ApproximateDate, FrozenRecord } from "../types.js";
import { dict, type Dictionary } from "../i18n/index.js";
import { CPLR_2106_SOURCE_URL, renderAffirmationSpanish } from "../statute/cplr2106.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function fontsDir(): string {
  const candidates = [path.resolve(here, "../../assets/fonts"), path.resolve(here, "../../../server/assets/fonts"), path.resolve(process.cwd(), "server/assets/fonts")];
  for (const c of candidates) if (fs.existsSync(path.join(c, "DejaVuSans.ttf"))) return c;
  throw new Error("PDF fonts not found");
}

const NAVY = "#0f1b2d";
const SLATE = "#5b6573";
const GOLD = "#a9893f";
const RULE = "#d7d2c4";

export interface PdfInput {
  record: FrozenRecord;
  /** SHA-256 of the canonical JSON of `record` (computed before rendering). */
  recordSha256: string;
  signatureImage: Buffer | null; // PNG
  generatedAt: Date;
}

export function describeDate(d: ApproximateDate, t: Dictionary): string {
  const label = t.questions.datePrecision[d.precision];
  let core = "";
  switch (d.precision) {
    case "exact":
    case "approximate":
      core = d.date ?? "";
      break;
    case "month_year":
      core = d.month ?? "";
      break;
    case "range":
      core = `${d.rangeStart ?? ""} – ${d.rangeEnd ?? ""}`;
      break;
    case "unknown":
      core = "";
  }
  const parts = [label, core].filter(Boolean).join(": ");
  return d.note ? `${parts} — ${d.note}` : parts;
}

export function nyTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

/**
 * Renders the signed affirmation. The content comes exclusively from the
 * frozen record: nothing is added, summarized or rephrased.
 */
export async function renderAffirmationPdf(input: PdfInput): Promise<Buffer> {
  const { record } = input;
  const t = dict(record.language);
  const fonts = fontsDir();
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 64, bottom: 64, left: 60, right: 60 },
    bufferPages: true,
    info: {
      Title: `${t.pdf.documentTitle} — ${record.evidenceId}`,
      Author: record.signature.legalName,
      Subject: `${record.caseSubject} — ${record.caseAddress}`,
      Creator: "THE WITNESS RECORD",
      Producer: "THE WITNESS RECORD",
      CreationDate: input.generatedAt,
      ModDate: input.generatedAt,
    },
    pdfVersion: "1.7",
  });
  doc.registerFont("sans", path.join(fonts, "DejaVuSans.ttf"));
  doc.registerFont("sans-bold", path.join(fonts, "DejaVuSans-Bold.ttf"));
  doc.registerFont("serif", path.join(fonts, "DejaVuSerif.ttf"));
  doc.registerFont("serif-bold", path.join(fonts, "DejaVuSerif-Bold.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const heading = (text: string) => {
    doc.moveDown(0.8);
    ensureSpace(doc, 60);
    doc.font("serif-bold").fontSize(13).fillColor(NAVY).text(text);
    doc.moveTo(doc.x, doc.y + 2).lineTo(doc.x + width, doc.y + 2).strokeColor(GOLD).lineWidth(0.8).stroke();
    doc.moveDown(0.6);
  };
  const field = (label: string, value: string | null | undefined) => {
    ensureSpace(doc, 30);
    doc.font("sans-bold").fontSize(9).fillColor(SLATE).text(label.toUpperCase(), { characterSpacing: 0.4 });
    doc.font("sans").fontSize(10.5).fillColor(NAVY).text(value && value.trim() ? value : t.questions.notAnswered, { width });
    doc.moveDown(0.5);
  };
  const question = (label: string, value: string | null | undefined) => {
    ensureSpace(doc, 40);
    doc.font("sans-bold").fontSize(10.5).fillColor(NAVY).text(label, { width });
    doc.moveDown(0.15);
    doc.font("serif").fontSize(10.5).fillColor("#1b2430").text(value && value.trim() ? value : t.questions.notAnswered, { width, indent: 12 });
    doc.moveDown(0.6);
  };

  // Title block
  doc.font("sans-bold").fontSize(9).fillColor(GOLD).text("THE WITNESS RECORD", { characterSpacing: 1.2 });
  doc.moveDown(0.3);
  doc.font("serif-bold").fontSize(20).fillColor(NAVY).text(t.pdf.documentTitle);
  doc.font("sans").fontSize(10).fillColor(SLATE).text(t.pdf.subtitle);
  doc.moveDown(0.6);
  doc.font("sans").fontSize(9.5).fillColor(NAVY);
  doc.text(`${t.pdf.evidenceId}: ${record.evidenceId}    ${t.pdf.version}: ${record.version}${record.supersedesEvidenceId ? `    ${t.pdf.supersedes}: ${record.supersedesEvidenceId}` : ""}`);
  doc.text(`${t.pdf.generated}: ${input.generatedAt.toISOString()}    ${t.pdf.langNote}: ${record.language === "es" ? "Español" : "English"}`);
  doc.moveDown(0.2);
  doc.moveTo(doc.x, doc.y).lineTo(doc.x + width, doc.y).strokeColor(RULE).lineWidth(1).stroke();

  // 1. Witness
  heading(t.pdf.sectionWitness);
  const p = record.profile;
  field(t.profile.legalName, p.legalName);
  field(t.pdf.providerDisplayName, record.authentication.providerDisplayName ?? "—");
  field(t.profile.accountEmail, p.accountEmail ?? t.profile.accountEmailNone);
  field(t.profile.phone, p.phone ?? "—");
  field(t.profile.preferredContact, t.profile.contactOptions[p.preferredContact]);
  field(
    t.profile.relationshipCategory,
    p.relationshipCategory === "other" && p.relationshipOther ? `${t.profile.relationshipOptions.other}: ${p.relationshipOther}` : t.profile.relationshipOptions[p.relationshipCategory],
  );
  field(t.profile.relationshipDescription, p.relationshipDescription);
  field(t.profile.howAndWhenMet, p.howAndWhenMet);
  field(
    t.profile.personalInterest,
    `${p.hasPersonalInterest === "yes" ? t.app.yes : p.hasPersonalInterest === "no" ? t.app.no : t.app.unsure}${p.personalInterestDescription ? ` — ${p.personalInterestDescription}` : ""}`,
  );
  field(t.profile.willingContact, t.profile.willingOptions[p.willingToBeContacted]);

  // 2. Statement
  heading(t.pdf.sectionStatement);
  doc.font("sans").fontSize(9).fillColor(SLATE).text(t.pdf.truthStatement, { width });
  doc.moveDown(0.6);
  const a = record.answers;
  question(t.questions.q1, a.q1_howKnow);
  question(t.questions.q2, t.questions.q2Options[a.q2_personalKnowledge]);
  question(t.questions.q3, describeDate(a.q3_firstAware, t));
  question(t.questions.q4, describeDate(a.q4_mostRecentObservation, t));
  const obs = a.q5_observations.length
    ? a.q5_observations.map((o) => `• ${t.questions.q5Options[o]}${o === "other" && a.q5_observationsOther ? `: ${a.q5_observationsOther}` : ""}`).join("\n")
    : t.questions.noneSelected;
  question(t.questions.q5, obs);
  question(t.questions.q6, a.q6_circumstances);
  question(t.questions.q7, a.q7_frequency);
  question(t.questions.q8, a.q8_specificRecollections);
  question(t.questions.q9, a.q9_secondhandPortions);
  question(t.questions.q10, a.q10_uncertainties);
  question(t.questions.q11, `${a.q11_hasMaterials === "yes" ? t.app.yes : t.app.no}${a.q11_materialsDescription ? ` — ${a.q11_materialsDescription}` : ""}`);

  // 3. Media
  heading(t.pdf.sectionMedia);
  if (!record.media.length) {
    doc.font("sans").fontSize(10.5).fillColor(NAVY).text(t.pdf.noMedia);
  } else {
    for (const m of record.media) {
      ensureSpace(doc, 90);
      doc.font("sans-bold").fontSize(10.5).fillColor(NAVY).text(`${m.kind === "video" ? t.review.videoSection : t.review.documentsSection} — ${m.mediaAssetId}`);
      doc.font("sans").fontSize(9.5).fillColor("#1b2430");
      if (m.originalFilename) doc.text(`${t.documents.choose.replace("Add a file", "File").replace("Agregar un archivo", "Archivo")}: ${m.originalFilename}`);
      if (m.description) doc.text(`${t.documents.description} ${m.description}`);
      doc.text(`${t.pdf.sourceType}: ${m.sourceType === "live_capture" ? t.video.source.live_capture : t.video.source.uploaded_file}`);
      doc.text(`${t.pdf.size}: ${m.sizeBytes.toLocaleString("en-US")} ${t.pdf.bytes}    ${t.pdf.receivedAt}: ${m.receivedAtUtc}`);
      doc.text(`${t.pdf.mediaDigest}: ${m.sha256}`);
      doc.text(`${t.pdf.scan}: ${t.pdf.scanStatus[m.scanStatus as keyof typeof t.pdf.scanStatus] ?? m.scanStatus}`);
      if (m.recordingConsent) doc.text(`${t.video.consentTitle}: ${m.recordingConsent.acceptedAt}`);
      doc.moveDown(0.6);
    }
  }

  // 4. Affirmation
  heading(t.pdf.sectionAffirmation);
  ensureSpace(doc, 160);
  doc.font("serif").fontSize(11).fillColor(NAVY).text(record.signature.affirmationText, { width, align: "left" });
  doc.font("sans").fontSize(8).fillColor(SLATE).text(`CPLR Rule 2106 — ${CPLR_2106_SOURCE_URL}`);
  if (record.language === "es") {
    doc.moveDown(0.4);
    doc.font("sans").fontSize(8.5).fillColor(SLATE).text(t.pdf.courtesyTranslation);
    doc.font("serif").fontSize(9.5).fillColor(SLATE).text(renderAffirmationSpanish(record.signature.affirmationDate), { width });
  }
  doc.moveDown(0.8);
  ensureSpace(doc, 120);
  const sigTop = doc.y;
  if (record.signature.method === "drawn" && input.signatureImage) {
    doc.image(input.signatureImage, doc.x, sigTop, { fit: [260, 90] });
    doc.y = sigTop + 92;
  } else {
    doc.font("serif-bold").fontSize(22).fillColor(NAVY).text(record.signature.typedValue ?? record.signature.legalName, { width: 300 });
    doc.moveDown(0.2);
  }
  doc.moveTo(doc.x, doc.y).lineTo(doc.x + 300, doc.y).strokeColor(NAVY).lineWidth(0.8).stroke();
  doc.moveDown(0.3);
  field(t.pdf.signedBy, record.signature.legalName);
  field(t.pdf.signatureMethod, record.signature.method === "drawn" ? t.pdf.methodDrawn : `${t.pdf.methodTyped}: “${record.signature.typedValue ?? ""}”`);
  field(t.pdf.signedAtUtc, record.signature.signedAtUtc);
  field(t.pdf.signedAtNy, nyTime(record.signature.signedAtUtc));
  ensureSpace(doc, 80);
  doc.font("sans-bold").fontSize(9).fillColor(SLATE).text(t.pdf.consents.toUpperCase(), { characterSpacing: 0.4 });
  doc.font("sans").fontSize(9.5).fillColor(NAVY);
  doc.text(`☑ ${t.sign.accuracy}: ${record.signature.declaredAccurate ? t.app.yes : t.app.no}`);
  doc.text(`☑ ${t.sign.esign}: ${record.signature.consentedToEsign ? t.app.yes : t.app.no} — ${record.signature.consentStatement}`, { width });
  doc.text(`☑ ${t.pdf.consentPrivacy}: ${record.consent.privacyNoticeVersion} @ ${record.consent.acceptedAt}`);
  doc.moveDown(0.5);

  // 5. Authentication
  heading(t.pdf.sectionAuth);
  const au = record.authentication;
  field(t.pdf.authProvider, au.provider === "google" ? "Google" : "Microsoft");
  field(t.pdf.authIssuer, au.providerIssuer);
  field(t.pdf.authSubject, au.providerSubject);
  field(t.pdf.authEmail, au.emailClaim ?? "—");
  field(t.pdf.authEmailVerified, au.emailVerified ? t.app.yes : t.app.no);
  field(t.pdf.providerDisplayName, au.providerDisplayName ?? "—");
  field(t.pdf.authAt, au.authenticatedAt);
  field(t.pdf.authSession, au.sessionId);
  doc.font("sans").fontSize(8.5).fillColor(SLATE).text(t.pdf.authCaveat, { width });

  // 6. Integrity
  heading(t.pdf.sectionIntegrity);
  field(t.pdf.recordDigest, input.recordSha256);
  doc.font("sans").fontSize(8.5).fillColor(SLATE).text(t.pdf.integrityNote, { width });

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Writing inside the bottom margin must not trigger an automatic page break.
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 44;
    doc.font("sans").fontSize(8).fillColor(SLATE);
    doc.text(`THE WITNESS RECORD · ${record.evidenceId} · ${record.signature.legalName}`, doc.page.margins.left, y, { width: width * 0.7, lineBreak: false });
    doc.text(`${t.pdf.page} ${i - range.start + 1} ${t.app.of} ${range.count}`, doc.page.margins.left, y, { width, align: "right", lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }
  doc.end();
  return done;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}
