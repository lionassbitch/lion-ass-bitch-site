import Link from "next/link";
import { getRelics } from "./lib/catalog";
import { dossiers } from "./content/characters";
import { site } from "./lib/site";
import RelicCard from "./components/RelicCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const relics = await getRelics();
  const featured = relics.slice(0, 6);

  return (
    <>
      <section className="hero" id="top">
        <video autoPlay muted loop playsInline poster="/assets/lab-trinity-neon.webp">
          <source src="/assets/lab-trinity-loop.mp4" type="video/mp4" />
        </video>
        <div className="veil" />
        <figure className="heroProduct">
          <img
            src="/products/hero-ancestors-crest-hoodie-cutout.png"
            alt="LAB Ancestors Crest Boxy Zip Hoodie, Edition 03"
          />
          <figcaption>
            <span>Live catalog piece</span>Ancestors Crest Boxy Zip Hoodie · Edition 03
          </figcaption>
        </figure>
        <div className="heroCopy">
          <p className="eyebrow">The gate is open / {relics.length} live relics</p>
          <h1>
            Turned a diss<br />
            <i>into dominion.</i>
          </h1>
          <p className="intro">
            {site.creed} Lion Ass Bitch is a Bronx-born institution — fashion,
            mythology, and attitude for anyone who refuses to shrink.
          </p>
          <div className="actions">
            <Link className="button light" href="/archive">
              Enter the archive
            </Link>
            <Link className="button ghost" href="/mythos">
              Read the mythos
            </Link>
          </div>
        </div>
        <p className="sideNote">Luxury with teeth · {site.founded}</p>
      </section>

      <section className="marquee" aria-label="Brand values">
        <div>
          TURNED A DISS INTO DOMINION <span>✦</span> THEY NAMED THE INSULT. WE CLAIMED THE
          POWER. <span>✦</span> FUCK FAKE <span>✦</span> BE YOU OR BE GONE <span>✦</span>{" "}
          TURNED A DISS INTO DOMINION <span>✦</span>
        </div>
      </section>

      <figure className="warningBanner">
        <img
          src="/assets/lab-warning-banner.webp"
          alt="Fuck fake. This is not a brand. This is a warning."
        />
      </figure>

      <section className="section wrap" id="featured" aria-labelledby="featured-title">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">From the archive / {relics.length} live pieces</p>
            <h2 id="featured-title" className="sectionTitle">
              Wear the<br />warning
            </h2>
          </div>
          <p className="sectionKicker">
            Every relic is made to order and shipped worldwide. A rotating selection
            from the living catalog — the full archive holds all {relics.length}.
          </p>
        </div>
        <div className="relicGrid">
          {featured.map((relic, index) => (
            <RelicCard key={relic.id} relic={relic} index={index} eager={index < 3} />
          ))}
        </div>
        <div className="btnRow">
          <Link className="btn btn--solid" href="/archive">
            Browse the full archive <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="world" id="world">
        <img
          src="/assets/lab-trinity-neon.webp"
          alt="Pryde, Kickz, and Khemetz walking through a neon Bronx alley"
        />
        <div className="worldCopy">
          <p className="eyebrow">Not a label. A signal.</p>
          <h2>
            Three forces.<br />No <i>permission.</i>
          </h2>
          <p>
            The bloodline carries the warning from the Bronx into every piece: sovereign
            will, stubborn truth, and sacred reckoning.
          </p>
          <Link className="button light" href="/dossiers">
            Meet the bloodline
          </Link>
        </div>
      </section>

      <section className="trinity" aria-labelledby="trinity-title">
        <div className="trinityHead">
          <p className="eyebrow">The bloodline</p>
          <h2 id="trinity-title">
            Pryde. Kickz.<br />Khemetz.
          </h2>
        </div>
        {dossiers.map((dossier) => (
          <Link className="trinityCard" href={`/dossiers/${dossier.slug}`} key={dossier.slug}>
            <article>
              <img src={dossier.portrait} alt={`${dossier.name}, ${dossier.animal}`} />
              <div>
                <span>
                  {dossier.index} / {dossier.domain}
                </span>
                <h3>{dossier.name}</h3>
              </div>
            </article>
          </Link>
        ))}
      </section>

      <section className="streetFilm">
        <div>
          <p className="eyebrow">Bronx transmission / 01:24</p>
          <h2>
            Kickz<br />outside.
          </h2>
          <p>The mascot leaves the mythology and hits the block. Press play for the full signal.</p>
          <Link className="btn btn--ghost" href="/frequency">
            All transmissions <span aria-hidden="true">→</span>
          </Link>
        </div>
        <video controls playsInline preload="metadata" poster="/assets/kickz-bronx-poster.webp">
          <source src="/assets/kickz-bronx-scene.mp4" type="video/mp4" />
        </video>
      </section>

      <section className="manifesto" id="manifesto">
        <p className="eyebrow">The creed</p>
        <p className="statement">
          Clothes are not a costume.<br />
          They are <em>evidence.</em>
        </p>
        <img
          className="manifestoSeal"
          src="/assets/lab-manifesto-wheel.webp"
          alt="Fuck fake, be you or be gone manifesto artwork with the LAB trinity"
        />
        <div className="manifestoGrid">
          <p>
            Lion Ass Bitch is for the maximalist, the minimalist, the misfit, and the main
            character. No gatekeeping. No shrinking. No permission needed.
          </p>
          <p>
            <Link className="btn btn--ghost" href="/creed">
              Read all seven laws <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>

      <section className="finalCta">
        <video autoPlay muted loop playsInline poster="/assets/lab-trinity-neon.webp">
          <source src="/assets/lab-trinity-loop.mp4" type="video/mp4" />
        </video>
        <div className="veil" />
        <div>
          <p className="eyebrow">This is not a brand</p>
          <h2>
            This is<br />a warning.
          </h2>
          <Link className="button light" href="/archive">
            Enter the archive
          </Link>
        </div>
      </section>
    </>
  );
}
