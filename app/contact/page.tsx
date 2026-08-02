import type { Metadata } from "next";
import { site } from "../lib/site";
import ContactForm from "../components/ContactForm";

export const metadata: Metadata = {
  title: "Contact & Support",
  description:
    "Reach the Lion Ass Bitch studio — orders, sizing, wholesale, press, and everything in between.",
  alternates: { canonical: "/contact" },
};

const topics = [
  { title: "Orders & shipping", body: "Every relic is made to order and shipped worldwide. Order questions, tracking, and changes." },
  { title: "Sizing & fit", body: "Unsure which option to claim? Tell us your usual size and the piece — we'll guide the fit." },
  { title: "Wholesale & press", body: "Stockists, features, and collaborations with Exsuvera Studios and the LAB house." },
];

export default function ContactPage() {
  return (
    <div className="page">
      <header className="masthead">
        <span className="eyebrow">Contact &amp; Support</span>
        <h1>
          Reach the<br />
          <i>studio.</i>
        </h1>
        <p className="lede">
          Orders, sizing, wholesale, press, or a transmission of your own — the gate is
          open. We read everything and answer the real ones.
        </p>
      </header>

      <section className="section wrap">
        <div className="contactLayout">
          <div>
            <p className="eyebrow">Send a transmission</p>
            <ContactForm />
          </div>
          <aside className="contactAside">
            <p className="eyebrow">Direct channels</p>
            <ul className="contactChannels">
              <li>
                <a href={site.social.instagram}>Instagram {site.social.instagramHandle} ↗</a>
                <span>Fastest reply — DMs are open.</span>
              </li>
              {site.support.email ? (
                <li>
                  <a href={`mailto:${site.support.email}`}>{site.support.email}</a>
                  <span>Orders &amp; support inbox.</span>
                </li>
              ) : null}
              <li>
                <a href={site.shop.cartUrl}>Shopify checkout ↗</a>
                <span>Secure payment &amp; order status.</span>
              </li>
            </ul>

            <div className="contactTopics">
              {topics.map((topic) => (
                <div key={topic.title}>
                  <h2>{topic.title}</h2>
                  <p>{topic.body}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
