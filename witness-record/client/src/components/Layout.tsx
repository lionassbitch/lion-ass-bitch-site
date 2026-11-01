import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useT } from "../lib/i18n";
import { useSession } from "../lib/session";

export function Layout() {
  const { t, lang, setLang } = useT();
  const { me, signOut } = useSession();
  const navigate = useNavigate();
  return (
    <>
      <a className="skip-link" href="#main">
        {t.app.skipToContent}
      </a>
      <header className="site-header">
        <div className="inner">
          <Link to="/" className="brand" aria-label={t.app.name}>
            <span className="name">{t.app.name}</span>
            <span className="sub">{t.app.subtitle}</span>
          </Link>
          <nav aria-label="Primary">
            {me && (
              <NavLink to="/my">{t.app.myRecords}</NavLink>
            )}
            {me?.session.isAdmin && <NavLink to="/admin">{t.app.admin}</NavLink>}
            {me && (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                {t.app.signOut}
              </button>
            )}
            <div className="lang-switch" role="group" aria-label={t.app.language}>
              <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en">
                English
              </button>
              <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")} lang="es">
                Español
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="inner">
          <p>{t.app.footer}</p>
          <p>
            <Link to="/protection">{t.protection.title}</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
