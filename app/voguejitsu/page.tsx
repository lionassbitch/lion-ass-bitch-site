import type { Metadata } from "next";
import Link from "next/link";
import "./voguejitsu.css";

export const metadata: Metadata = {
  title: "Voguejitsu — Presence Is Power",
  description: "A conceptual performance discipline rooted in ballroom movement, chosen family, precision, and transformation.",
  openGraph: { title: "Voguejitsu — Presence Is Power", description: "Turn survival into style. Turn visibility into power.", images: [{ url: "/og-voguejitsu.png", width: 1536, height: 1024, alt: "Voguejitsu — Presence Is Power" }] },
  twitter: { card: "summary_large_image", title: "Voguejitsu — Presence Is Power", description: "Turn survival into style. Turn visibility into power.", images: ["/og-voguejitsu.png"] },
};

const principles = [
  ["01", "Presence before movement", "Power begins before the first step. Posture, gaze, stillness, and attitude establish authority."],
  ["02", "Precision over force", "A clean line, a sharp angle, or a perfectly timed gesture carries more impact than aggression."],
  ["03", "Flow through resistance", "Pressure becomes performance. A stumble becomes a dip; confrontation becomes choreography."],
  ["04", "Identity as armor", "Personal style is cultivated as protection against conformity, shame, and erasure."],
  ["05", "Improvisation as intelligence", "Respond instantly to music, rivals, space, and the beautiful problem of the unexpected."],
  ["06", "Community as strength", "Excellence grows through houses, mentors, elders, rivals, and chosen family."],
  ["07", "Victory without destruction", "Dominate the moment. Never destroy the person sharing it."],
];

const foundations = [
  { number: "I", title: "Hands", subtitle: "The Signature", copy: "Hands frame, redirect, reveal, and punctuate. Every practitioner develops a personal gesture vocabulary—an unmistakable fighting style made from storytelling and control.", trait: "Intention / Misdirection / Detail" },
  { number: "II", title: "Catwalk", subtitle: "Controlled Advance", copy: "Balance and rhythm become forward pressure. Tempo, direction, and posture collapse the perceived distance between practitioner and rival without ever appearing rushed.", trait: "Balance / Rhythm / Command" },
  { number: "III", title: "Duckwalk", subtitle: "The Grounded Star", copy: "Endurance meets precision under strain. Staying in character close to the ground turns physical demand into proof that power does not depend on elevation.", trait: "Conditioning / Mobility / Character" },
  { number: "IV", title: "Spins & Dips", subtitle: "Momentum Transformed", copy: "The spin redirects energy; the dip delivers the final punctuation. A dip is never collapse—it is a controlled descent that converts vulnerability into spectacle.", trait: "Momentum / Safety / Conclusion" },
  { number: "V", title: "Floor", subtitle: "Another Territory", copy: "Descend, travel, pose, and rise without surrendering rhythm or presence. The floor is not defeat. It is simply another level waiting to be commanded.", trait: "Fluidity / Recovery / Range" },
];

const disciplines = [
  ["01", "The Entrance", "Step into the room as though stepping into your own legend."],
  ["02", "Shade Deflection", "Meet provocation with wit, refinement, movement, or strategic stillness."],
  ["03", "The Read", "Observe rhythm, repetition, hesitation, strength, and the opening no one else saw."],
  ["04", "The Pose", "Commit to one complete idea through silhouette, face, balance, and line."],
  ["05", "The Reset", "Recover so beautifully the audience cannot tell the accident from the intention."],
];

const stages = [
  ["01", "Entrance", "Establish presence and identity."],
  ["02", "Demonstration", "Present your movement vocabulary."],
  ["03", "Exchange", "Respond through improvisation and musicality."],
  ["04", "Final statement", "Decide how the round will be remembered."],
];

const ranks = [
  ["01", "First Step", "Rhythm, posture, history, and safety."],
  ["02", "Open Hand", "Gesture vocabulary and hand performance."],
  ["03", "Grounded Star", "Catwalk, duckwalk, floor control, and conditioning."],
  ["04", "House Blade", "Battle craft, improvisation, and category strategy."],
  ["05", "Crowned Form", "A distinct style powerful enough to influence others."],
  ["06", "Legendary Guardian", "Culture preserved through service, mentorship, and care."],
];

function HandStar() {
  return <div className="vj-hand-star" role="img" aria-label="Open hand framed by a five-pointed star"><span className="vj-star">✦</span><span className="vj-palm" /><span className="vj-finger vj-finger-one" /><span className="vj-finger vj-finger-two" /><span className="vj-finger vj-finger-three" /><span className="vj-finger vj-finger-four" /><span className="vj-finger vj-finger-five" /></div>;
}

