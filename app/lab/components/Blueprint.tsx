import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { labContent } from "../content";
import { Reveal, SectionLabel } from "./primitives";

function Step({ index, title, body, onActive }: { index: number; title: string; body: string; onActive: (i: number) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <li ref={ref} className="flex min-h-[70vh] flex-col justify-center border-l border-white/10 pl-8 md:pl-14">
      <Reveal>
        <p className="lab-display text-sm tracking-[0.3em] text-[#e2384f]">Step 0{index + 1}</p>
        <h3 className="lab-display mt-4 text-[clamp(2rem,4.5vw,3.6rem)] font-bold uppercase leading-none">{title}</h3>
        <p className="lab-serif mt-6 max-w-lg text-xl leading-relaxed text-[var(--lab-bone)]/75">{body}</p>
      </Reveal>
    </li>
  );
}

/**
 * Pinned left panel + scrolling steps. The shield crest and giant numeral on
 * the left swap/flare as each step crosses the middle of the viewport.
 */
export function Blueprint() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const { blueprint, sigils } = labContent;
  const onActive = useCallback((i: number) => setActive(i), []);

  return (
    <section id="blueprint" className="lab-section relative py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_1.2fr]">
        {/* Sticky creates a stacking context; the explicit background gives the shield's screen blend a backdrop. */}
        <div className="bg-[var(--lab-bg)] md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center">
          <SectionLabel crimson>{blueprint.label}</SectionLabel>
          <Reveal as="h2" className="lab-display text-[clamp(2rem,4.2vw,3.8rem)] font-bold uppercase leading-[0.98]">
            {blueprint.heading}
          </Reveal>
          <div className="relative mt-10 hidden h-64 items-center gap-6 md:flex" aria-hidden="true">
            {/* The crest flares red each time the active step changes */}
            <div className="relative h-64 w-64 flex-none">
              <motion.div
                key={`flare-${active}`}
                className="lab-shield-flare"
                initial={reduce ? false : { opacity: 1, scale: 1.1 }}
                animate={{ opacity: 0, scale: 1 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div
                key={`shield-${active}`}
                className="relative mix-blend-screen"
                initial={reduce ? false : { scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <img className="lab-shield" src={sigils.shield.src} alt="" decoding="async" loading="lazy" />
              </motion.div>
            </div>
            <div className="relative h-40 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={active}
                  className="lab-display absolute left-0 top-1/2 -translate-y-1/2 text-[8rem] font-black leading-none lab-gold-text"
                  initial={reduce ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -24 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  0{active + 1}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
        <ol className="grid">
          {blueprint.steps.map((step, i) => (
            <Step key={step.title} index={i} title={step.title} body={step.body} onActive={onActive} />
          ))}
        </ol>
      </div>
    </section>
  );
}
