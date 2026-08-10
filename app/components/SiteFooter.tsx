import Link from "next/link";
import { site, siteIndex } from "../lib/site";

export default function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="siteFooter__lead">
        <Link className="siteFooter__mark" href="/" aria-label={`${site.name} — home`}>
          <span aria-hidden="true">{site.shortName}</span>
          <b>{site.name}</b>
        </Link>
        <p>{site.tagline}</p>
        <p className="siteFooter__creed">{site.creed}</p>
      </div>

      <nav className="siteFooter__index" aria-label="Site index">
        {siteIndex.map((section) => (
          <div key={section.group}>
            <h2>{section.group}</h2>
            <ul>
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2>Connect</h2>
          <ul>
            <li>
              <a href={site.social.instagram}>Instagram ↗</a>
            </li>
            <li>
              <a href={site.shop.cartUrl}>Shopify Cart ↗</a>
            </li>
            <li>
              <Link href="/contact">Contact &amp; Support</Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="siteFooter__base">
        <small>
          © {new Date().getFullYear()} {site.legalName}. {site.founded}.
        </small>
        <small>Made to order · Shipped worldwide · Designed in the LAB.</small>
      </div>
    </footer>
  );
}
