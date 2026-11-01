import type { StorageDriver } from "./types.js";
import { HttpError } from "../context.js";

/**
 * Placeholder used when STORAGE_DRIVER=s3 but credentials are missing. The
 * server still boots (so the landing page, sign-in and readiness page work),
 * every storage operation fails loudly, and readiness reports NOT CONFIGURED.
 */
export class UnconfiguredStorageDriver implements StorageDriver {
  readonly kind = "unconfigured" as const;
  readonly configured = false;
  readonly description = "S3 storage not configured (S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY missing)";
  readonly encryptionAtRest = "n/a";
  private fail(): never {
    throw new HttpError(503, "File storage is not configured yet. Uploads and downloads are unavailable.", "storage_unconfigured");
  }
  putObject = async () => this.fail();
  getObjectStream = async () => this.fail();
  getObjectBuffer = async () => this.fail();
  getObjectRange = async () => this.fail();
  headObject = async () => this.fail();
  deleteObject = async () => this.fail();
  beginResumable = async () => this.fail();
  appendPart = async () => this.fail();
  presignPartUrl = async () => this.fail();
  listParts = async () => this.fail();
  completeResumable = async () => this.fail();
  abortResumable = async () => this.fail();
  createDownloadUrl = async () => this.fail();
  async healthCheck() {
    return { ok: false, detail: this.description };
  }
}
