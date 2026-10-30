import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import { useSession } from "../lib/session";
import { Notice, Spinner } from "../components/ui";

export function SignIn() {
  const { t, lang } = useT();
  const { config, me } = useSession();
  const [params] = useSearchParams();
  const error = params.get("error");
  const returnTo = params.get("returnTo") ?? "/statement";
  const navigate = useNavigate();
  useEffect(() => {
    if (me) navigate(returnTo, { replace: true });
  }, [me, navigate, returnTo]);
  const href = (p: "google" | "microsoft") => `/auth/${p}/start?returnTo=${encodeURIComponent(returnTo)}&lang=${lang}`;
  return (
    <section className="card">
      <h1>{t.auth.title}</h1>
      <p className="lede">{t.auth.intro}</p>
      {error && <Notice kind="error">{t.auth.failed}</Notice>}
      <div className="actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
        {config?.providers.google.configured ? (
          <a className="btn lg" href={href("google")}>
            {t.auth.google}
          </a>
        ) : (
          <button type="button" className="btn lg" disabled>
            {t.auth.google} — {t.auth.notConfigured}
          </button>
        )}
        {config?.providers.microsoft.configured ? (
          <a className="btn lg secondary" href={href("microsoft")}>
            {t.auth.microsoft}
          </a>
        ) : (
          <button type="button" className="btn lg secondary" disabled>
            {t.auth.microsoft} — {t.auth.notConfigured}
          </button>
        )}
        <p className="muted small">{t.auth.microsoftHint}</p>
      </div>
      <p className="muted small">{t.auth.scopes}</p>
      <p className="muted small">{t.auth.notIdVerification}</p>
      <p className="muted small">{t.auth.legalNameNote}</p>
      <p>
        <Link to="/protection">{t.protection.title}</Link>
      </p>
    </section>
  );
}

export function Invite() {
  const { token } = useParams();
  const { t } = useT();
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "bad">("working");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api("POST", "/api/invite/open", { token });
        await refresh();
        if (!cancelled) navigate("/", { replace: true });
      } catch {
        if (!cancelled) setState("bad");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, refresh]);
  return (
    <section className="card">
      <h1>{t.app.name}</h1>
      {state === "working" ? <Spinner /> : <Notice kind="error">{t.landing.inviteInvalid}</Notice>}
    </section>
  );
}
