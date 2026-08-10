import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lost in the LABrynth",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">404 / Off the map</span>
        <h1>
          Lost in the<br />
          <i>LABrynth.</i>
        </h1>
        <p className="lede">
          This gate doesn&apos;t open — the page you reached for isn&apos;t here. Lost is
          just another word for early. Pick a way back in.
        </p>
        <div className="btnRow">
          <Link className="btn btn--solid" href="/">
            The front gate <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btn--ghost" href="/archive">
            The archive <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btn--ghost" href="/labrynth">
            The full index <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>
    </div>
  );
}
