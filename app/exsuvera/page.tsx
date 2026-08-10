import type { Metadata } from "next";
import Link from "next/link";
import { exsuvera } from "../content/canon";

export const metadata: Metadata = {
  title: "Exsuvera Studios",
  description:
    "Exsuvera is the parent studio behind Lion Ass Bitch — a creative laboratory building mythology-first brands, disciplines, and cinematic worlds.",
  alternates: { canonical: "/exsuvera" },
};

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
