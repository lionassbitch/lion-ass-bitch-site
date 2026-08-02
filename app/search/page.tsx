import type { Metadata } from "next";
import { getRelics } from "../lib/catalog";
import { buildPageIndex } from "../lib/search";
import SearchExplorer from "../components/SearchExplorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search the Lion Ass Bitch archive and canon — relics, dossiers, laws, and transmissions.",
  alternates: { canonical: "/search" },
  robots: { index: false },
};

export default async function SearchPage() {
  const relics = await getRelics();
  const pages = buildPageIndex();

  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">Search / Archive &amp; canon</span>
        <h1>
          Find any<br />
          <i>relic or record.</i>
        </h1>
      </header>

      <section className="section wrap">
        <SearchExplorer relics={relics} pages={pages} />
      </section>
    </div>
  );
}
