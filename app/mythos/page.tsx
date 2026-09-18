import type { Metadata } from "next";
import Link from "next/link";
import { mythos, theName, lionAssBitchName } from "../content/canon";
import WordReveal from "../components/WordReveal";
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

      <WordReveal
        id="the-name-reveal"
        title="Lion Ass Bitch — the name, assembled"
        beats={lionAssBitchName.beats}
        cta={lionAssBitchName.cta}
        enterLabel="Archive"
      />

      <section className="section section--edge wrap theName" id="the-name" aria-labelledby="the-name-title">
        <p className="eyebrow">The Name / {theName.kicker}</p>
        <h2 id="the-name-title" className="sectionTitle theName__title">
          Lion Ass Bitch.
        </h2>
        <div className="prose theName__intro">
          {theName.whatItIs.slice(1).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <div className="nameGrid" role="list">
          {theName.words.map((word) => (
            <article className="nameCard" key={word.word} role="listitem">
              <span className="nameCard__index">{word.index}</span>
              <h3 className="nameCard__word">{word.word}</h3>
              <p className="nameCard__domain">{word.domain}</p>
              <div className="nameCard__body">
                {word.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <Link className="nameCard__archetype" href={`/dossiers/${word.archetype.slug}`}>
                In our world, that&apos;s <b>{word.archetype.name}</b>{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>

        <div className="nameColumns">
          <div>
            <h3 className="nameColumns__head">Why it is</h3>
            <div className="prose">
              {theName.whyItIs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div>
            <h3 className="nameColumns__head">How it arose</h3>
            <div className="prose">
              {theName.howItArose.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        <blockquote className="nameQuote">
          <p>&ldquo;{theName.quote.text}&rdquo;</p>
          <footer>— {theName.quote.attribution}</footer>
        </blockquote>
        <p className="nameSignOff">{theName.signOff}</p>
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
