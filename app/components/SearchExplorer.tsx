"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Relic } from "../lib/catalog";
import type { PageRecord } from "../lib/search";
import RelicCard from "./RelicCard";

export default function SearchExplorer({
  relics,
  pages,
}: {
  relics: Relic[];
  pages: PageRecord[];
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();

  const matchedRelics = useMemo(() => {
    if (!term) return [];
    return relics
      .filter((relic) =>
        `${relic.name} ${relic.handle}`.toLowerCase().includes(term),
      )
      .slice(0, 9);
  }, [relics, term]);

  const matchedPages = useMemo(() => {
    if (!term) return [];
    return pages.filter((page) =>
      `${page.title} ${page.summary} ${page.kind} ${page.keywords}`
        .toLowerCase()
        .includes(term),
    );
  }, [pages, term]);

  const hasResults = matchedRelics.length > 0 || matchedPages.length > 0;

  return (
    <>
      <div className="searchField">
        <label className="visually-hidden" htmlFor="site-search">
          Search relics and records
        </label>
        <input
          id="site-search"
          type="search"
          placeholder="Search relics, dossiers, laws, transmissions…"
          value={query}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {!term ? (
        <p className="searchEmpty">
          Start typing to search the archive and the canon — {relics.length} relics and
          the full institution index.
        </p>
      ) : !hasResults ? (
        <p className="searchEmpty">
          Nothing in the archive answers to “{query.trim()}”. Try a garment type, a
          character name, or a word from the creed.
        </p>
      ) : null}

      {matchedPages.length > 0 ? (
        <div className="searchGroup">
          <h2>Records · {matchedPages.length}</h2>
          <ul className="searchPages">
            {matchedPages.map((page, index) => (
              <li key={`${page.href}-${index}`}>
                <Link href={page.href}>
                  <strong>{page.title}</strong>
                  <span>
                    {page.kind} — {page.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {matchedRelics.length > 0 ? (
        <div className="searchGroup">
          <h2>Relics · {matchedRelics.length}</h2>
          <div className="relicGrid">
            {matchedRelics.map((relic, index) => (
              <RelicCard key={relic.id} relic={relic} index={index} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
