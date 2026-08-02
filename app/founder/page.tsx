import type { Metadata } from "next";
import Link from "next/link";
import { founder } from "../content/canon";

export const metadata: Metadata = {
  title: "The Founder",
  description:
    "Eddie Colón built Lion Ass Bitch out of the exact words that were supposed to break him. The founder's story.",
  alternates: { canonical: "/founder" },
};

export default function FounderPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">The Founder / First witness</span>
        <h1>{founder.name}</h1>
        <p className="lede">{founder.standfirst}</p>
        <div className="masthead__meta">
          <span>{founder.role}</span>
          <span>{founder.location}</span>
        </div>
      </header>

      <section className="section wrap">
        <div className="feature">
          <div className="feature__media">
            <img src={founder.portrait} alt={`${founder.name}, founder of Lion Ass Bitch`} />
          </div>
          <div className="feature__body">
            <article className="prose">
              {founder.story.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <p style={{ color: "var(--gold)", fontWeight: 700 }}>{founder.signature}</p>
            </article>
          </div>
        </div>

        <div className="btnRow">
          <Link className="btn btn--solid" href="/mythos">
            Read the mythos <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btn--ghost" href="/exsuvera">
            Visit Exsuvera Studios <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
