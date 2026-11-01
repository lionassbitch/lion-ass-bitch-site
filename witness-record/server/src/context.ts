import type { FastifyBaseLogger } from "fastify";
import type { AppConfig } from "./config.js";
import type { Db, DbHandle } from "./db/client.js";
import type { StorageDriver } from "./storage/index.js";
import type { AuditService } from "./services/audit.js";
import type { MalwareScanner } from "./services/scanner.js";
import type { OidcService } from "./auth/oidc.js";

export interface AppContext {
  cfg: AppConfig;
  dbHandle: DbHandle;
  db: Db;
  storage: StorageDriver;
  audit: AuditService;
  scanner: MalwareScanner;
  oidc: OidcService;
  log: FastifyBaseLogger;
  startedAt: Date;
}

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = "error",
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
