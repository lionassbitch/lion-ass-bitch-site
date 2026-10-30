export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const headers = { "X-Requested-With": "XMLHttpRequest" };

/** Same-origin JSON client. Cookies carry the session; the custom header plus Origin check defeat CSRF. */
export async function api<T = unknown>(method: string, url: string, body?: unknown, init: { raw?: Blob | ArrayBuffer; signal?: AbortSignal } = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: {
      ...headers,
      ...(init.raw ? { "Content-Type": "application/octet-stream" } : body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal: init.signal,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const e = (json ?? {}) as { error?: string; message?: string; details?: unknown };
    throw new ApiError(res.status, e.error ?? "error", e.message ?? `Request failed (${res.status})`, e.details);
  }
  return json as T;
}

export interface Config {
  providers: { google: { configured: boolean }; microsoft: { configured: boolean } };
  inviteRequired: boolean;
  inviteValid: boolean;
  privacyNoticeVersion: string;
  caseSubject: string;
  caseAddress: string;
  limits: { maxVideoBytes: number; maxDocumentBytes: number; maxDocuments: number; chunkBytes: number };
  metadata: { ipAddress: boolean; userAgent: boolean };
  statute: { sourceUrl: string; retrievedOn: string; fullText: string };
}

export interface Me {
  user: { id: string; provider: "google" | "microsoft"; email: string | null; emailVerified: boolean; displayName: string | null };
  session: { id: string; authenticatedAt: string; expiresAt: string; isAdmin: boolean; mfaRequired: boolean; mfaEnrolled: boolean; mfaVerified: boolean };
}

export interface Statement {
  id: string;
  evidenceId: string;
  rootId: string;
  version: number;
  supersedesId: string | null;
  status: "draft" | "signed" | "abandoned";
  language: "en" | "es";
  consent: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  answers: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  frozenRecordSha256: string | null;
  pdfSha256: string | null;
  pdfBytes: number | null;
  supersededByLater?: boolean;
}

export interface Media {
  id: string;
  kind: "video" | "document" | "signature_image" | "affirmation_pdf";
  sourceType: "live_capture" | "uploaded_file" | "system_generated";
  originalFilename: string | null;
  detectedMime: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  status: string;
  scanStatus: string;
  receivedAt: string | null;
  createdAt: string;
  description: string | null;
}

export function formatBytes(n: number | null | undefined): string {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatUtc(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.replace("T", " ").replace(/\.\d+Z$/, " UTC");
}
