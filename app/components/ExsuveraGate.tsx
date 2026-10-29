import { dossiers } from "../content/characters";
import { exsuveraName } from "../content/canon";
import { LAB_ORIGIN } from "../lib/hosts";
import TheName from "./TheName";
import WordReveal from "./WordReveal";

// EXSUVERA PRESENTS — the gate. One page, in order: a hard hook (trinity +
// ENTER), THE NAME, the EXSUVERA reveal, and a single ENTER with nothing else
// competing for the click. Cold visitors who don't hesitate never have to
// read the explainer; THE NAME sits one scroll below the hook on purpose.
export default function ExsuveraGate() {
  const enter = { label: "Enter LionAssBitch.com", href: LAB_ORIGIN };

  return (
    <div className="page gate">
      <section className="hero gate__hero" id="top">
        <video autoPlay muted loop playsInline poster="/assets/lab-trinity-hero.webp">
          <source src="/assets/lab-trinity-loop.mp4" type="video/mp4" />
        </video>
        <div className="veil" />
        <div className="heroCopy">
          <p className="eyebrow">Exsuvera presents</p>
          <h1>
            Lion Ass<br />
            <i>Bitch.</i>
          </h1>
          <p className="intro">Three words. Three animals. Three ranks.</p>
          <div className="actions">
            <a className="button light" href={enter.href}>
              {enter.label}
            </a>
          </div>
        </div>
        <p className="sideNote">Out of truth comes your true self</p>
      </section>

      <section className="trinity gate__trinity" aria-labelledby="gate-trinity-title">
        <div className="trinityHead">
          <p className="eyebrow">The bloodline</p>
          <h2 id="gate-trinity-title">
            Pryde. Kickz.<br />Khemetz.
          </h2>
        </div>
        {dossiers.map((dossier) => (
          <a className="trinityCard" href={`${LAB_ORIGIN}/dossiers/${dossier.slug}`} key={dossier.slug}>
            <article>
              <img src={dossier.portrait} alt={`${dossier.name}, ${dossier.animal}`} />
              <div>
                <span>
                  {dossier.index} / {dossier.domain}
                </span>
                <h3>{dossier.name}</h3>
              </div>
            </article>
          </a>
        ))}
      </section>

      <TheName archetypeBase={LAB_ORIGIN} />

      <WordReveal
        id="the-word"
        title="Exsuvera — the coined word, taken apart"
        beats={exsuveraName.beats}
        cta={enter}
      />

      <section className="finalCta gate__final" aria-labelledby="gate-final-title">
        <div className="veil" />
        <div>
          <p className="eyebrow">The molt is behind you</p>
          <h2 id="gate-final-title">Enter.</h2>
          <div className="btnRow" style={{ justifyContent: "center" }}>
            <a className="btn btn--solid" href={enter.href}>
              {enter.label} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
