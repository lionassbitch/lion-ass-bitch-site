import type { AppConfig } from "../config.js";
import { LocalStorageDriver } from "./local.js";
import { S3StorageDriver } from "./s3.js";
import type { StorageDriver } from "./types.js";

export type { StorageDriver } from "./types.js";

export function createStorage(cfg: AppConfig): StorageDriver {
  if (cfg.env.STORAGE_DRIVER === "s3") {
    if (!cfg.storageConfigured) throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
    return new S3StorageDriver({
      bucket: cfg.env.S3_BUCKET,
      region: cfg.env.S3_REGION,
      endpoint: cfg.env.S3_ENDPOINT,
      accessKeyId: cfg.env.S3_ACCESS_KEY_ID,
      secretAccessKey: cfg.env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: cfg.env.S3_FORCE_PATH_STYLE,
      sse: cfg.env.S3_SSE,
    });
  }
  return new LocalStorageDriver(cfg.env.LOCAL_STORAGE_DIR, cfg.sessionSecret, cfg.baseUrl);
}
