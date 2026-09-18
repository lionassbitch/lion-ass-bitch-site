import Link from "next/link";
import { theName, lionAssBitchName } from "../content/canon";
import WordReveal from "./WordReveal";

// THE NAME — what it is, why it is, how it arose. Opens with the crown phrase
// assembling on scroll, then the full record. Shared by /mythos and the
// Exsuvera Presents gate. `archetypeBase` lets the gate link dossiers on the
// flagship domain instead of relatively.
export default function TheName({ archetypeBase = "" }: { archetypeBase?: string }) {
  return (
    <>
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
              <Link className="nameCard__archetype" href={`${archetypeBase}/dossiers/${word.archetype.slug}`}>
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

    </>
  );
}
