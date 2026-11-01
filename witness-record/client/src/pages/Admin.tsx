import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams, useSearchParams } from "react-router";
import { api, ApiError, formatBytes, formatUtc, type Media } from "../lib/api";
import { useSession } from "../lib/session";
import { useT } from "../lib/i18n";
import { Field, Notice, Spinner } from "../components/ui";
import { StatementReview, type ReviewPayload } from "./Statement";
import { en } from "../../../server/src/i18n/en";

/* The dashboard is English-only (documented in docs/SETUP.md). */

function useAdminGate() {
  const { me, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!me) navigate("/sign-in?returnTo=/admin", { replace: true });
  }, [me, loading, navigate]);
  return { me, loading };
}

export function AdminLayout() {
  const { me, loading } = useAdminGate();
  if (loading || !me) return <Spinner />;
  if (!me.session.isAdmin)
    return (
      <section className="card">
        <h1>{en.admin.title}</h1>
        <Notice kind="error">{en.admin.notAdmin}</Notice>
        <p className="muted small">Admin identity comes from the ADMIN_ALLOWLIST configuration, never from being the first user.</p>
      </section>
    );
  if (me.session.mfaRequired && !me.session.mfaVerified) return <MfaGate enrolled={me.session.mfaEnrolled} />;
  return (
    <>
      <nav className="admin-nav" aria-label="Dashboard">
        <NavLink to="/admin" end>
          Overview
        </NavLink>
        <NavLink to="/admin/statements">Witness records</NavLink>
        <NavLink to="/admin/invites">Private links</NavLink>
        <NavLink to="/admin/privacy">Privacy requests</NavLink>
        <NavLink to="/admin/audit">Audit log</NavLink>
        <NavLink to="/admin/readiness">Readiness</NavLink>
      </nav>
      <Outlet />
    </>
  );
}

