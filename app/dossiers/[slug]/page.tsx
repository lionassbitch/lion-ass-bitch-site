import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dossiers, getDossier } from "../../content/characters";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return dossiers.map((dossier) => ({ slug: dossier.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const dossier = getDossier(slug);
  if (!dossier) return { title: "Dossier not found" };

  return {
    title: `${dossier.name} — ${dossier.domain}`,
    description: `${dossier.name}, ${dossier.animal}. ${dossier.epithet}`,
    alternates: { canonical: `/dossiers/${dossier.slug}` },
    openGraph: {
      title: `${dossier.name} · ${dossier.domain}`,
      description: dossier.epithet,
      images: [{ url: dossier.portrait }],
    },
  };
}

export default async function DossierPage({ params }: Params) {
  const { slug } = await params;
  const dossier = getDossier(slug);
  if (!dossier) notFound();

  const others = dossiers.filter((item) => item.slug !== dossier.slug);

  return (
    <div className="page">
      <header
        className="masthead"
        style={{ borderBottomColor: `var(${dossier.aura})` }}
      >
        <span className="eyebrow" style={{ color: `var(${dossier.aura})` }}>
          Dossier {dossier.index} · {dossier.animal}
        </span>
        <h1>{dossier.name}</h1>
        <p className="lede">{dossier.epithet}</p>
        <div className="masthead__meta">
          <span>Domain · {dossier.domain}</span>
          <span>Animal · {dossier.animal}</span>
        </div>
      </header>

      <section className="section wrap">
        <div className="feature">
          <div className="feature__media">
            <img src={dossier.portrait} alt={`${dossier.name}, ${dossier.animal}`} />
          </div>
          <div className="feature__body">
            <p className="prose">{dossier.summary}</p>
          </div>
        </div>
      </section>

      <section className="section section--edge wrap">
        <div className="cardGrid">
          {dossier.traits.map((trait) => (
            <div className="linkCard" key={trait.label} style={{ minHeight: "auto" }}>
              <span className="linkCard__index" style={{ color: `var(${dossier.aura})` }}>
                {trait.label}
              </span>
              <span className="linkCard__title" style={{ fontSize: "1.6rem" }}>
                {trait.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--edge wrap">
        <p className="eyebrow">Recorded verses</p>
        <div className="tenets" style={{ marginTop: "18px" }}>
          {dossier.verses.map((verse, index) => (
            <article className="tenet" key={index}>
              <span className="tenet__index" style={{ color: `var(${dossier.aura})` }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="tenet__law" style={{ fontSize: "clamp(1.4rem, 2.6vw, 2.2rem)" }}>
                “{verse}”
              </p>
            </article>
          ))}
        </div>
        <p className="prose" style={{ marginTop: "34px" }}>
          <strong>Wears:</strong> {dossier.wears}
        </p>
        <div className="btnRow">
          <Link className="btn btn--solid" href="/archive">
            Shop the archive <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="section section--edge wrap">
        <p className="eyebrow">The rest of the bloodline</p>
        <div className="cardGrid" style={{ marginTop: "18px" }}>
          {others.map((item) => (
            <Link className="linkCard" href={`/dossiers/${item.slug}`} key={item.slug}>
              <span className="linkCard__index">
                {item.index} · {item.animal}
              </span>
              <span className="linkCard__title">{item.name}</span>
              <span className="linkCard__blurb">{item.domain}</span>
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
