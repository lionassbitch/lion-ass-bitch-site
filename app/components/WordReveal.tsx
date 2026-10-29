import { Fragment } from "react";
import Link from "next/link";
import type { RevealBeat } from "../content/canon";
import ScrollReveal from "./ScrollReveal";

// A name assembling itself as the visitor descends. One beat per viewport.
// Beats of kind "part" share one sticky stack: the first syllable pins and
// holds while the next lands beneath it, then the stack releases into the
// closed-up word. Native scrolling only; every line is in the HTML at load.

type Segment = { kind: "flow" | "stack"; beats: RevealBeat[] };

function segment(beats: RevealBeat[]): Segment[] {
  return beats.reduce<Segment[]>((segments, beat) => {
    const kind: Segment["kind"] = beat.kind === "part" ? "stack" : "flow";
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) last.beats.push(beat);
    else segments.push({ kind, beats: [beat] });
    return segments;
  }, []);
}

function Beat({
  beat,
  style,
  children,
}: {
  beat: RevealBeat;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const [lead, ...rest] = beat.lines;
  const isDisplay = beat.kind === "part" || beat.kind === "word" || beat.kind === "payoff";
  return (
    <div className={`revealBeat revealBeat--${beat.kind}`} style={style}>
      <div className="revealBeat__copy" data-reveal>
        {isDisplay ? (
          <>
            <p className="revealBeat__word">{lead}</p>
            {rest.map((line, index) => (
              <p className="revealBeat__gloss" key={index}>
                {line}
              </p>
            ))}
          </>
        ) : (
          <p className="revealBeat__line">
            {beat.lines.map((line, index) => (
              <span key={index}>
                {line}
                {index < beat.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export default function WordReveal({
  id,
  title,
  beats,
  cta,
  enterLabel = "Enter",
}: {
  id: string;
  title: string;
  beats: RevealBeat[];
  cta: { label: string; href: string };
  enterLabel?: string;
}) {
  return (
    <ScrollReveal className="wordReveal">
      <section id={id} className="wordReveal__section" aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`} className="visually-hidden">
          {title}
        </h2>
        {segment(beats).map((group, index) =>
          group.kind === "stack" ? (
            <div className="wordReveal__stack" key={`stack-${index}`}>
              {group.beats.map((beat, stackIndex) => (
                <Beat
                  beat={beat}
                  key={beat.index}
                  style={{ "--stack": stackIndex } as React.CSSProperties}
                />
              ))}
            </div>
          ) : (
            group.beats.map((beat) => (
              <Fragment key={beat.index}>
                {beat.index === 2 ? (
                  // Sticky exit from beat 2 onward: anyone already sold can
                  // leave early. The reveal must never cost the click. Sits
                  // in flow (zero height) so it releases with the section.
                  <div className="wordReveal__stickyCta">
                    <Link className="btn btn--ghost" href={cta.href}>
                      {enterLabel} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ) : null}
                <Beat beat={beat}>
                  {beat.kind === "close" ? (
                    <Link className="btn btn--solid revealBeat__cta" href={cta.href}>
                      {cta.label} <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                </Beat>
              </Fragment>
            ))
          ),
        )}
      </section>
    </ScrollReveal>
  );
}