function MfaGate({ enrolled }: { enrolled: boolean }) {
  const { refresh } = useSession();
  const [enroll, setEnroll] = useState<{ qrDataUrl: string; manualKey: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setError(null);
    try {
      setEnroll(await api("POST", "/api/admin/mfa/enroll/start"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : en.app.errorGeneric);
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("POST", enrolled ? "/api/admin/mfa/verify" : "/api/admin/mfa/enroll/confirm", { code });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : en.app.errorGeneric);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card" style={{ maxWidth: 520 }}>
      <h1>{en.admin.title}</h1>
      <Notice kind="info">{en.admin.mfaRequired}</Notice>
      {!enrolled && !enroll && (
        <button type="button" className="btn" onClick={start}>
          {en.admin.enroll}
        </button>
      )}
      {enroll && (
        <>
          <p>{en.admin.enrollHelp}</p>
          <img className="qr" src={enroll.qrDataUrl} alt="Authenticator enrollment QR code" />
          <p className="mono small">{enroll.manualKey}</p>
        </>
      )}
      {(enrolled || enroll) && (
        <form onSubmit={submit}>
          <Field id="totp" label={en.admin.code} required>
            <input id="totp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" value={code} onChange={(e) => setCode(e.target.value)} required />
          </Field>
          {error && <Notice kind="error">{error}</Notice>}
          <button className="btn gold" type="submit" disabled={busy}>
            {en.admin.verify}
          </button>
        </form>
      )}
    </section>
  );
}

export function AdminOverview() {
  const [data, setData] = useState<{ counts: { signed: number; draft: number; abandoned: number }; pendingPrivacyRequests: number; storage: { driver: string; description: string }; caseSubject: string; caseAddress: string } | null>(null);
  useEffect(() => {
    api<typeof data>("GET", "/api/admin/overview").then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <Spinner />;
  return (
    <section className="card">
      <div className="eyebrow">Case dashboard</div>
      <h1>
        {data.caseSubject} — {data.caseAddress}
      </h1>
      <div className="grid-2">
        <div className="card subtle stat">
          <div className="n">{data.counts.signed}</div>
          <div>Signed affirmations</div>
        </div>
        <div className="card subtle stat">
          <div className="n">{data.counts.draft}</div>
          <div>Unsigned drafts (not evidence)</div>
        </div>
        <div className="card subtle stat">
          <div className="n">{data.pendingPrivacyRequests}</div>
          <div>Open privacy requests</div>
        </div>
        <div className="card subtle stat">
          <div className="n" style={{ fontSize: "1.2rem" }}>{data.storage.driver}</div>
          <div className="small muted">{data.storage.description}</div>
        </div>
      </div>
      <div className="actions">
        <Link className="btn" to="/admin/statements">
          Open witness records
        </Link>
        <a className="btn secondary" href="/api/admin/export/all.zip">
          Export all records (ZIP)
        </a>
        <a className="btn secondary" href="/api/admin/export/metadata?format=csv">
          Metadata CSV
        </a>
        <a className="btn secondary" href="/api/admin/export/metadata">
          Metadata JSON
        </a>
      </div>
      <p className="muted small">Every view, download link and export is written to the audit log with your account identity.</p>
    </section>
  );
}

interface Row {
  id: string;
  evidenceId: string;
  status: string;
  version: number;
  supersededByLater: boolean;
  language: string;
  legalName: string | null;
  relationshipCategory: string | null;
  personalKnowledge: string | null;
  firstAware: { precision: string; date?: string; month?: string; rangeStart?: string; rangeEnd?: string } | null;
  mostRecent: { precision: string; date?: string; month?: string; rangeStart?: string; rangeEnd?: string } | null;
  account: { provider: string; email: string | null; emailVerified: boolean; displayName: string | null };
  createdAt: string;
  finalizedAt: string | null;
  media: { video: number; document: number };
  hasConsent: boolean;
  hasProfile: boolean;
  hasAnswers: boolean;
  lastError: string | null;
}

function shortDate(d: Row["firstAware"]): string {
  if (!d) return "—";
  if (d.precision === "unknown") return "does not remember";
  return d.date ?? d.month ?? (d.rangeStart ? `${d.rangeStart}–${d.rangeEnd}` : "—");
}

export function AdminStatements() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = Object.fromEntries(params.entries());
  const load = useCallback(async () => {
    try {
      const r = await api<{ statements: Row[] }>("GET", `/api/admin/statements?${params.toString()}`);
      setRows(r.statements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : en.app.errorGeneric);
    }
  }, [params]);
  useEffect(() => {
    void load();
  }, [load]);
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };
  return (
    <section className="card">
      <h1>Witness records</h1>
      <div className="filters">
        <Field id="f-q" label="Search (name, relationship, evidence ID, email)">
          <input id="f-q" type="search" value={q.q ?? ""} onChange={(e) => set("q", e.target.value)} />
        </Field>
        <Field id="f-status" label="Status">
          <select id="f-status" value={q.status ?? "all"} onChange={(e) => set("status", e.target.value)}>
            <option value="all">All</option>
            <option value="signed">Signed</option>
            <option value="draft">Draft / incomplete</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </Field>
        <Field id="f-sf" label="Submitted from">
          <input id="f-sf" type="date" value={q.submittedFrom ?? ""} onChange={(e) => set("submittedFrom", e.target.value)} />
        </Field>
        <Field id="f-st" label="Submitted to">
          <input id="f-st" type="date" value={q.submittedTo ?? ""} onChange={(e) => set("submittedTo", e.target.value)} />
        </Field>
        <Field id="f-of" label="Observation period from">
          <input id="f-of" type="date" value={q.observedFrom ?? ""} onChange={(e) => set("observedFrom", e.target.value)} />
        </Field>
        <Field id="f-ot" label="Observation period to">
          <input id="f-ot" type="date" value={q.observedTo ?? ""} onChange={(e) => set("observedTo", e.target.value)} />
        </Field>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {!rows ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Evidence ID</th>
                <th>Status</th>
                <th>Witness</th>
                <th>Relationship</th>
                <th>Knowledge</th>
                <th>First aware</th>
                <th>Most recent</th>
                <th>Account</th>
                <th>Media</th>
                <th>Finalized (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/admin/statements/${r.id}`}>{r.evidenceId}</Link>
                    <div className="muted small">v{r.version}{r.supersededByLater ? " · superseded" : ""}</div>
                  </td>
                  <td>
                    <span className={`pill ${r.status}`}>{r.status === "signed" ? "Signed" : r.status === "draft" ? "Draft — not evidence" : "Abandoned"}</span>
                    {r.status === "draft" && (
                      <div className="muted small">
                        {r.hasConsent ? "consent ✓" : "no consent"} · {r.hasProfile ? "profile ✓" : "no profile"} · {r.hasAnswers ? "answers ✓" : "no answers"}
                      </div>
                    )}
                    {r.lastError && <div className="small" style={{ color: "var(--danger)" }}>{r.lastError}</div>}
                  </td>
                  <td>{r.legalName ?? <span className="muted">—</span>}</td>
                  <td>{r.relationshipCategory ? en.profile.relationshipOptions[r.relationshipCategory as keyof typeof en.profile.relationshipOptions] : "—"}</td>
                  <td className="small">{r.personalKnowledge ? en.questions.q2Options[r.personalKnowledge as keyof typeof en.questions.q2Options] : "—"}</td>
                  <td className="small">{shortDate(r.firstAware)}</td>
                  <td className="small">{shortDate(r.mostRecent)}</td>
                  <td className="small">
                    {r.account.provider} · {r.account.email ?? "no email"}
                    {r.account.emailVerified ? "" : " (unverified)"}
                  </td>
                  <td className="small">
                    {r.media.video ? `video ${r.media.video}` : ""} {r.media.document ? `docs ${r.media.document}` : ""}
                  </td>
                  <td className="small">{formatUtc(r.finalizedAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="muted">
                    No records match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface Detail {
  statement: ReviewPayload["statement"] & { authSnapshot: ReviewPayload["authentication"] | null; frozenRecord: unknown; lastError: string | null };
  account: { provider: string; providerIssuer: string; providerSubject: string; email: string | null; emailVerified: boolean; displayName: string | null; lastLoginAt: string | null } | null;
  media: (Media & { storageKey: string; scanDetail: string | null })[];
  signature: { legalName: string; method: string; typedValue: string | null; imageSha256: string | null; affirmationText: string; affirmationDate: { day: string; month: string; year: string }; signedAt: string; ipAddress: string | null; userAgent: string | null; recordSha256: string; sessionId: string; consentStatement: string } | null;
  audit: { id: number; occurredAt: string; actorType: string; actorUserId: string | null; action: string; detail: Record<string, unknown>; ipAddress: string | null; userAgent: string | null; prevHash: string; entryHash: string }[];
  annotations: { id: string; adminUserId: string; body: string; createdAt: string }[];
  versions: { id: string; evidenceId: string; version: number; status: string; finalizedAt: string | null }[];
}

export function AdminStatementDetail() {
  const { id } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [playUrl, setPlayUrl] = useState<{ url: string; type: string } | null>(null);
  const load = useCallback(async () => {
    try {
      setD(await api<Detail>("GET", `/api/admin/statements/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : en.app.errorGeneric);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const link = async (m: Media, inline: boolean) => {
    const r = await api<{ url: string; contentType: string }>("GET", `/api/admin/statements/${id}/media/${m.id}/link?inline=${inline ? 1 : 0}`);
    if (inline) setPlayUrl({ url: r.url, type: r.contentType });
    else window.location.href = r.url;
  };
  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("POST", `/api/admin/statements/${id}/annotations`, { body: note });
    setNote("");
    await load();
  };
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!d) return <Spinner />;
  const st = d.statement;
  const review: ReviewPayload | null =
    st.profile && st.answers && d.account
      ? {
          statement: st,
          media: d.media.filter((m) => (m.kind === "video" || m.kind === "document") && m.status === "complete"),
          authentication: st.authSnapshot ?? { provider: d.account.provider, providerIssuer: d.account.providerIssuer, providerSubject: d.account.providerSubject, emailClaim: d.account.email, emailVerified: d.account.emailVerified, providerDisplayName: d.account.displayName, authenticatedAt: d.account.lastLoginAt ?? "" },
          affirmation: { text: "", spanishCourtesy: "", dateParts: { day: "", month: "", year: "" }, sourceUrl: "", esignConsent: "", accuracyDeclaration: "" },
          reviewDigest: "",
          complete: true,
          problems: [],
        }
      : null;
  const pdf = d.media.find((m) => m.kind === "affirmation_pdf" && m.status === "complete");
  return (
    <>
      <section className="card">
        <div className="eyebrow">Witness record</div>
        <h1>
          {st.evidenceId} <span className={`pill ${st.status}`}>{st.status === "signed" ? "Signed" : st.status === "draft" ? "Draft — not signed evidence" : "Abandoned"}</span>
        </h1>
        {st.status !== "signed" && <Notice kind="info">This record is not signed. It is shown for completeness only and must not be treated as a witness affirmation.</Notice>}
        <dl className="kv">
          <dt>Version</dt>
          <dd>
            {st.version}
            {d.versions.length > 1 && (
              <span className="muted small">
                {" "}
                · versions:{" "}
                {d.versions.map((v) => (
                  <span key={v.id}>
                    <Link to={`/admin/statements/${v.id}`}>{v.evidenceId}</Link> (v{v.version}, {v.status}){" "}
                  </span>
                ))}
              </span>
            )}
          </dd>
          <dt>Language</dt>
          <dd>{st.language}</dd>
          <dt>Draft created (UTC)</dt>
          <dd>{formatUtc(st.createdAt)}</dd>
          <dt>Finalized (UTC)</dt>
          <dd>{formatUtc(st.finalizedAt)}</dd>
          <dt>Frozen record SHA-256</dt>
          <dd className="mono">{st.frozenRecordSha256 ?? "—"}</dd>
          <dt>PDF SHA-256</dt>
          <dd className="mono">{st.pdfSha256 ?? "—"}</dd>
        </dl>
        <div className="actions">
          {pdf && (
            <>
              <button type="button" className="btn" onClick={() => link(pdf, true)}>
                Read signed PDF
              </button>
              <button type="button" className="btn secondary" onClick={() => link(pdf, false)}>
                Download PDF (print-ready)
              </button>
            </>
          )}
          <a className="btn secondary" href={`/api/admin/statements/${id}/bundle.zip`}>
            Download evidence bundle (ZIP)
          </a>
        </div>
        {playUrl && playUrl.type === "application/pdf" && <iframe title="Signed affirmation PDF" src={playUrl.url} style={{ width: "100%", height: 720, border: "1px solid var(--slate-300)", borderRadius: 6 }} />}
      </section>

      <section className="card">
        <h2>Authenticated account</h2>
        {d.account && (
          <dl className="kv">
            <dt>Provider</dt>
            <dd>{d.account.provider}</dd>
            <dt>Issuer</dt>
            <dd className="mono">{d.account.providerIssuer}</dd>
            <dt>Provider subject</dt>
            <dd className="mono">{d.account.providerSubject}</dd>
            <dt>Email claim</dt>
            <dd>
              {d.account.email ?? "—"} ({d.account.emailVerified ? "verified by provider" : "not marked verified"})
            </dd>
            <dt>Display name (provider)</dt>
            <dd>{d.account.displayName ?? "—"}</dd>
            <dt>Last sign-in (UTC)</dt>
            <dd>{formatUtc(d.account.lastLoginAt)}</dd>
          </dl>
        )}
        <p className="muted small">{en.pdf.authCaveat}</p>
      </section>

      {review && (
        <section className="card">
          <h2>Witness testimony (verbatim)</h2>
          <StatementReview r={review} t={en} />
        </section>
      )}

      <section className="card">
        <h2>Original media</h2>
        {d.media.length === 0 && <p className="muted">None.</p>}
        {d.media.map((m) => (
          <div key={m.id} className="review-section">
            <h3>
              {m.kind} <span className={`pill ${m.status}`}>{m.status}</span>
            </h3>
            <dl className="kv">
              <dt>Media ID</dt>
              <dd className="mono">{m.id}</dd>
              <dt>Source</dt>
              <dd>{m.sourceType}</dd>
              <dt>Original filename</dt>
              <dd>{m.originalFilename ?? "—"}</dd>
              <dt>Description</dt>
              <dd>{m.description ?? "—"}</dd>
              <dt>Detected type / size</dt>
              <dd>
                {m.detectedMime ?? "—"} · {formatBytes(m.sizeBytes)}
              </dd>
              <dt>Received (UTC)</dt>
              <dd>{formatUtc(m.receivedAt)}</dd>
              <dt>SHA-256</dt>
              <dd className="mono">{m.sha256 ?? "—"}</dd>
              <dt>Malware screening</dt>
              <dd>
                {m.scanStatus}
                {m.scanDetail ? ` — ${m.scanDetail}` : ""}
              </dd>
              <dt>Storage key</dt>
              <dd className="mono">{m.storageKey}</dd>
            </dl>
            {m.status === "complete" && (
              <div className="actions">
                {m.kind === "video" && (
                  <button type="button" className="btn" onClick={() => link(m, true)}>
                    Play original
                  </button>
                )}
                <button type="button" className="btn secondary" onClick={() => link(m, false)}>
                  Download original
                </button>
              </div>
            )}
          </div>
        ))}
        {playUrl && playUrl.type.startsWith("video/") && (
          <div className="video-frame" style={{ marginTop: 16 }}>
            <video src={playUrl.url} controls playsInline />
          </div>
        )}
        {playUrl && playUrl.type.startsWith("image/") && <img src={playUrl.url} alt="Original attachment" style={{ maxWidth: "100%" }} />}
      </section>

      {d.signature && (
        <section className="card">
          <h2>Signature record</h2>
          <div className="statute">{d.signature.affirmationText}</div>
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>Legal name</dt>
            <dd>{d.signature.legalName}</dd>
            <dt>Method</dt>
            <dd>
              {d.signature.method}
              {d.signature.typedValue ? ` — “${d.signature.typedValue}”` : ""}
            </dd>
            <dt>Signed (UTC)</dt>
            <dd>{formatUtc(d.signature.signedAt)}</dd>
            <dt>Signature image SHA-256</dt>
            <dd className="mono">{d.signature.imageSha256 ?? "—"}</dd>
            <dt>Record SHA-256</dt>
            <dd className="mono">{d.signature.recordSha256}</dd>
            <dt>Session</dt>
            <dd className="mono">{d.signature.sessionId}</dd>
            <dt>IP / user agent</dt>
            <dd className="small">
              {d.signature.ipAddress ?? "not collected"} · {d.signature.userAgent ?? "not collected"}
            </dd>
            <dt>E-sign consent</dt>
            <dd className="small">{d.signature.consentStatement}</dd>
          </dl>
        </section>
      )}

      <section className="card">
        <h2>Case owner annotations</h2>
        <p className="muted small">Annotations are stored separately from the witness's testimony, are append-only, and are included in exports clearly labelled as yours.</p>
        {d.annotations.map((n) => (
          <div key={n.id} className="notice">
            <div className="muted small">{formatUtc(n.createdAt)}</div>
            {n.body}
          </div>
        ))}
        <form onSubmit={addNote}>
          <Field id="note" label="New annotation">
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} />
          </Field>
          <button className="btn" type="submit" disabled={!note.trim()}>
            Add annotation
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Audit trail</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>When (UTC)</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Detail</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {d.audit.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td className="small">{formatUtc(e.occurredAt)}</td>
                  <td className="small">{e.actorType}</td>
                  <td className="small">{e.action}</td>
                  <td className="small mono">{JSON.stringify(e.detail)}</td>
                  <td className="small mono">{e.entryHash.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function AdminInvites() {
  const [list, setList] = useState<{ id: string; label: string; createdAt: string; revokedAt: string | null; openCount: number }[] | null>(null);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<{ invite: { url: string; qrDataUrl: string; label: string }; messages: { en: string; es: string } } | null>(null);
  const load = useCallback(async () => setList((await api<{ invites: typeof list }>("GET", "/api/admin/invites")).invites), []);
  useEffect(() => {
    void load();
  }, [load]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreated(await api("POST", "/api/admin/invites", { label }));
    setLabel("");
    await load();
  };
  const revoke = async (id: string) => {
    if (!window.confirm("Revoke this link? People who already opened it keep access for 30 days; new opens will fail.")) return;
    await api("POST", `/api/admin/invites/${id}/revoke`);
    await load();
  };
  const copy = (text: string) => navigator.clipboard?.writeText(text);
  return (
    <>
      <section className="card">
        <h1>Private submission links</h1>
        <p>Each link opens the landing page and unlocks the statement flow for that visitor. Links never expose any submitted evidence. Create one link per group or person so you can revoke it independently.</p>
        <form onSubmit={create} className="inline-fields">
          <Field id="inv-label" label="Label (e.g. Family, Neighbors 4th floor)" required>
            <input id="inv-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={100} />
          </Field>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn" type="submit">
              Create private link
            </button>
          </div>
        </form>
        {created && (
          <div className="notice ok" style={{ color: "inherit" }}>
            <h3>{created.invite.label}</h3>
            <p className="mono">{created.invite.url}</p>
            <div className="actions">
              <button type="button" className="btn secondary" onClick={() => copy(created.invite.url)}>
                Copy link
              </button>
              <a className="btn secondary" href={created.invite.qrDataUrl} download={`witness-record-${created.invite.label.replace(/\W+/g, "-")}.png`}>
                Download QR code
              </a>
            </div>
            <img className="qr" src={created.invite.qrDataUrl} alt={`QR code for ${created.invite.label}`} />
            <h3>Invitation message (send individually — never in bulk)</h3>
            <p className="muted small">The wording invites a firsthand factual account and makes clear there is no pressure to participate.</p>
            <pre className="log">{created.messages.en}</pre>
            <button type="button" className="btn secondary" onClick={() => copy(created.messages.en)}>
              Copy English message
            </button>
            <pre className="log" lang="es">{created.messages.es}</pre>
            <button type="button" className="btn secondary" onClick={() => copy(created.messages.es)}>
              Copiar mensaje en español
            </button>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Existing links</h2>
        {!list ? (
          <Spinner />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Created (UTC)</th>
                <th>Opens</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td>{i.label}</td>
                  <td className="small">{formatUtc(i.createdAt)}</td>
                  <td>{i.openCount}</td>
                  <td>{i.revokedAt ? <span className="pill">revoked</span> : <span className="pill signed">active</span>}</td>
                  <td>
                    {!i.revokedAt && (
                      <button type="button" className="btn danger" onClick={() => revoke(i.id)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export function AdminPrivacy() {
  const [list, setList] = useState<{ id: string; statementId: string | null; requestType: string; message: string; status: string; createdAt: string; resolutionNote: string | null; account: { provider: string; email: string | null; displayName: string | null } }[] | null>(null);
  const load = useCallback(async () => setList((await api<{ requests: typeof list }>("GET", "/api/admin/privacy-requests")).requests), []);
  useEffect(() => {
    void load();
  }, [load]);
  const update = async (id: string, status: string) => {
    const note = window.prompt("Resolution note (shown to the witness):") ?? "";
    await api("POST", `/api/admin/privacy-requests/${id}`, { status, resolutionNote: note });
    await load();
  };
  return (
    <section className="card">
      <h1>Privacy and correction requests</h1>
      <p className="muted small">Process: acknowledge within a reasonable time, review against the retention policy and any legal hold (docs/RETENTION.md), record the outcome here. Signed statements are never edited; corrections are new versions.</p>
      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="muted">No requests.</p>
      ) : (
        list.map((r) => (
          <div key={r.id} className="review-section">
            <h3>
              {r.requestType} <span className="pill">{r.status}</span>
            </h3>
            <p className="muted small">
              {formatUtc(r.createdAt)} · {r.account.email ?? r.account.displayName ?? r.account.provider}
              {r.statementId && (
                <>
                  {" "}
                  · <Link to={`/admin/statements/${r.statementId}`}>statement</Link>
                </>
              )}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>
            {r.resolutionNote && <p className="notice">{r.resolutionNote}</p>}
            <div className="actions">
              {["in_review", "resolved", "declined"].map((s) => (
                <button key={s} type="button" className="btn secondary" onClick={() => update(r.id, s)}>
                  Mark {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function AdminAudit() {
  const [events, setEvents] = useState<{ id: number; occurredAt: string; actorType: string; action: string; statementId: string | null; detail: Record<string, unknown>; entryHash: string }[] | null>(null);
  const [verify, setVerify] = useState<{ ok: boolean; count: number; brokenAtId: number | null } | null>(null);
  useEffect(() => {
    api<{ events: typeof events }>("GET", "/api/admin/audit?limit=300").then((r) => setEvents(r.events));
  }, []);
  return (
    <section className="card">
      <h1>Audit log</h1>
      <p className="muted small">Append-only and hash-chained: each entry's hash covers the previous entry. The database refuses updates and deletes. Verification recomputes every hash.</p>
      <div className="actions">
        <button type="button" className="btn" onClick={async () => setVerify(await api("POST", "/api/admin/audit/verify"))}>
          Verify chain
        </button>
        {verify && <Notice kind={verify.ok ? "ok" : "error"}>{verify.ok ? `Chain intact: ${verify.count} entries verified.` : `Chain BROKEN at entry ${verify.brokenAtId}.`}</Notice>}
      </div>
      {!events ? (
        <Spinner />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>When (UTC)</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Statement</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td className="small">{formatUtc(e.occurredAt)}</td>
                  <td className="small">{e.actorType}</td>
                  <td className="small">{e.action}</td>
                  <td className="small">{e.statementId ? <Link to={`/admin/statements/${e.statementId}`}>{e.statementId.slice(0, 8)}…</Link> : ""}</td>
                  <td className="small mono">{JSON.stringify(e.detail).slice(0, 160)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AdminReadiness() {
  const [r, setR] = useState<{ generatedAt: string; items: { key: string; label: string; status: string; detail: string; doc?: string }[]; warnings: string[] } | null>(null);
  useEffect(() => {
    api<typeof r>("GET", "/api/admin/readiness").then(setR);
  }, []);
  if (!r) return <Spinner />;
  const Wrap = ({ children }: { children: ReactNode }) => <section className="card">{children}</section>;
  return (
    <Wrap>
      <h1>Launch readiness</h1>
      <p className="muted small">Generated {formatUtc(r.generatedAt)}. READY means the system observed it working. NOT TESTED means it is configured but no real event has confirmed it yet. NOT CONFIGURED and FAILED need action before going live.</p>
      {r.warnings.map((w, i) => (
        <Notice key={i} kind="info">
          {w}
        </Notice>
      ))}
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Status</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((i) => (
            <tr key={i.key}>
              <td>
                {i.label}
                {i.doc && <div className="muted small">{i.doc}</div>}
              </td>
              <td>
                <span className={`pill ${i.status.replace(" ", ".")}`}>{i.status}</span>
              </td>
              <td className="small">{i.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}
