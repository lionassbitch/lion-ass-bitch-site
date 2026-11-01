import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { startTestApp, completeDraft, sha256 } from "../helpers/app.js";

/** Server-proxied transport (UPLOAD_MODE=proxy), used on always-on hosts without request-size limits. */
describe("proxy upload transport", () => {
  it("appends sequential chunks, resumes after a wrong offset, and rejects bad types on the first chunk", async () => {
    const t = await startTestApp({ REQUIRE_INVITE_LINK: "false", UPLOAD_MODE: "proxy" });
    try {
      const mp4 = fs.readFileSync(path.resolve(import.meta.dirname, "../fixtures/sample.mp4"));
      const cookie = await t.login({ sub: "p", email: "p@example.test", name: "P" });
      const id = await completeDraft(t, cookie);
      const begin = await t.api(cookie, "POST", `/api/statements/${id}/uploads`, { kind: "video", sourceType: "uploaded_file", filename: "v.mp4", declaredMime: "video/mp4", declaredBytes: mp4.length, recordingConsent: true });
      expect(begin.json.mode).toBe("proxy");
      const { uploadId, chunkBytes } = begin.json;
      const first = mp4.subarray(0, chunkBytes);
      expect((await t.api(cookie, "PUT", `/api/uploads/${uploadId}/chunk?offset=0`, first)).status).toBe(200);
      const dup = await t.api(cookie, "PUT", `/api/uploads/${uploadId}/chunk?offset=0`, first);
      expect(dup.status).toBe(409);
      expect(dup.json.details.bytesReceived).toBe(first.length);
      // Direct-mode endpoints are refused for a proxy upload.
      expect((await t.api(cookie, "POST", `/api/uploads/${uploadId}/parts`, { partNumber: 2 })).status).toBe(409);
      let offset = first.length;
      while (offset < mp4.length) {
        const chunk = mp4.subarray(offset, Math.min(offset + chunkBytes, mp4.length));
        expect((await t.api(cookie, "PUT", `/api/uploads/${uploadId}/chunk?offset=${offset}`, chunk)).status).toBe(200);
        offset += chunk.length;
      }
      const done = await t.api(cookie, "POST", `/api/uploads/${uploadId}/complete`);
      expect(done.status).toBe(200);
      expect(done.json.sha256).toBe(sha256(mp4));
      const fake = Buffer.concat([Buffer.from("MZ nope"), Buffer.alloc(3000)]);
      const b2 = await t.api(cookie, "POST", `/api/statements/${id}/uploads`, { kind: "document", sourceType: "uploaded_file", filename: "x.pdf", declaredMime: "application/pdf", declaredBytes: fake.length });
      const r = await t.api(cookie, "PUT", `/api/uploads/${b2.json.uploadId}/chunk?offset=0`, fake);
      expect(r.status).toBe(415);
    } finally {
      await t.close();
    }
  });
});
