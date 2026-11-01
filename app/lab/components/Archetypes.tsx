import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { labContent, type ArchetypeContent } from "../content";
import { ArtTile, Reveal, SectionLabel, useMediaQuery } from "./primitives";

const { archetypes, sigils } = labContent;
type Key = ArchetypeContent["key"];
const KEYS: Key[] = ["pryde", "kickz", "khemetz"];

function ArchetypeCard({ item }: { item: ArchetypeContent }) {
  return (
    <article
      className="grid overflow-hidden rounded-3xl border bg-[var(--lab-bg-2)] md:grid-cols-[1fr_1.1fr]"
      style={{ ["--accent" as string]: item.accent, borderColor: "rgba(200, 16, 46, 0.22)" }}
    >
      <ArtTile
        variant={item.art}
        image={item.image}
        label={`${item.name} — ${item.animal} medallion`}
        className="lab-art-medallion min-h-[260px] md:min-h-[460px]"
      >
        <span
          aria-hidden="true"
          className="lab-display absolute bottom-[-0.12em] right-[0.02em] text-[clamp(8rem,22vw,16rem)] font-black leading-none text-white/[0.07]"
        >
          {item.letter}
        </span>
        <span className="lab-eyebrow absolute left-6 top-6 !text-[var(--lab-bone)]/70">{item.animal}</span>
      </ArtTile>
      <div className="flex flex-col justify-between gap-8 p-7 md:p-10">
        <div>
          <p className="lab-display text-sm tracking-[0.3em] text-[var(--accent)]">
            {item.numeral}
            <span className="ml-3 tracking-[0.22em]">{item.force}</span>
          </p>
          <h3 className="lab-display mt-3 text-[clamp(2rem,3.4vw,3.2rem)] font-bold uppercase leading-none">{item.name}</h3>
          <p className="lab-serif mt-2 text-xl italic text-[var(--lab-bone)]/70 md:text-2xl">{item.title}</p>
          <blockquote className="lab-serif mt-4 text-lg leading-snug text-[var(--lab-bone)]/85">“{item.quote}”</blockquote>
        </div>
        <dl className="grid gap-4 text-sm leading-relaxed text-[var(--lab-bone)]/80">
          {[
            ["Definition", item.definition],
            ["Shadow", item.shadow],
            ["Function", item.role],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7rem_1fr] gap-3 border-t border-white/10 pt-4">
              <dt className="lab-eyebrow !tracking-[0.14em] !text-[var(--accent)]">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {item.note ? <p className="text-xs uppercase tracking-[0.16em] text-[var(--lab-muted)]">{item.note}</p> : null}
      </div>
    </article>
  );
}

type Level = MotionValue<number> | number;

/**
 * The red triad sigil. A dimmed base copy sits underneath; per medallion a
 * brightened copy masked to that medallion (plus a red bloom) fades in as the
 * matching archetype arrives, and the triquetra core lights once all three are awake.
 */
function TriadSigil({ lit, core, pulse, scale }: { lit: Record<Key, Level>; core: Level; pulse: boolean; scale?: MotionValue<number> }) {
  // Blend and transform live on the same root: any transformed/faded ancestor would isolate the blend and paint the black plate.
  return (
    <motion.div className="lab-triad mix-blend-screen" style={{ scale }}>
      <img className="lab-triad-base" src={sigils.triad.src} alt={sigils.triad.alt} decoding="async" loading="lazy" />
      {KEYS.map(key => {
        const m = archetypes.medallions[key];
        const vars = { ["--mx" as string]: `${m.x}%`, ["--my" as string]: `${m.y}%` };
        // Blend lives on the animated wrapper: an opacity'd wrapper isolates its children, so a blend on the img would paint the black plate.
        return (
          <motion.div key={key} className="absolute inset-0 mix-blend-screen" style={{ ...vars, opacity: lit[key] }} aria-hidden="true">
            <img className="lab-triad-lit absolute inset-0 h-full w-full object-contain" src={sigils.triad.src} alt="" decoding="async" loading="lazy" />
            <div className="lab-triad-bloom" />
          </motion.div>
        );
      })}
      <motion.div className="absolute inset-0 mix-blend-screen" style={{ opacity: core }} aria-hidden="true">
        <img
          className={`lab-triad-core absolute inset-0 h-full w-full object-contain ${pulse ? "lab-triad-pulse" : ""}`}
          src={sigils.triad.src}
          alt=""
          decoding="async"
          loading="lazy"
        />
      </motion.div>
    </motion.div>
  );
}

/**
 * The three forces. On desktop the section is 320vh tall: the sigil pins on the left
 * while the three cards track horizontally on the right, and each medallion
 * ignites as its archetype slides into view. On small screens or with reduced
 * motion it degrades to the fully lit sigil above a vertical stack.
 */
export function Archetypes() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const [maxShift, setMaxShift] = useState(0);
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const pinned = isDesktop && !reduce;

  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(p, [0, 1], [0, -maxShift]);
  const sigilScale = useTransform(p, [0, 1], [1.06, 0.98]);

  // Each medallion lights as its card arrives and stays lit; the core follows the last one.
  const lit: Record<Key, Level> = {
    pryde: useTransform(p, [0, 0.14], [0, 1]),
    kickz: useTransform(p, [0.34, 0.5], [0, 1]),
    khemetz: useTransform(p, [0.68, 0.84], [0, 1]),
  };
  const core = useTransform(p, [0.84, 0.98], [0, 1]);

  useEffect(() => {
    if (!pinned || !trackRef.current || !laneRef.current) return;
    const track = trackRef.current;
    const lane = laneRef.current;
    const measure = () => setMaxShift(Math.max(0, track.scrollWidth - lane.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    ro.observe(lane);
    return () => ro.disconnect();
  }, [pinned]);

  const heading = (
    <>
      <SectionLabel crimson>{archetypes.label}</SectionLabel>
      <h2 className="lab-display text-[clamp(2rem,3.4vw,3.4rem)] font-bold uppercase leading-[0.95]">{archetypes.heading}</h2>
    </>
  );

  if (!pinned) {
    const full = { pryde: 1, kickz: 1, khemetz: 1 };
    return (
      <section id="pride" ref={ref} className="lab-section py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            {heading}
            <Reveal as="p" delay={0.15} className="lab-serif mt-6 max-w-md text-xl leading-relaxed text-[var(--lab-bone)]/75">
              {archetypes.intro}
            </Reveal>
          </div>
          <div className="mx-auto mb-14 w-full max-w-[420px]">
            <TriadSigil lit={full} core={1} pulse={!reduce} />
          </div>
          <div className="grid gap-8">
            {archetypes.items.map((item, i) => (
              <Reveal key={item.key} delay={i * 0.05}>
                <ArchetypeCard item={item} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pride" ref={ref} className="relative h-[320vh]">
      {/* Sticky creates a stacking context; the explicit background gives the sigil's screen blend a backdrop. */}
      <div className="sticky top-0 grid h-screen grid-cols-[minmax(0,38fr)_minmax(0,62fr)] items-center overflow-hidden bg-[var(--lab-bg)]">
        <div className="lab-section flex h-full flex-col justify-center gap-4 !pr-0 pb-6 pt-24">
          <div>{heading}</div>
          <div className="w-full max-w-[min(28vw,440px)] self-center">
            <TriadSigil lit={lit} core={core} pulse={false} scale={sigilScale} />
          </div>
          <p className="lab-serif max-w-sm text-base leading-relaxed text-[var(--lab-bone)]/70 lg:text-lg">{archetypes.intro}</p>
        </div>
        <div ref={laneRef} className="h-full overflow-hidden">
          <motion.div ref={trackRef} className="lab-strip-track h-full items-center" style={{ x }}>
            {archetypes.items.map(item => (
              <div key={item.key} className="lab-strip-panel">
                <ArchetypeCard item={item} />
              </div>
            ))}
            <div aria-hidden="true" className="w-[2vw] flex-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
