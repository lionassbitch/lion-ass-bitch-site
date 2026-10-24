import { labContent } from "../content";
import { featuredProducts } from "../products";
import { Reveal, SectionLabel } from "./primitives";

/** A curated edit from the existing store; sizing and pricing stay on Shopify. */
export function Pillars() {
  const { shop } = labContent;
  return (
    <section id="shop" className="lab-section py-24 md:py-36" aria-labelledby="shop-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <SectionLabel>The wardrobe / Selected pieces</SectionLabel>
            <Reveal as="h2" className="lab-display max-w-3xl text-[clamp(2.2rem,5vw,4.5rem)] font-bold uppercase leading-[1.05]">
              <span id="shop-heading">{shop.line}</span>
            </Reveal>
          </div>
          <div>
            <p className="lab-serif text-xl leading-relaxed text-[var(--lab-bone)]/80">{shop.body}</p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--lab-muted)]">{shop.note}</p>
          </div>
        </div>
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product, index) => (
            <li key={product.href}>
              <a href={product.href} className="group block h-full" aria-label={`Shop ${product.title}`}>
                <div className="relative aspect-[4/5] overflow-hidden border border-white/15 bg-[#e9e5dc]">
                  <img src={product.image} alt={product.title} loading="lazy" decoding="async" width="800" height="1000"
                    className="h-full w-full object-contain transition-transform duration-500 motion-safe:group-hover:scale-[1.04]" />
                  <span aria-hidden="true" className="absolute left-4 top-4 bg-[var(--lab-bg)] px-3 py-2 text-xs tracking-widest text-[var(--lab-gold)]">LAB / 0{index + 1}</span>
                </div>
                <div className="border-b border-white/15 py-5">
                  <h3 className="lab-display text-lg leading-relaxed text-[var(--lab-bone)] group-hover:text-[var(--lab-gold)]">{product.title}</h3>
                  <span className="mt-3 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.18em] text-[var(--lab-gold)]">Choose your size <span aria-hidden="true" className="ml-3">↗</span></span>
                </div>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <a href={shop.cta.href} className="lab-btn lab-btn-primary">Explore the full collection <span aria-hidden="true">↗</span></a>
          <a href={shop.cart.href} className="lab-btn lab-btn-ghost">View your bag</a>
        </div>
      </div>
    </section>
  );
}
