import type { Metadata } from "next";
import Link from "next/link";
import { siteIndex } from "../lib/site";

export const metadata: Metadata = {
  title: "The LABrynth",
  description:
    "The full index of the Lion Ass Bitch institution — storefront, canon, and the wider Exsuvera universe, mapped in one place.",
  alternates: { canonical: "/labrynth" },
};

export default function LabrynthPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">The LABrynth / Index of everything</span>
        <h1>
          Every gate,<br />
          <i>one map.</i>
        </h1>
        <p className="lede">
          The institution is wide by design. This is the master index — every route in the
          house, grouped by the world it belongs to. Lost is just another word for early.
        </p>
      </header>

      {siteIndex.map((section) => (
        <section className="section section--edge wrap" key={section.group}>
          <p className="eyebrow">{section.group}</p>
          <h2 className="sectionTitle" style={{ marginBottom: "10px" }}>
            {section.group}
          </h2>
          <p className="sectionKicker" style={{ marginBottom: "30px" }}>
            {section.blurb}
          </p>
          <div className="cardGrid">
            {section.links.map((link) => (
              <Link className="linkCard" href={link.href} key={link.href}>
                <span className="linkCard__index">{section.group}</span>
                <span className="linkCard__title">{link.label}</span>
                {link.note ? <span className="linkCard__blurb">{link.note}</span> : null}
                <span className="linkCard__cta">
                  Enter <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
