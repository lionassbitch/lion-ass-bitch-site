import type { Metadata } from "next";
import { getRelics } from "../lib/catalog";
import { site } from "../lib/site";
import ArchiveExplorer from "../components/ArchiveExplorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relic Archive",
  description:
    "The full living catalog of Lion Ass Bitch relics — made to order, shipped worldwide. Filter by type and add straight to the Shopify cart.",
  alternates: { canonical: "/archive" },
};

export default async function ArchivePage() {
  const relics = await getRelics();

  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">The Relic Archive / {relics.length} live pieces</span>
        <h1>
          The living<br />
          <i>catalog.</i>
        </h1>
        <p className="lede">
          Every storefront-ready piece in one archive. Nothing here is disposable and
          nothing here is neutral — each relic is evidence, made to order and shipped
          worldwide. Open any piece to inspect every angle, choose your option, and add it
          straight to the {site.shortName} Shopify cart.
        </p>
      </header>

      <section className="section wrap">
        <ArchiveExplorer relics={relics} />
      </section>
    </div>
  );
}
