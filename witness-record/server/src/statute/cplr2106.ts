/**
 * New York Civil Practice Law and Rules, Rule 2106 — Affirmation of truth of
 * statement. Text retrieved from the New York State Senate's published laws:
 * https://www.nysenate.gov/legislation/laws/CVP/2106 (page revision dated
 * 2025-11-28, retrieved 2026-10-30). The affirmation form below is reproduced
 * substantially as the statute specifies. tests/unit/statute.test.ts compares
 * this text against a stored copy of the retrieved statute.
 */

export const CPLR_2106_SOURCE_URL = "https://www.nysenate.gov/legislation/laws/CVP/2106";
export const CPLR_2106_RETRIEVED_ON = "2026-10-30";

export const CPLR_2106_FULL_TEXT = `Rule 2106. Affirmation of truth of statement. (a) The statement of any person wherever made, subscribed and affirmed by that person to be true under the penalties of perjury, other than in a deposition, or an oath of office, or an oath required to be taken before a specified person other than a notary, may be used in an action in New York in lieu of and with the same force and effect as an affidavit, a certificate, a response to a notice to admit, an answer to interrogatories, a verification of a pleading, a bill of particulars and any other sworn statement. Such affirmation shall be in substantially the following form:
I affirm this ___ day of ______, ____, under the penalties of perjury under the laws of New York, which may include a fine or imprisonment, that the foregoing is true, except as to matters alleged on information and belief and as to those matters I believe it to be true, and I understand that this document may be filed in an action or proceeding in a court of law.
(Signature)
(b) Nothing in this rule shall be construed to eliminate any requirement under the domestic relations law that matrimonial agreements must be acknowledged in the form of deed.`;

/** The statutory form with blanks, exactly as published. */
export const CPLR_2106_FORM_TEMPLATE =
  "I affirm this ___ day of ______, ____, under the penalties of perjury under the laws of New York, which may include a fine or imprisonment, that the foregoing is true, except as to matters alleged on information and belief and as to those matters I believe it to be true, and I understand that this document may be filed in an action or proceeding in a court of law.";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export interface AffirmationDateParts {
  day: string;
  month: string;
  year: string;
}

export function affirmationDateParts(now: Date): AffirmationDateParts {
  // The affirmation date is the server's UTC date of signing. New York local
  // time is also recorded in the signature metadata for the reader's convenience.
  return { day: String(now.getUTCDate()), month: MONTHS[now.getUTCMonth()], year: String(now.getUTCFullYear()) };
}

export function renderAffirmation(parts: AffirmationDateParts): string {
  return CPLR_2106_FORM_TEMPLATE.replace("___", parts.day).replace("______", parts.month).replace("____", parts.year);
}

/** Spanish courtesy translation shown alongside the operative English text (not a substitute for it). */
export const CPLR_2106_SPANISH_COURTESY =
  "Afirmo este ___ día de ______, ____, bajo pena de perjurio conforme a las leyes de Nueva York, lo cual puede incluir una multa o prisión, que lo anterior es verdadero, salvo en cuanto a los asuntos alegados según información y creencia, y en cuanto a esos asuntos creo que son verdaderos, y entiendo que este documento puede presentarse en una acción o procedimiento ante un tribunal de justicia.";

export function renderAffirmationSpanish(parts: AffirmationDateParts): string {
  const monthsEs = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const idx = MONTHS.indexOf(parts.month);
  return CPLR_2106_SPANISH_COURTESY.replace("___", parts.day).replace("______", idx >= 0 ? monthsEs[idx] : parts.month).replace("____", parts.year);
}

export const ESIGN_CONSENT_STATEMENT =
  "I consent to sign this affirmation electronically. I understand that my electronic signature, whether drawn or typed, is intended to be my legal signature and has the same effect as a handwritten signature on this document.";

export const ACCURACY_DECLARATION =
  "I have reviewed the complete statement above. It accurately reflects my own personal knowledge. Where I relied on information from others, or am uncertain, I have said so.";
