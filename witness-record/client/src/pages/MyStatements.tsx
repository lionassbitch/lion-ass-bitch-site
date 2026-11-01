import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, ApiError, formatUtc, type Statement } from "../lib/api";
import { useT } from "../lib/i18n";
import { Field, Notice, Spinner } from "../components/ui";

interface PrivacyRequest {
  id: string;
  requestType: string;
  message: string;
  status: string;
  createdAt: string;
  resolutionNote: string | null;
}

export function MyStatements() {
  const { t } = useT();
  const navigate = useNavigate();
  const [items, setItems] = useState<Statement[] | null>(null);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reqType, setReqType] = useState("correction");
  const [reqMsg, setReqMsg] = useState("");
  const [reqStatement, setReqStatement] = useState<string>("");
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ statements: Statement[] }>("GET", "/api/statements");
      setItems(r.statements);
      const p = await api<{ requests: PrivacyRequest[] }>("GET", "/api/privacy-requests");
      setRequests(p.requests);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) navigate("/sign-in?returnTo=/my");
      else setError(t.app.errorGeneric);
    }
  }, [navigate, t]);
  useEffect(() => {
    void load();
  }, [load]);

  const correct = async (id: string) => {
    setBusy(true);
    try {
      const r = await api<{ statement: Statement }>("POST", `/api/statements/${id}/corrections`);
      navigate(`/statement/consent?id=${r.statement.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.app.errorGeneric);
    } finally {
      setBusy(false);
    }
  };
  const discard = async (id: string) => {
    if (!window.confirm(t.my.discardDraft + "?")) return;
    setBusy(true);
    try {
      await api("POST", `/api/statements/${id}/abandon`);
      await load();
    } finally {
      setBusy(false);
    }
  };
  const download = async (id: string) => {
    const r = await api<{ url: string }>("GET", `/api/statements/${id}/pdf`);
    window.location.href = r.url;
  };
  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("POST", "/api/privacy-requests", { statementId: reqStatement || null, requestType: reqType, message: reqMsg });
      setSent(true);
      setReqMsg("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.app.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  if (!items) return <Spinner />;
  const hasDraft = items.some((s) => s.status === "draft");
  return (
    <>
      <section className="card">
        <h1>{t.my.title}</h1>
        <p className="lede">{t.my.intro}</p>
        {error && <Notice kind="error">{error}</Notice>}
        {items.length === 0 && <p>{t.my.none}</p>}
        {items
          .filter((s) => s.status !== "abandoned")
          .map((s) => (
            <div key={s.id} className="review-section">
              <h3>
                <span>
                  {s.evidenceId} <span className={`pill ${s.status}`}>{t.my.status[s.status]}</span>
                </span>
                <span className="muted small">
                  {t.my.version} {s.version}
                </span>
              </h3>
              <dl className="kv">
                <dt>{t.receipt.signedAt}</dt>
                <dd>{formatUtc(s.finalizedAt)}</dd>
                {s.frozenRecordSha256 && (
                  <>
                    <dt>{t.receipt.digest}</dt>
                    <dd className="mono">{s.frozenRecordSha256}</dd>
                  </>
                )}
              </dl>
              {s.supersededByLater && <p className="muted small">{t.my.supersededBy}</p>}
              <div className="actions">
                {s.status === "draft" && (
                  <>
                    <Link className="btn" to={`/statement/consent?id=${s.id}`}>
                      {t.my.resume}
                    </Link>
                    <button type="button" className="btn danger" onClick={() => discard(s.id)} disabled={busy}>
                      {t.my.discardDraft}
                    </button>
                  </>
                )}
                {s.status === "signed" && (
                  <>
                    <button type="button" className="btn" onClick={() => download(s.id)}>
                      {t.receipt.download}
                    </button>
                    <Link className="btn secondary" to={`/receipt/${s.id}`}>
                      {t.receipt.title}
                    </Link>
                    {!s.supersededByLater && !hasDraft && (
                      <button type="button" className="btn secondary" onClick={() => correct(s.id)} disabled={busy} title={t.my.correctHelp}>
                        {t.my.correct}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        {!hasDraft && (
          <div className="actions">
            <Link className="btn gold" to="/statement">
              {t.my.start}
            </Link>
          </div>
        )}
      </section>
      <section className="card subtle">
        <h2>{t.my.privacy}</h2>
        <p>{t.my.privacyIntro}</p>
        {sent && <Notice kind="ok">{t.my.sent}</Notice>}
        <form onSubmit={sendRequest}>
          <Field id="req-type" label={t.my.privacy} required>
            <select id="req-type" value={reqType} onChange={(e) => setReqType(e.target.value)}>
              {Object.entries(t.my.requestType).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field id="req-st" label={t.receipt.evidenceId}>
            <select id="req-st" value={reqStatement} onChange={(e) => setReqStatement(e.target.value)}>
              <option value="">—</option>
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.evidenceId}
                </option>
              ))}
            </select>
          </Field>
          <Field id="req-msg" label={t.my.privacy} required>
            <textarea id="req-msg" value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} required maxLength={5000} />
          </Field>
          <button className="btn" type="submit" disabled={busy || !reqMsg.trim()}>
            {t.my.send}
          </button>
        </form>
        {requests.length > 0 && (
          <div className="review-section">
            <h3>{t.my.requests}</h3>
            <ul>
              {requests.map((r) => (
                <li key={r.id}>
                  <strong>{t.my.requestType[r.requestType as keyof typeof t.my.requestType]}</strong> — {formatUtc(r.createdAt)} — <span className="pill">{r.status}</span>
                  {r.resolutionNote && <div className="muted small">{r.resolutionNote}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
