import { labContent } from "../content";
import { Reveal, SectionLabel } from "./primitives";

const { about, founder } = labContent;

/** House about and the founder's letter. Copy follows the published canon. */
export function About() {
  return (
    <section className="lab-section py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div id="about">
          <SectionLabel>{about.label}</SectionLabel>
          <Reveal as="h2" className="lab-display max-w-xl text-[clamp(2.2rem,5vw,4.2rem)] font-bold uppercase leading-[0.95]">
            {about.heading}
          </Reveal>
          <Reveal as="p" delay={0.06} className="lab-serif mt-8 max-w-xl text-xl leading-relaxed text-[var(--lab-bone)]/85 md:text-2xl">
            {about.lede}
          </Reveal>
          {about.paragraphs.map((paragraph, index) => (
            <Reveal key={paragraph} as="p" delay={0.1 + index * 0.04} className="mt-5 max-w-xl text-base leading-relaxed text-[var(--lab-muted)]">
              {paragraph}
            </Reveal>
          ))}
        </div>

        <figure id="founder" className="border-t border-[var(--lab-gold)] pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <SectionLabel>{founder.label}</SectionLabel>
          <Reveal as="h2" className="lab-display max-w-xl text-[clamp(2rem,4vw,3.4rem)] font-bold uppercase leading-[0.95]">
            {founder.heading}
          </Reveal>
          <blockquote className="mt-8 max-w-xl">
            {founder.message.map(paragraph => (
              <p key={paragraph} className="lab-serif mt-5 text-lg leading-relaxed text-[var(--lab-bone)]/85 first:mt-0 md:text-xl">
                {paragraph}
              </p>
            ))}
          </blockquote>
          <figcaption className="mt-8">
            <p className="lab-display text-sm tracking-[0.22em] text-[var(--lab-gold)]">{founder.signature}</p>
            <p className="mt-2 text-sm text-[var(--lab-muted)]">
              {founder.role}
              <span className="mx-2 text-[var(--lab-gold)]">·</span>
              {founder.location}
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
