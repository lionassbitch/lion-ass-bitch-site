import { useEffect, useRef, useState, type MouseEvent } from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { labContent } from "../content";

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const { scrollY, scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const bg = useTransform(scrollY, [0, 160], ["rgba(10,10,15,0.86)", "rgba(10,10,15,0.96)"]);
  const border = useTransform(scrollY, [0, 160], ["rgba(201,162,39,0.12)", "rgba(201,162,39,0.3)"]);
  const { brand, nav, sigils } = labContent;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [menuOpen]);

  function followLink(event: MouseEvent<HTMLAnchorElement>) {
    setMenuOpen(false);
    const href = event.currentTarget.getAttribute("href");
    if (!href?.startsWith("#") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = document.getElementById(href.slice(1));
    if (!destination) return;
    // Keep keyboard reading order at the selected section after the menu closes.
    const hadTabIndex = destination.hasAttribute("tabindex");
    if (!hadTabIndex) destination.setAttribute("tabindex", "-1");
    requestAnimationFrame(() => {
      destination.focus({ preventScroll: true });
      if (!hadTabIndex) {
        destination.addEventListener("blur", () => destination.removeAttribute("tabindex"), { once: true });
      }
    });
  }

  return (
    <motion.header
      ref={header}
      className="lab-header fixed inset-x-0 top-0 z-50 backdrop-blur-md"
      style={{ backgroundColor: menuOpen ? "#0A0A0F" : bg, borderBottom: "1px solid", borderColor: border }}
    >
      <nav className="lab-section lab-nav" aria-label="Primary">
        <a href="#top" className="lab-nav-brand" aria-label={`${brand.name} — back to top`} onClick={followLink}>
          <img className="lab-logo" src={sigils.monogramAlpha.src} alt="" decoding="async" />
          <span className="lab-display lab-nav-name">{brand.name}</span>
        </a>
        <ul className="lab-nav-links">
          {nav.links.map(link => (
            <li key={link.href}>
              <a href={link.href} onClick={followLink}>{link.label}</a>
            </li>
          ))}
        </ul>
        <div className="lab-nav-actions">
          <a href={nav.cta.href} className="lab-btn lab-btn-primary lab-nav-cta" onClick={followLink}>
            {nav.cta.label}
          </a>
          <button
            ref={menuButton}
            type="button"
            className="lab-menu-toggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="lab-mobile-navigation"
            onClick={() => setMenuOpen(open => !open)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
        <ul id="lab-mobile-navigation" className="lab-mobile-nav" hidden={!menuOpen}>
          {nav.links.map(link => (
            <li key={link.href}>
              <a href={link.href} onClick={followLink}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <motion.div
        aria-hidden="true"
        className="h-px origin-left bg-[var(--lab-gold)]"
        style={{ scaleX: reduce ? scrollYProgress : progress }}
      />
    </motion.header>
  );
}

/**
 * Fixed scroll dial (desktop): the circular seal makes one full revolution
 * across the page while a crimson ring fills with progress. With reduced
 * motion the seal holds still and only the ring reports progress.
 */
export function ScrollDial() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.5 });
  const source = reduce ? scrollYProgress : progress;
  const rotate = useTransform(source, [0, 1], [0, reduce ? 0 : 360]);
  const ring = useMotionTemplate`${source}`;
  const { sigils } = labContent;

  return (
    <div className="lab-dial hidden md:grid" aria-hidden="true">
      <motion.div className="lab-dial-ring" style={{ ["--p" as string]: ring }} />
      <motion.img src={sigils.sealAlpha.src} alt="" decoding="async" loading="lazy" style={{ rotate }} />
    </div>
  );
}
