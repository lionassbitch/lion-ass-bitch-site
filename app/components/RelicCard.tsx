"use client";

import Link from "next/link";
import { useState } from "react";
import type { Relic } from "../lib/catalog";

// Grid card for the archive and featured rows. Links through to the relic's
// detail page; hovering reveals the alternate angle when one exists.
export default function RelicCard({
  relic,
  index,
  eager = false,
}: {
  relic: Relic;
  index: number;
  eager?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const front = relic.images[0];
  const back = relic.images[1] ?? front;
  const shown = hover ? back : front;

  return (
    <article className="relicCard">
      <Link
        className="relicCard__link"
        href={`/archive/${relic.handle}`}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <span className="relicCard__stage">
          <img
            src={shown.src}
            alt={relic.name}
            width={shown.width}
            height={shown.height}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
          />
          {!relic.available ? <span className="relicCard__flag">Sold out</span> : null}
        </span>
        <span className="relicCard__meta">
          <span className="relicCard__index">{String(index + 1).padStart(2, "0")}</span>
          <span className="relicCard__name">{relic.name}</span>
          <span className="relicCard__price">{relic.note}</span>
        </span>
      </Link>
    </article>
  );
}
