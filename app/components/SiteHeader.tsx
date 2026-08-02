"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { primaryNav, site } from "../lib/site";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile drawer whenever the route changes. Adjusting state during
  // render (rather than in an effect) avoids a cascading re-render.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Lock body scroll while the drawer is open; restore on close/unmount.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="siteHeader" data-open={open ? "true" : "false"}>
      <div className="siteHeader__bar">
        <Link className="siteHeader__mark" href="/" aria-label={`${site.name} — home`}>
          <span aria-hidden="true">{site.shortName}</span>
          <b>{site.name}</b>
        </Link>

        <nav className="siteHeader__nav" aria-label="Primary">
          {primaryNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="siteHeader__actions">
          <Link className="siteHeader__cart" href="/archive">
            Shop <span aria-hidden="true">→</span>
          </Link>
          <a
            className="siteHeader__cart siteHeader__cart--ext"
            href={site.shop.cartUrl}
          >
            Cart <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            className="siteHeader__toggle"
            aria-expanded={open}
            aria-controls="site-drawer"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="visually-hidden">
              {open ? "Close menu" : "Open menu"}
            </span>
            <span className="siteHeader__toggleBars" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="siteHeader__drawer" id="site-drawer" hidden={!open}>
        <nav aria-label="Full navigation">
          {primaryNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              <span>{link.label}</span>
              {link.note ? <small>{link.note}</small> : null}
            </Link>
          ))}
          <a href={site.shop.cartUrl}>
            <span>Shopify Cart</span>
            <small>Secure checkout ↗</small>
          </a>
        </nav>
      </div>
    </header>
  );
}
