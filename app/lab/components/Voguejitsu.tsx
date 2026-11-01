import { labContent } from "../content";
import { Reveal, SectionLabel } from "./primitives";

/** The live /voguejitsu page, set in the same type as the rest of the scroll. */
export function Voguejitsu() {
  const { voguejitsu } = labContent;

  return (
    <section id="voguejitsu" className="lab-section py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionLabel>{voguejitsu.label}</SectionLabel>
        <Reveal as="h2" className="lab-display max-w-4xl text-[clamp(2.2rem,5vw,4.5rem)] font-bold uppercase leading-[0.95]">
          {voguejitsu.heading}
        </Reveal>
        <Reveal as="p" delay={0.08} className="lab-serif mt-8 max-w-2xl text-xl leading-relaxed text-[var(--lab-bone)]/80 md:text-2xl">
          {voguejitsu.lede}
        </Reveal>
        <Reveal as="p" delay={0.12} className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--lab-muted)]">
          {voguejitsu.body}
        </Reveal>
        <Reveal as="p" delay={0.16} className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--lab-bone)]/70">
          {voguejitsu.houses}
        </Reveal>

        <ol className="mt-16 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {voguejitsu.principles.map((principle, index) => (
            <li key={principle.title} className="border-t border-white/10 pt-6">
              <p className="lab-display text-xs tracking-[0.28em] text-[#e2384f]">0{index + 1}</p>
              <h3 className="lab-display mt-3 text-2xl font-bold uppercase leading-none">{principle.title}</h3>
              <p className="lab-serif mt-3 max-w-md text-lg leading-relaxed text-[var(--lab-bone)]/75">{principle.body}</p>
            </li>
          ))}
        </ol>

        <figure className="mt-16 max-w-3xl border-l border-[var(--lab-crimson)] pl-6 md:pl-8">
          <figcaption className="lab-eyebrow mb-5">{voguejitsu.oathLabel}</figcaption>
          <blockquote className="lab-serif text-xl leading-relaxed text-[var(--lab-bone)]/85 md:text-2xl">
            {voguejitsu.oath.map(line => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </blockquote>
        </figure>
      </div>
    </section>
  );
}