export default function VoguejitsuPage() {
  return (
    <main className="vj-page">
      <header className="vj-nav">
        <Link className="vj-brand" href="/voguejitsu" aria-label="Voguejitsu home"><span>VJ</span><b>Voguejitsu</b></Link>
        <nav aria-label="Voguejitsu navigation"><a href="#code">The code</a><a href="#forms">Five forms</a><a href="#function">The function</a><a href="#oath">The oath</a></nav>
        <Link className="vj-return" href="/">Enter LAB <span>↗</span></Link>
      </header>

      <section className="vj-hero" id="top">
        <div className="vj-grid-lines" aria-hidden="true" /><div className="vj-orbit vj-orbit-one" aria-hidden="true" /><div className="vj-orbit vj-orbit-two" aria-hidden="true" /><div className="vj-hero-mark"><HandStar /></div>
        <div className="vj-hero-copy">
          <p className="vj-kicker">A conceptual performance discipline / Est. in the now</p>
          <h1><span>Vogue</span><i>jitsu</i></h1>
          <p className="vj-declaration">Presence is power.<br />Precision is defense.<br />Expression is the weapon.</p>
          <div className="vj-actions"><a className="vj-button vj-button-hot" href="#forms">Enter the form</a><a className="vj-button" href="#code">Read the code</a></div>
        </div>
        <p className="vj-hero-note">Born from ballroom movement · Built for transformation</p><div className="vj-scroll"><span>Scroll to begin</span><i /></div>
      </section>

      <section className="vj-signal" aria-label="Voguejitsu credo"><div>TURN SURVIVAL INTO STYLE <span>✦</span> TURN COMPETITION INTO STORYTELLING <span>✦</span> TURN VISIBILITY INTO POWER <span>✦</span> TURN SURVIVAL INTO STYLE <span>✦</span></div></section>

      <section className="vj-origin" id="code">
        <div className="vj-section-label"><span>001</span><p>The code</p></div>
        <div className="vj-origin-copy"><p className="vj-kicker">The body is both archive and instrument</p><h2>You do not<br />enter quietly.</h2><div className="vj-origin-text"><p>Voguejitsu is a stylized performance martial art rooted in the movement language, competitive spirit, and chosen-family traditions of the Black and Latino LGBTQ+ ballroom scene.</p><p>It does not imitate conventional combat. A practitioner overcomes through timing, control, creativity, resilience, and undeniable command of the floor. Every entrance makes a claim: <strong>I am here. I know who I am. I determine how I will be seen.</strong></p></div></div>
      </section>

      <section className="vj-principles" aria-labelledby="principles-title">
        <div className="vj-principles-head"><p className="vj-kicker">Seven principles / One center</p><h2 id="principles-title">The philosophy<br />in practice.</h2></div>
        <div className="vj-principle-grid">{principles.map(([number,title,copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="vj-foundations" id="forms" aria-labelledby="forms-title">
        <div className="vj-forms-intro"><div className="vj-section-label"><span>002</span><p>The system</p></div><div><p className="vj-kicker">The five movement foundations</p><h2 id="forms-title">Five forms.<br />Infinite statements.</h2></div><HandStar /></div>
        <div className="vj-form-list">{foundations.map((form) => <article className="vj-form" key={form.number}><span className="vj-form-number">{form.number}</span><div><p>{form.subtitle}</p><h3>{form.title}</h3></div><p className="vj-form-copy">{form.copy}</p><small>{form.trait}</small></article>)}</div>
      </section>

      <section className="vj-disciplines">
        <div className="vj-disciplines-title"><p className="vj-kicker">The supporting arts</p><h2>Read the room.<br /><i>Rewrite the room.</i></h2></div>
        <div className="vj-disciplines-list">{disciplines.map(([number,title,copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="vj-lineage"><div className="vj-lineage-mark"><HandStar /></div><div><p className="vj-kicker">Houses / Lineage / Chosen family</p><h2>No movement<br />is ownerless.</h2><p>Houses are schools, creative families, and competitive teams. They develop distinct philosophies, visual identities, signatures, and traditions—but lineage comes before aesthetic. Practitioners honor ballroom’s Black and Latino queer and trans innovators, preserve its history, teach safety, and protect the dignity of the house.</p><blockquote>Individual excellence becomes legacy only when it returns to the community.</blockquote></div></section>

      <section className="vj-function" id="function">
        <div className="vj-function-head"><div className="vj-section-label"><span>003</span><p>Competition</p></div><div><p className="vj-kicker">A Function of Forms</p><h2>Four stages.<br />One remembered moment.</h2></div></div>
        <div className="vj-stage-grid">{stages.map(([number,title,copy]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
        <div className="vj-scoring"><p>Judged on</p><div>{["Musicality","Precision","Control","Originality","Character","Recovery","Spatial awareness","Visual storytelling","Respect","Command"].map((item) => <span key={item}>{item}</span>)}</div></div>
        <p className="vj-safety">Physical contact is prohibited unless a specially choreographed category allows safe, consensual partnering. The drama may be theatrical. The care is real.</p>
      </section>

      <section className="vj-ranks" aria-labelledby="ranks-title"><div className="vj-rank-head"><p className="vj-kicker">The path is communal</p><h2 id="ranks-title">Rank without<br />domination.</h2><p>Trophies can mark a night. Rank marks artistic growth, cultural knowledge, and sustained contribution.</p></div><ol>{ranks.map(([number,title,copy]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></section>

      <section className="vj-oath" id="oath"><div className="vj-oath-star"><HandStar /></div><p className="vj-kicker">The Voguejitsu oath</p><blockquote><span>I enter with intention.</span><span>I move with precision.</span><span>I transform pressure into beauty.</span><span>I honor the houses and legends before me.</span><span>I protect my body, my community, and my truth.</span><span>I do not disappear to make others comfortable.</span><span>I leave the floor more powerful than I entered it.</span></blockquote><a className="vj-button vj-button-hot" href="#top">Return to the entrance ↑</a></section>

      <footer className="vj-footer"><Link className="vj-brand" href="/voguejitsu"><span>VJ</span><b>Voguejitsu</b></Link><p>Victory without destruction.</p><p>A conceptual performance discipline rooted in respect for ballroom history and its creators.</p><Link href="/">Lion Ass Bitch ↗</Link></footer>
    </main>
  );
}
