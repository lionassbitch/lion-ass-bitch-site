import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRelic, getRelics, money, relicCategory } from "../../lib/catalog";
import { site } from "../../lib/site";
import RelicGallery from "../../components/RelicGallery";
import AddToCartForm from "../../components/AddToCartForm";
import RelicCard from "../../components/RelicCard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const relic = await getRelic(handle);
  if (!relic) return { title: "Relic not found" };

  return {
    title: relic.name,
    description: `${relic.name} — a Lion Ass Bitch relic. ${relic.note}. Made to order, shipped worldwide.`,
    alternates: { canonical: `/archive/${relic.handle}` },
    openGraph: {
      title: `${relic.name} · Lion Ass Bitch`,
      description: `${relic.name} — evidence, not costume. ${relic.note}.`,
      images: relic.images[0] ? [{ url: relic.images[0].src }] : undefined,
      type: "website",
    },
  };
}

export default async function RelicPage({ params }: Params) {
  const { handle } = await params;
  const [relic, all] = await Promise.all([getRelic(handle), getRelics()]);
  if (!relic) notFound();

  const category = relicCategory(relic);
  const related = all
    .filter((item) => item.handle !== relic.handle && relicCategory(item) === category)
    .slice(0, 3);
  const optionCount = relic.variants.filter((variant) => variant.available).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: relic.name,
    image: relic.images.map((image) => image.src),
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: relic.priceFrom ?? undefined,
      offerCount: relic.variants.length,
      availability: relic.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="page">
      <section className="section wrap">
        <div className="relicDetail">
          <div>
            <RelicGallery
              handle={relic.handle}
              name={relic.name}
              images={relic.images}
              eager
            />
          </div>

          <div className="relicDetail__info">
            <p className="relicDetail__crumb">
              <Link href="/archive">Archive</Link>
              <span aria-hidden="true">/</span>
              <span>{category}</span>
            </p>
            <h1 className="relicDetail__title">{relic.name}</h1>
            <p className="relicDetail__price">
              {relic.priceFrom !== null
                ? `${relic.variants.length > 1 ? "From " : ""}${money.format(relic.priceFrom)}`
                : "View price at checkout"}
            </p>
            <p className="relicDetail__note">
              Evidence, not costume. This relic is made to order and shipped worldwide.
              Choose your option below and add it straight to the secure Shopify cart.
            </p>

            <AddToCartForm id={relic.id} variants={relic.variants} />

            <dl className="relicDetail__spec">
              <div>
                <dt>Type</dt>
                <dd>{category}</dd>
              </div>
              <div>
                <dt>Options</dt>
                <dd>
                  {optionCount > 0
                    ? `${optionCount} available`
                    : "Currently sold out"}
                </dd>
              </div>
              <div>
                <dt>Fulfilment</dt>
                <dd>Made to order · Shipped worldwide</dd>
              </div>
              <div>
                <dt>House</dt>
                <dd>Lion Ass Bitch · Exsuvera Studios</dd>
              </div>
            </dl>

            <div className="btnRow">
              <a className="btn btn--ghost" href={site.shop.cartUrl}>
                View Shopify cart <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section section--edge wrap" aria-labelledby="related-title">
          <p className="eyebrow">More from this line</p>
          <h2 id="related-title" className="sectionTitle" style={{ marginBottom: "34px" }}>
            Related relics
          </h2>
          <div className="relicGrid">
            {related.map((item, index) => (
              <RelicCard key={item.id} relic={item} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
