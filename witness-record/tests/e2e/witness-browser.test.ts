import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, devices, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { startTestApp, sha256, type TestApp } from "../helpers/app.js";

/**
 * Real-browser tests (Chromium, iPhone viewport with touch) through the built
 * client, against the in-process OIDC provider. Camera/microphone use
 * Chromium's fake media devices so in-browser recording is exercised for real.
 */
const root = path.resolve(import.meta.dirname, "../..");
const fixture = path.join(root, "tests/fixtures/sample.mp4");

describe("witness flow in a mobile browser", () => {
  let t: TestApp;
  let browser: Browser;
  let ctx: BrowserContext;
  let page: Page;
  let inviteUrl: string;

  beforeAll(async () => {
    if (!fs.existsSync(path.join(root, "dist/client/index.html"))) execSync("npm run build:client", { cwd: root, stdio: "inherit" });
    t = await startTestApp({ REQUIRE_INVITE_LINK: "true" }, { listen: true });
    const admin = await t.login({ sub: "admin-1", email: "eddie@example.test", name: "Eddie" });
    const invite = await t.api(admin, "POST", "/api/admin/invites", { label: "Browser test" });
    inviteUrl = invite.json.invite.url;
    browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
    ctx = await browser.newContext({ ...devices["iPhone 13"], permissions: ["camera", "microphone"], locale: "en-US" });
    page = await ctx.newPage();
    page.on("pageerror", (e) => console.error("pageerror", e));
  });
  afterAll(async () => {
    await browser?.close();
    await t?.close();
  });

  async function completeOidcRedirect() {
    // The mock provider redirects straight back; wait for the app to land on the statement flow.
    await page.waitForURL(/\/statement\/consent/, { timeout: 20000 });
  }

  it("opens the private link, signs in, and records consent", async () => {
    await page.goto(inviteUrl);
    await page.waitForURL((u) => new URL(u).pathname === "/");
    await page.waitForSelector("h1");
    expect(await page.textContent("h1")).toContain("THE WITNESS RECORD");
    expect(await page.textContent("body")).toContain("Sometimes the strongest evidence is the simple truth");
    // Language switch changes the interface only.
    await page.getByRole("button", { name: "Español" }).click();
    expect(await page.textContent("body")).toContain("Dar una declaración de testigo");
    await page.getByRole("button", { name: "English" }).click();
    await page.getByRole("button", { name: "Provide a Witness Statement" }).click();
    await page.waitForURL(/\/sign-in/);
    await page.getByRole("link", { name: "Sign in with Google" }).waitFor();
    expect(await page.textContent("body")).toContain("Sign in with Microsoft");
    t.setIdentity({ sub: "ana-1", email: "ana@example.test", name: "Ana P." });
    await page.getByRole("link", { name: "Sign in with Google" }).click();
    await completeOidcRedirect();
    await page.waitForSelector("input[type=checkbox]");
    expect(await page.textContent("h1")).toContain("Privacy notice and consent");
    const boxes = page.locator("input[type=checkbox]");
    expect(await boxes.count()).toBe(3);
    const agree = page.getByRole("button", { name: "I agree and want to continue" });
    expect(await agree.isDisabled()).toBe(true);
    for (let i = 0; i < 3; i++) await boxes.nth(i).check();
    await agree.click();
    await page.waitForURL(/\/statement\/profile/);
    await page.waitForSelector("#legalName");
  });

  it("fills identity and the neutral questions with large touch targets", async () => {
    // Touch targets ≥ 44px on the primary control.
    const box = await page.getByRole("button", { name: "Continue" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await page.fill("#legalName", "Ana Lucía Pérez");
    expect(await page.inputValue("#accountEmail")).toBe("ana@example.test");
    await page.fill("#phone", "718-555-0100");
    await page.getByLabel("Neighbor").check();
    await page.fill("#relationshipDescription", "We lived across the hall from each other.");
    await page.fill("#howAndWhenMet", "Around 2020, in the building.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/statement\/questions/);
    await page.waitForSelector("#q1");
    expect(await page.textContent("body")).toContain("Do you have personal knowledge of whether he lived or stayed at 1665 Morris Avenue?");
    // Nothing is pre-filled.
    expect(await page.inputValue("#q1")).toBe("");
    expect(await page.inputValue("#q6")).toBe("");
    await page.fill("#q1", "He was my neighbor across the hall.");
    await page.getByLabel("Yes, through personal observation").check();
    await page.locator("input[name='q3-precision']").nth(2).check(); // month and year
    await page.fill("#q3-month", "2020-06");
    await page.locator("input[name='q4-precision']").nth(1).check(); // approximate date
    await page.fill("#q4-date", "2026-01-15");
    await page.getByLabel("Saw him enter or leave").check();
    await page.getByLabel("Spoke with him there").check();
    await page.fill("#q6", "I saw him most mornings leaving for work and we often spoke in the hallway of 1665 Morris Avenue.");
    await page.fill("#q7", "Almost every day.");
    await page.fill("#q9", "Nothing; all of this is my own observation.");
    await page.fill("#q10", "I cannot remember the exact month he moved in.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/statement\/video/);
    await page.waitForSelector("text=Please state your name.");
  });

  it("records a video in the browser with the camera and uploads the original bytes", async () => {
    expect(await page.textContent("body")).toContain("Please state your name.");
    await page.getByLabel(/I agree to be recorded/).check();
    await page.getByRole("button", { name: "Record in the browser" }).click();
    await page.getByRole("button", { name: "Start recording" }).click({ timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "Stop recording" }).click();
    await page.getByRole("button", { name: "Use this recording" }).click({ timeout: 15000 });
    await page.waitForSelector("text=Video on file", { timeout: 60000 });
    const body = await page.textContent("body");
    expect(body).toContain("Recorded in browser");
    expect(body).toMatch(/SHA-256 fingerprint\s*[0-9a-f]{64}/);
    // Server-side record agrees with what the browser shows.
    const rows = await t.ctx.dbHandle.exec("SELECT sha256, size_bytes, source_type, detected_mime, storage_key FROM media_assets WHERE kind='video' AND status='complete'");
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].source_type).toBe("live_capture");
    expect(String(rows.rows[0].detected_mime)).toMatch(/^video\//);
    const stored = fs.readFileSync(path.join(t.storageDir, String(rows.rows[0].storage_key)));
    expect(sha256(stored)).toBe(rows.rows[0].sha256);
    expect(stored.length).toBe(Number(rows.rows[0].size_bytes));
    // Retake path: remove and upload a file from the device instead.
    await page.getByRole("button", { name: "Remove this video" }).click();
    await page.waitForSelector("text=Choose a video file");
    await page.getByLabel(/I agree to be recorded/).check();
    await page.setInputFiles("#video-file", fixture);
    await page.getByRole("button", { name: /Upload a video file \(/ }).click();
    await page.waitForSelector("text=Uploaded file", { timeout: 60000 });
    expect(await page.textContent("body")).toContain(sha256(fs.readFileSync(fixture)));
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/statement\/documents/);
    await page.waitForSelector("#doc-file");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/statement\/review/);
    await page.getByRole("button", { name: "Proceed to sign" }).waitFor();
  });

  it("reviews the exact statement and signs by drawing on the touchscreen", async () => {
    const body = await page.textContent("body");
    expect(body).toContain("Ana Lucía Pérez");
    expect(body).toContain("I saw him most mornings leaving for work");
    expect(body).toContain("Month and year: 2020-06");
    expect(body).toContain("not government identity verification");
    await page.getByRole("button", { name: "Proceed to sign" }).click();
    await page.waitForURL(/\/statement\/sign/);
    await page.waitForSelector(".statute");
    const statute = await page.textContent(".statute");
    expect(statute).toContain("under the penalties of perjury under the laws of New York, which may include a fine or imprisonment");
    expect(statute).toContain("may be filed in an action or proceeding in a court of law");
    const submit = page.getByRole("button", { name: "Sign and Submit Affirmation" });
    expect(await submit.isDisabled()).toBe(true);
    await page.getByLabel(/I have reviewed the complete statement/).check();
    await page.getByLabel(/I consent to sign this affirmation electronically/).check();
    expect(await page.inputValue("#sig-name")).toBe("Ana Lucía Pérez");
    // Draw a signature with touch-like pointer strokes.
    const canvas = page.locator(".sigpad canvas");
    await canvas.scrollIntoViewIfNeeded();
    const cb = (await canvas.boundingBox())!;
    await page.mouse.move(cb.x + 20, cb.y + 120);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(cb.x + 20 + i * 10, cb.y + 120 + Math.sin(i / 2) * 30);
    await page.mouse.up();
    expect(await submit.isDisabled()).toBe(false);
    await submit.click();
    await page.waitForURL(/\/receipt\//, { timeout: 30000 });
    await page.waitForSelector("text=Your affirmation has been recorded");
    const receipt = await page.textContent("body");
    expect(receipt).toContain("Your affirmation has been recorded");
    expect(receipt).toMatch(/WR-\d{4}-[A-Z2-9]{8}/);
    expect(receipt).toMatch(/Record fingerprint \(SHA-256\)\s*[0-9a-f]{64}/);
    const sig = await t.ctx.dbHandle.exec("SELECT method, image_sha256 FROM signatures");
    expect(sig.rows[0].method).toBe("drawn");
    expect(String(sig.rows[0].image_sha256)).toMatch(/^[0-9a-f]{64}$/);
    // The PDF download link works from the receipt page.
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.getByRole("button", { name: /Download my signed affirmation/ }).click()]);
    const file = await download.path();
    const pdfRow = await t.ctx.dbHandle.exec("SELECT pdf_sha256 FROM witness_statements WHERE status='signed'");
    expect(sha256(fs.readFileSync(file!))).toBe(pdfRow.rows[0].pdf_sha256);
  });

  it("lets the witness revisit records and switch language without changing content", async () => {
    await page.goto(`${t.baseUrl}/my?lang=es`);
    await page.waitForSelector("text=Mis declaraciones");
    const body = await page.textContent("body");
    expect(body).toContain("Firmada");
    await page.getByRole("link", { name: /Su afirmación ha sido registrada/ }).click();
    await page.waitForURL(/\/receipt\//);
    await page.waitForSelector("text=Ana Lucía Pérez");
    expect(await page.textContent("body")).toContain("Ana Lucía Pérez");
    // Signed statement is immutable even in Spanish: the stored language stays as signed.
    const st = await t.ctx.dbHandle.exec("SELECT language, status FROM witness_statements");
    expect(st.rows[0]).toMatchObject({ language: "en", status: "signed" });
  });

  it("shows the case owner the record in the dashboard and plays the original video", async () => {
    const adminCtx = await browser.newContext({ locale: "en-US" });
    const ap = await adminCtx.newPage();
    try {
      await ap.goto(`${t.baseUrl}/sign-in?returnTo=/admin`);
      // Switch the in-process provider to issue the admin identity.
      t.setIdentity({ sub: "admin-1", email: "eddie@example.test", name: "Eddie" });
      await ap.getByRole("link", { name: "Sign in with Google" }).click();
      await ap.waitForURL(/\/admin/, { timeout: 20000 });
      await ap.waitForSelector("text=Signed affirmations");
      await ap.getByRole("link", { name: "Witness records", exact: true }).click();
      await ap.waitForSelector("text=Ana Lucía Pérez");
      await ap.getByRole("link", { name: /WR-\d{4}-/ }).first().click();
      await ap.waitForSelector("text=Signature record");
      const body = await ap.textContent("body");
      expect(body).toContain("Authenticated account");
      expect(body).toContain("Provider subject");
      expect(body).toContain("statement.signed");
      await ap.getByRole("button", { name: "Play original" }).click();
      const video = ap.locator("video");
      await video.waitFor({ timeout: 20000 });
      await ap.waitForFunction(() => {
        const v = document.querySelector("video");
        return v && v.readyState >= 1;
      }, null, { timeout: 20000 });
      const [download] = await Promise.all([ap.waitForEvent("download", { timeout: 20000 }), ap.getByRole("link", { name: /Download evidence bundle/ }).click()]);
      const zip = fs.readFileSync((await download.path())!);
      expect(zip.subarray(0, 2).toString()).toBe("PK");
      // Anonymous browser cannot see anything.
      const anon = await browser.newContext();
      const anonPage = await anon.newPage();
      const r = await anonPage.goto(`${t.baseUrl}/api/admin/statements`);
      expect(r!.status()).toBe(401);
      await anon.close();
    } finally {
      await adminCtx.close();
    }
  });
});
