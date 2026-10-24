import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { labContent } from "../content";
import { SectionLabel } from "./primitives";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  const bare = word.replace(/[^A-Za-z]/g, "");
  const color = useTransform(progress, range, ["#f0ece4", /^(Lion|Ass|Bitch)$/.test(bare) ? "#d4a63a" : "#f0ece4"]);
  return (
    <span className="relative mr-[0.28em] inline-block">
      <motion.span style={{ opacity, color }}>{word}</motion.span>
    </span>
  );
}

/**
 * Pinned manifesto. The three-heads portrait sits behind the collective
 * definition (screen-blended so its black plate disappears) and drifts as
 * the words brighten. Reduced motion keeps the portrait still.
 */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.6"] });
  const { manifesto } = labContent;
  const words = manifesto.text.split(" ");
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["2%", "-3%"]);

  const copy = (
    <div className="mx-auto w-full max-w-5xl">
      <SectionLabel>{manifesto.label}</SectionLabel>
      <p className="lab-serif text-[clamp(1.45rem,3.6vw,3.15rem)] font-medium leading-[1.25]">
        {reduce
          ? manifesto.text
          : words.map((word, i) => {
              const start = i / words.length;
              const end = Math.min(1, start + 1.5 / words.length);
              return <Word key={`${word}-${i}`} word={word} progress={scrollYProgress} range={[start, end]} />;
            })}
      </p>
      <p className="lab-display mt-8 text-[clamp(0.85rem,1.6vw,1.15rem)] uppercase tracking-[0.22em] text-[var(--lab-gold)]">{manifesto.balance}</p>
    </div>
  );

  return (
    <section id="manifesto" ref={ref} className={`relative bg-[var(--lab-bg)] ${reduce ? "" : "h-[250vh]"}`}>
      <div className={`overflow-hidden bg-[var(--lab-bg)] ${reduce ? "relative py-28" : "sticky top-0 flex h-screen items-center"}`}>
        <motion.img
          src={manifesto.portrait.src}
          alt={reduce ? manifesto.portrait.alt : ""}
          aria-hidden={reduce ? undefined : true}
          decoding="async"
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_40%] mix-blend-screen"
          style={reduce ? undefined : { scale, y }}
        />
        <div className="lab-manifesto-scrim" aria-hidden="true" />
        <div className="lab-section relative">{copy}</div>
      </div>
    </section>
  );
}
