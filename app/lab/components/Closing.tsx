import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { labContent } from "../content";
import { Reveal } from "./primitives";

export function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ["0vw", "0vw"] : ["10vw", "-16vw"]);
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [-4, -4] : [-8, 6]);
  const items = labContent.marquee.items;
  const row = (hidden: boolean) => (
    <div className="lab-marquee-track" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="lab-display flex items-center gap-12 whitespace-nowrap text-2xl uppercase tracking-[0.2em] md:text-4xl">
          {item}
          <span className="h-2 w-2 rotate-45 bg-[var(--lab-crimson)]" />
        </span>
      ))}
    </div>
  );
  return (
    <div ref={ref} className="relative overflow-hidden bg-[var(--lab-bg)] py-12 md:py-20">
      <motion.img
        src={labContent.plate.src}
        width={1200} height={600}
        alt={labContent.plate.alt}
        decoding="async"
        loading="lazy"
        className="lab-plate"
        style={{ x, rotate }}
      />
      <div className="lab-marquee" role="marquee">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export function Cta() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [0.92, 1, 1.04]);
  // The shield drifts up through the card slower than the page, and sharpens as the card centres.
  const shieldY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["18%", "-18%"]);
  const shieldOpacity = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [0.4, 0.4, 0.4] : [0.2, 0.45, 0.2]);
  const { cta, sigils } = labContent;

  return (
    <section id="contact" ref={ref} className="lab-section py-24 md:py-40">
      <motion.div
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border px-8 py-20 text-center md:px-20 md:py-32"
        style={{
          scale,
          borderColor: "rgba(200, 16, 46, 0.3)",
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(200,16,46,0.28), transparent 55%), radial-gradient(ellipse at 10% 0%, rgba(91,42,134,0.35), transparent 50%), #0c0b10",
        }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center mix-blend-screen"
          style={{ y: shieldY, opacity: shieldOpacity }}
        >
          <img className="h-[130%] w-auto max-w-none select-none" src={sigils.shield.src} alt="" decoding="async" loading="lazy" />
        </motion.div>
        <div className="relative">
          <Reveal as="h2" className="lab-display text-[clamp(2.4rem,7vw,6rem)] font-bold uppercase leading-[0.95]">
            {cta.heading}
          </Reveal>
          <Reveal as="p" delay={0.1} className="lab-serif mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-[var(--lab-bone)]/80 md:text-2xl">
            {cta.body}
          </Reveal>
          <Reveal delay={0.2} className="mt-12 flex flex-wrap justify-center gap-4">
            <a href={cta.primary.href} className="lab-btn lab-btn-primary">
              {cta.primary.label}
            </a>
            <a href={cta.secondary.href} className="lab-btn lab-btn-ghost">
              {cta.secondary.label}
            </a>
          </Reveal>
        </div>
      </motion.div>
    </section>
  );
}

export function Footer() {
  const { brand, footer, nav, sigils } = labContent;
  return (
    <footer className="lab-section border-t border-white/10 pb-10 pt-20">
      <div className="mx-auto grid max-w-7xl gap-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <img className="lab-sigil h-24 w-auto" src={sigils.monogram.src} alt={sigils.monogram.alt} decoding="async" loading="lazy" />
          <p className="lab-display mt-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--lab-steel)]">{brand.name}</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--lab-muted)]">{footer.blurb}</p>
        </div>

        <div>
          <p className="lab-eyebrow mb-5">Explore</p>
          <ul className="grid gap-3 text-sm text-[var(--lab-bone)]/80">
            {nav.links.map(l => (
              <li key={l.href}>
                <a href={l.href} className="transition-colors hover:text-[var(--lab-gold)]">
                  {l.label}
                </a>
              </li>
            ))}
            {footer.destinations.map(l => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="transition-colors hover:text-[var(--lab-gold)]"
                  {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href={nav.cta.href} className="transition-colors hover:text-[var(--lab-gold)]">
                {nav.cta.label}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="lab-eyebrow mb-5">Social</p>
          <ul className="grid gap-3 text-sm text-[var(--lab-bone)]/80">
            {footer.socials.map(s => (
              <li key={s.label}>
                <a
                  href={s.href}
                  className="group flex items-baseline gap-2 transition-colors hover:text-[var(--lab-gold)]"
                  {...(s.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {s.label}
                  <span className="text-xs text-[var(--lab-muted)] group-hover:text-[var(--lab-gold)]/70">{s.handle}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="lab-eyebrow mb-5">Contact</p>
          <ul className="grid gap-3 text-sm text-[var(--lab-bone)]/80">
            <li>
              <a href={footer.contact.href} className="transition-colors hover:text-[var(--lab-gold)]">
                {footer.contact.label}
              </a>
            </li>
            <li className="text-[var(--lab-muted)]">{footer.contact.note}</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-xs text-[var(--lab-muted)] md:flex-row md:items-center md:justify-between md:pr-24">
        <p>
          © {brand.year} {footer.legalName}. {brand.short} — {brand.tagline}
        </p>
        <div className="flex gap-6">
          {footer.legal.map(l => (
            <a key={l.label} href={l.href} className="transition-colors hover:text-[var(--lab-gold)]">
              {l.label}
            </a>
          ))}
          <a href="#top" className="transition-colors hover:text-[var(--lab-gold)]">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
