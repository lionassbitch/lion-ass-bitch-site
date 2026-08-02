import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTransmission,
  transmissions,
  transmissionDate,
} from "../../content/frequency";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return transmissions.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const entry = getTransmission(slug);
  if (!entry) return { title: "Transmission not found" };

  return {
    title: entry.title,
    description: entry.dek,
    alternates: { canonical: `/frequency/${entry.slug}` },
    openGraph: {
      title: `${entry.title} · Frequency`,
      description: entry.dek,
      type: "article",
    },
  };
}

export default async function TransmissionPage({ params }: Params) {
  const { slug } = await params;
  const entry = getTransmission(slug);
  if (!entry) notFound();

  const more = transmissions.filter((item) => item.slug !== entry.slug).slice(0, 3);

  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">
          Transmission {entry.index} · {entry.kind}
        </span>
        <h1>{entry.title}</h1>
        <p className="lede">{entry.dek}</p>
        <div className="masthead__meta">
          <time dateTime={entry.date}>
            {transmissionDate.format(new Date(entry.date))}
          </time>
          <span>{entry.readingMinutes} min read</span>
        </div>
      </header>

      <section className="section wrap">
        <article className="prose">
          {entry.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </article>
        <div className="btnRow">
          <Link className="btn btn--ghost" href="/frequency">
            <span aria-hidden="true">←</span> All transmissions
          </Link>
          <Link className="btn btn--solid" href="/archive">
            Enter the archive <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {more.length > 0 ? (
        <section className="section section--edge wrap">
          <p className="eyebrow">Keep reading</p>
          <div className="cardGrid" style={{ marginTop: "18px" }}>
            {more.map((item) => (
              <Link className="linkCard" href={`/frequency/${item.slug}`} key={item.slug}>
                <span className="linkCard__index">{item.kind}</span>
                <span className="linkCard__title">{item.title}</span>
                <span className="linkCard__blurb">{item.dek}</span>
                <span className="linkCard__cta">
                  Read <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
