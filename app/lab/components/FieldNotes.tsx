import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { labContent } from "../content";
import { SectionLabel, useMediaQuery } from "./primitives";

const { fieldNotes } = labContent;

function Creed({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="lab-eyebrow mb-4">{fieldNotes.creedLabel}</p>
      <ul className="grid gap-2">
        {fieldNotes.creed.map(line => (
          <li key={line} className="lab-display text-[clamp(1.15rem,2.4vw,1.8rem)] uppercase leading-tight">
            {line}
          </li>
        ))}
      </ul>
      <p className="lab-serif mt-5 text-lg italic text-[var(--lab-bone)]/75 md:text-xl">{fieldNotes.close}</p>
    </div>
  );
}

/**
 * The chalkboard, as a short pinned pan: the board scales down and drifts so
 * the three columns can be read, then the Exsuvera Creed fades in as type.
 * Reduced motion and phones show the board still, with the creed underneath.
 */
export function FieldNotes() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const pinned = isDesktop && !reduce;
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(p, [0, 1], [1.05, 1]);

  if (!pinned) {
    return (
      <section id="notes" ref={ref} className="lab-section bg-[var(--lab-bg)] py-20">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>{fieldNotes.label}</SectionLabel>
          <h2 className="lab-display mb-3 text-[clamp(2rem,5vw,3.4rem)] font-bold uppercase leading-[0.95]">{fieldNotes.heading}</h2>
          <p className="mb-8 max-w-md text-sm text-[var(--lab-muted)]">{fieldNotes.aside}</p>
          <img
            src={fieldNotes.image.src}
            width={1280} height={854}
            alt={fieldNotes.image.alt}
            decoding="async"
            loading="lazy"
            className="block w-full rounded-sm"
          />
          <Creed className="mt-10 max-w-xl" />
        </div>
      </section>
    );
  }

  return (
    <section id="notes" ref={ref} className="bg-[var(--lab-bg)]">
      <div className="relative h-[140vh]">
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-5 overflow-hidden bg-[var(--lab-bg)] pt-16">
          <p className="lab-eyebrow">{fieldNotes.label}</p>
          <motion.img
            src={fieldNotes.image.src}
            width={1280} height={854}
            alt={fieldNotes.image.alt}
            decoding="async"
            loading="lazy"
            className="w-[min(86vw,980px)]"
            style={{ scale }}
          />
        </div>
      </div>
      <Creed className="lab-section mx-auto max-w-3xl pb-20" />
    </section>
  );
}
