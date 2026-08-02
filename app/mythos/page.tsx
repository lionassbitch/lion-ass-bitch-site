import type { Metadata } from "next";
import Link from "next/link";
import { mythos } from "../content/canon";
import { dossiers } from "../content/characters";

export const metadata: Metadata = {
  title: "Mythos",
  description:
    "How a diss became dominion. The origin transmission of Lion Ass Bitch — the naming, the claiming, the bloodline, the gate, and the evidence.",
  alternates: { canonical: "/mythos" },
};

export default function MythosPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">The Mythos / Origin transmission</span>
        <h1>
          How a diss<br />
          became <i>dominion.</i>
        </h1>
        <p className="lede">
          Every institution has an origin story it would rather not tell. Ours starts with
          an insult and ends with a gate. Read it in five movements.
        </p>
      </header>

      <section className="section wrap">
        <div className="tenets">
          {mythos.map((chapter) => (
            <article className="tenet" key={chapter.index}>
              <span className="tenet__index">{chapter.index}</span>
              <div>
                <h2 className="tenet__law">{chapter.title}</h2>
                <div className="prose">
                  {chapter.body.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--edge wrap" aria-labelledby="bloodline-title">
        <p className="eyebrow">The three forces</p>
        <h2 id="bloodline-title" className="sectionTitle" style={{ marginBottom: "30px" }}>
          The bloodline
        </h2>
        <div className="cardGrid">
          {dossiers.map((dossier) => (
            <Link className="linkCard" href={`/dossiers/${dossier.slug}`} key={dossier.slug}>
              <span className="linkCard__index">
                {dossier.index} · {dossier.animal}
              </span>
              <span className="linkCard__title">{dossier.name}</span>
              <span className="linkCard__blurb">{dossier.domain}. {dossier.epithet}</span>
              <span className="linkCard__cta">
                Open dossier <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
