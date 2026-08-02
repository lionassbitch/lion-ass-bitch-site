"use client";

import { useMemo, useState } from "react";
import {
  RELIC_CATEGORIES,
  relicCategory,
  type Relic,
  type RelicCategory,
} from "../lib/catalog";
import RelicCard from "./RelicCard";

export default function ArchiveExplorer({ relics }: { relics: Relic[] }) {
  const [category, setCategory] = useState<RelicCategory>("All");

  // Only show category chips that actually match something in the catalog.
  const activeCategories = useMemo(() => {
    const present = new Set(relics.map(relicCategory));
    return RELIC_CATEGORIES.filter(
      (value) => value === "All" || present.has(value),
    );
  }, [relics]);

  const shown = useMemo(
    () =>
      category === "All"
        ? relics
        : relics.filter((relic) => relicCategory(relic) === category),
    [relics, category],
  );

  return (
    <>
      <div className="archiveBar">
        <div className="filterRow" role="group" aria-label="Filter relics by type">
          {activeCategories.map((value) => (
            <button
              key={value}
              type="button"
              className="filterChip"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="archiveCount" aria-live="polite">
          {shown.length} {shown.length === 1 ? "relic" : "relics"}
        </p>
      </div>

      <div className="relicGrid">
        {shown.map((relic, index) => (
          <RelicCard key={relic.id} relic={relic} index={index} eager={index < 3} />
        ))}
      </div>
    </>
  );
}
