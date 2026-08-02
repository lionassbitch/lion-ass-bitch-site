import type { Metadata } from "next";
import Link from "next/link";
import { dossiers } from "../content/characters";

export const metadata: Metadata = {
  title: "Character Dossiers",
  description:
    "The Lion Ass Bitch bloodline: Pryde the lion, Kickz the donkey, and Khemetz the black jackal — sovereign will, stubborn truth, and sacred reckoning.",
  alternates: { canonical: "/dossiers" },
};

export default function DossiersPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">Character Dossiers / The bloodline</span>
        <h1>
          Three forces.<br />
          No <i>permission.</i>
        </h1>
        <p className="lede">
          They are not mascots. They are archetypes — the parts of a person that refuse a
          leash, refuse a lie, and refuse to let the fake pass through the gate.
        </p>
      </header>

      <section className="section wrap">
        {dossiers.map((dossier, index) => (
          <article
            className={`feature${index % 2 === 1 ? " feature--flip" : ""}`}
            key={dossier.slug}
            style={{ marginBottom: "18px" }}
          >
            <div className="feature__media">
              <img src={dossier.portrait} alt={`${dossier.name}, ${dossier.animal}`} />
            </div>
            <div className="feature__body">
              <p className="eyebrow" style={{ color: `var(${dossier.aura})` }}>
                {dossier.index} · {dossier.animal}
              </p>
              <h2 className="sectionTitle">{dossier.name}</h2>
              <p className="sectionKicker" style={{ marginBottom: "18px" }}>
                {dossier.domain}
              </p>
              <p className="prose" style={{ maxWidth: "48ch" }}>
                {dossier.epithet}
              </p>
              <div className="btnRow">
                <Link className="btn btn--ghost" href={`/dossiers/${dossier.slug}`}>
                  Open full dossier <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
