import type { Metadata } from "next";
import Link from "next/link";
import { voidChapters, VOID_ROUTE, VOID_TITLE } from "../content/void";
import RegistryVoidExperience from "./RegistryVoidExperience";
import "./void.css";

export const metadata: Metadata = {
  title: VOID_TITLE,
  description:
    "Registry Void Scroll — an accessible 3D filing from a rainy Bronx alley through Door 22 and a crystal descent into a gothic-futurist VOID city.",
  alternates: { canonical: VOID_ROUTE },
};

export default function VoidPage() {
  return (
    <div className="voidPage">
      <a className="voidSkip" href="#void-record">
        Skip 3D journey
      </a>

      <RegistryVoidExperience />

      <section className="page voidRecord" id="void-record">
        <header className="masthead">
          <span className="eyebrow">Exsuvera / Registry Void</span>
          <h1>
            The filing<br />
            <i>in four gates.</i>
          </h1>
          <p className="lede">
            Scroll is the camera. The rainy street, Door 22, the crystal descent, and VOID
            city are one continuous path. If motion is reduced, the same four chapters
            remain as stills and as this written record.
          </p>
          <div className="masthead__meta">
            <span>Street → Door 22 → Crystals → VOID city</span>
          </div>
        </header>

        <div className="section wrap">
          <div className="tenets">
            {voidChapters.map((chapter) => (
              <article className="tenet" key={chapter.id}>
                <span className="tenet__index">{chapter.code}</span>
                <div>
                  <h2 className="tenet__law">{chapter.title}</h2>
                  <div className="prose">
                    {chapter.record.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {chapter.id === "k2" || chapter.id === "k4" ? (
                    <div className="voidRecord__notice">
                      <img
                        alt={
                          chapter.id === "k2"
                            ? "The Registry notice of filing, stamped Filed"
                            : "The Registry notice of disposition, stamped Void"
                        }
                        src={
                          chapter.id === "k2"
                            ? "/assets/void/notice-registry.svg"
                            : "/assets/void/notice-void.svg"
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="section section--edge wrap">
          <div className="btnRow">
            <Link className="btn btn--solid" href="/archive">
              Return to the archive <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn--ghost" href="/exsuvera">
              Exsuvera Studios <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
