import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { exsuvera, exsuveraName, type RevealBeat } from "../content/canon";
import ScrollReveal from "../components/ScrollReveal";

export const metadata: Metadata = {
  title: "Exsuvera Studios",
  description:
    "Exsuvera is the parent studio behind Lion Ass Bitch — a creative laboratory building mythology-first brands, disciplines, and cinematic worlds.",
  alternates: { canonical: "/exsuvera" },
};

type Segment = { kind: "flow" | "stack"; beats: RevealBeat[] };

// Group the beats so the three syllables share one sticky container.
const revealSegments: Segment[] = exsuveraName.beats.reduce<Segment[]>((segments, beat) => {
  const kind: Segment["kind"] = beat.kind === "part" ? "stack" : "flow";
  const last = segments[segments.length - 1];
  if (last && last.kind === kind) last.beats.push(beat);
  else segments.push({ kind, beats: [beat] });
  return segments;
}, []);

function RevealBeatBlock({
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
    <div className={`exsuveraBeat exsuveraBeat--${beat.kind}`} style={style}>
      <div className="exsuveraBeat__copy" data-reveal>
        {isDisplay ? (
          <>
            <p className="exsuveraBeat__word">{lead}</p>
            {rest.map((line, index) => (
              <p className="exsuveraBeat__gloss" key={index}>
                {line}
              </p>
            ))}
          </>
        ) : (
          <p className="exsuveraBeat__line">
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

export default function ExsuveraPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">Exsuvera Studios / The parent house</span>
        <h1>
          The studio<br />
          that <i>sheds skin.</i>
        </h1>
        <p className="lede">{exsuvera.positioning}</p>
        <div className="masthead__meta">
          <span>{exsuvera.latin}</span>
        </div>
      </header>

      <ScrollReveal className="exsuveraReveal">
        <section id="the-word" className="exsuveraReveal__section" aria-labelledby="the-word-title">
          <h2 id="the-word-title" className="visually-hidden">
            Exsuvera — the coined word, taken apart
          </h2>
          {revealSegments.map((segment, index) =>
            segment.kind === "stack" ? (
              // Beats 3–5: each syllable pins as it arrives and stays while the
              // next one lands, then the whole stack releases into beat 6.
              <div className="exsuveraReveal__stack" key={`stack-${index}`}>
                {segment.beats.map((beat, stackIndex) => (
                  <RevealBeatBlock
                    beat={beat}
                    key={beat.index}
                    style={{ "--stack": stackIndex } as React.CSSProperties}
                  />
                ))}
              </div>
            ) : (
              segment.beats.map((beat) => (
                <Fragment key={beat.index}>
                  {beat.index === 2 ? (
                    // Sticky ENTER from beat 2 onward: anyone already sold can
                    // leave early. The reveal must never cost the click. Sits
                    // in flow (zero height) so it releases with the section.
                    <div className="exsuveraReveal__stickyCta">
                      <Link className="btn btn--ghost" href={exsuveraName.cta.href}>
                        Enter <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  ) : null}
                  <RevealBeatBlock beat={beat}>
                  {beat.kind === "close" ? (
                    <Link className="btn btn--solid exsuveraBeat__cta" href={exsuveraName.cta.href}>
                      {exsuveraName.cta.label} <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                  </RevealBeatBlock>
                </Fragment>
              ))
            ),
          )}
        </section>
      </ScrollReveal>

      <section className="section wrap">
        <p className="eyebrow">The method</p>
        <h2 className="sectionTitle" style={{ marginBottom: "30px" }}>
          How we build
        </h2>
        <div className="tenets">
          {exsuvera.pillars.map((pillar) => (
            <article className="tenet" key={pillar.index}>
              <span className="tenet__index">{pillar.index}</span>
              <div>
                <h3 className="tenet__law">{pillar.title}</h3>
                <p className="tenet__gloss">{pillar.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--edge wrap">
        <p className="eyebrow">The disciplines</p>
        <h2 className="sectionTitle" style={{ marginBottom: "30px" }}>
          From the forge
        </h2>
        <div className="cardGrid">
          {exsuvera.disciplines.map((discipline) => (
            <Link className="linkCard" href={discipline.href} key={discipline.href}>
              <span className="linkCard__index">Discipline</span>
              <span className="linkCard__title">{discipline.title}</span>
              <span className="linkCard__blurb">{discipline.blurb}</span>
              <span className="linkCard__cta">
                Enter <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
          <Link className="linkCard" href="/">
            <span className="linkCard__index">Flagship</span>
            <span className="linkCard__title">Lion Ass Bitch</span>
            <span className="linkCard__blurb">
              The mythological fashion house. Turned a diss into dominion.
            </span>
            <span className="linkCard__cta">
              Enter <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
