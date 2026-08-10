import type { Metadata } from "next";
import Link from "next/link";
import { transmissions, transmissionDate } from "../content/frequency";

export const metadata: Metadata = {
  title: "Frequency",
  description:
    "Transmissions from the studio — doctrine, dispatches, and notes from the floor of Lion Ass Bitch.",
  alternates: { canonical: "/frequency" },
};

export default function FrequencyPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">Frequency / Transmissions</span>
        <h1>
          Tune to the<br />
          <i>signal.</i>
        </h1>
        <p className="lede">
          The word stopped being a wound and became a frequency. Dispatches from the studio —
          doctrine, the gate, and notes from the floor.
        </p>
      </header>

      <section className="section wrap">
        <div className="tenets">
          {transmissions.map((entry) => (
            <article className="tenet" key={entry.slug}>
              <span className="tenet__index">{entry.index}</span>
              <div>
                <p className="eyebrow" style={{ marginBottom: "10px" }}>
                  {entry.kind} ·{" "}
                  <time dateTime={entry.date}>
                    {transmissionDate.format(new Date(entry.date))}
                  </time>{" "}
                  · {entry.readingMinutes} min
                </p>
                <h2 className="tenet__law">
                  <Link href={`/frequency/${entry.slug}`}>{entry.title}</Link>
                </h2>
                <p className="tenet__gloss">{entry.dek}</p>
                <p style={{ marginTop: "16px" }}>
                  <Link className="linkCard__cta" href={`/frequency/${entry.slug}`}>
                    Read transmission <span aria-hidden="true">→</span>
                  </Link>
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
