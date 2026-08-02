import type { Metadata } from "next";
import Link from "next/link";
import { creed } from "../content/canon";

export const metadata: Metadata = {
  title: "The Creed",
  description:
    "Seven laws worn on the body. The creed of Lion Ass Bitch — turn the diss into dominion, fuck fake, be you or be gone.",
  alternates: { canonical: "/creed" },
};

export default function CreedPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">The Creed / Seven laws</span>
        <h1>
          The laws<br />
          we <i>wear.</i>
        </h1>
        <p className="lede">
          Not commandments handed down — laws claimed. Seven of them, worn on the body as
          evidence. This is the standard the gate measures against.
        </p>
      </header>

      <section className="section wrap">
        <div className="tenets">
          {creed.map((tenet) => (
            <article className="tenet" key={tenet.index}>
              <span className="tenet__index">{tenet.index}</span>
              <div>
                <h2 className="tenet__law">{tenet.law}</h2>
                <p className="tenet__gloss">{tenet.gloss}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="btnRow">
          <Link className="btn btn--solid" href="/archive">
            Wear the warning <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btn--ghost" href="/mythos">
            Read the mythos <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
