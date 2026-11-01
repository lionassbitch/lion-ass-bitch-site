import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CPLR_2106_FULL_TEXT, CPLR_2106_FORM_TEMPLATE, renderAffirmation, affirmationDateParts, renderAffirmationSpanish } from "../../server/src/statute/cplr2106.js";

/**
 * The statutory text was retrieved from https://www.nysenate.gov/legislation/laws/CVP/2106
 * on 2026-10-30 and stored verbatim in tests/fixtures/cplr-2106.retrieved.txt.
 * This test guards against accidental edits to the affirmation language.
 */
describe("CPLR § 2106 affirmation", () => {
  const retrieved = fs.readFileSync(path.resolve(import.meta.dirname, "../fixtures/cplr-2106.retrieved.txt"), "utf8");
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();

  it("matches the retrieved statutory text", () => {
    expect(norm(CPLR_2106_FULL_TEXT)).toBe(norm(retrieved));
  });

  it("the form template is contained verbatim in the statute", () => {
    expect(norm(CPLR_2106_FULL_TEXT)).toContain(norm(CPLR_2106_FORM_TEMPLATE));
    expect(CPLR_2106_FORM_TEMPLATE).toContain("under the penalties of perjury under the laws of New York, which may include a fine or imprisonment");
    expect(CPLR_2106_FORM_TEMPLATE).toContain("I understand that this document may be filed in an action or proceeding in a court of law");
  });

  it("renders the date into the blanks without altering any other word", () => {
    const parts = affirmationDateParts(new Date("2026-03-05T23:59:00Z"));
    expect(parts).toEqual({ day: "5", month: "March", year: "2026" });
    const text = renderAffirmation(parts);
    expect(text.startsWith("I affirm this 5 day of March, 2026, under the penalties of perjury")).toBe(true);
    expect(text.replace("5 day of March, 2026", "___ day of ______, ____")).toBe(CPLR_2106_FORM_TEMPLATE);
    expect(renderAffirmationSpanish(parts)).toContain("5 día de marzo, 2026");
  });
});
