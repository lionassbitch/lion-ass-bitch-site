import { Link, useNavigate } from "react-router";
import { useT } from "../lib/i18n";
import { useSession } from "../lib/session";
import { Notice } from "../components/ui";

export function Landing() {
  const { t, lang } = useT();
  const { me, config } = useSession();
  const navigate = useNavigate();
  const inviteOk = !config?.inviteRequired || config?.inviteValid || me?.session.isAdmin;
  return (
    <>
      <section className="card">
        <div className="eyebrow">{t.app.tagline}</div>
        <h1>{t.app.name}</h1>
        <p className="lede">{t.app.subtitle}</p>
        <blockquote className="quote">{t.landing.quote}</blockquote>
        <p>{t.landing.body}</p>
        {!inviteOk && <Notice kind="info">{t.landing.inviteRequired}</Notice>}
        <div className="actions">
          <button
            type="button"
            className="btn gold lg"
            disabled={!inviteOk}
            onClick={() => navigate(me ? "/statement" : `/sign-in?lang=${lang}`)}
          >
            {t.landing.primaryCta}
          </button>
          <Link className="btn secondary lg" to="/protection">
            {t.landing.secondaryCta}
          </Link>
        </div>
      </section>
      <section className="card subtle">
        <h2>{t.landing.whatToExpect}</h2>
        <ol className="steps-list">
          {t.landing.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <p className="muted small">{t.landing.timeEstimate}</p>
      </section>
    </>
  );
}

export function Protection() {
  const { t } = useT();
  const { config } = useSession();
  return (
    <section className="card">
      <h1>{t.protection.title}</h1>
      <p className="lede">{t.protection.intro}</p>
      {t.protection.items.map((it, i) => (
        <div key={i} className="review-section">
          <h3>{it.h}</h3>
          <p>{it.p}</p>
          {i === 4 && config && (
            <p className="muted small">
              {t.consent.collectedItems[4]} — IP: {config.metadata.ipAddress ? "on" : "off"}; user agent: {config.metadata.userAgent ? "on" : "off"}.
            </p>
          )}
        </div>
      ))}
      <div className="actions">
        <Link className="btn" to="/">
          {t.app.back}
        </Link>
      </div>
    </section>
  );
}

export function NotFound() {
  const { t } = useT();
  return (
    <section className="card">
      <h1>404</h1>
      <p>{t.app.notFound}</p>
      <Link className="btn" to="/">
        {t.app.goHome}
      </Link>
    </section>
  );
}
