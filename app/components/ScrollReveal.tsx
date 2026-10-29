"use client";

import { useEffect, useRef } from "react";

// Fade-on-entry for scroll-revealed copy. Native scrolling only — this never
// touches scroll position or speed. Every line is in the HTML at load; the
// wrapper flags `data-js` on mount so the CSS only hides copy when JavaScript
// is actually there to reveal it again.
export default function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    host.dataset.js = "true";

    const targets = Array.from(host.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (targets.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      for (const target of targets) target.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.35 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
