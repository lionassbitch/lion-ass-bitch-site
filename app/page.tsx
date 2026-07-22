import catalogSnapshot from "./catalog-snapshot";
import ProductCard from "./ProductCard";

const SHOP_DOMAIN = "exsuvera-presents.myshopify.com";
const PRODUCTS_PER_PAGE = 250;

type ShopifyImage = {
  src: string;
  alt?: string | null;
  width?: number;
  height?: number;
};

type ShopifyVariant = {
  id: number;
  title: string;
  price: string;
  available: boolean;
};

type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  images?: ShopifyImage[];
  variants?: ShopifyVariant[];
};

type ProductCard = {
  handle: string;
  id: number;
  name: string;
  note: string;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function toProductCard(product: ShopifyProduct): ProductCard | null {
  const images = product.images ?? [];
  if (!images[0]) return null;

  const prices = (product.variants ?? [])
    .map((variant) => Number.parseFloat(variant.price))
    .filter(Number.isFinite);
  const minimumPrice = prices.length > 0 ? Math.min(...prices) : null;
  const hasPriceRange = new Set(prices).size > 1;

  return {
    handle: product.handle,
    id: product.id,
    name: product.title,
    note: minimumPrice === null ? "View price" : `${hasPriceRange ? "From " : ""}${money.format(minimumPrice)}`,
    images,
    variants: product.variants ?? [],
  };
}

const fallbackProducts = (catalogSnapshot as ShopifyProduct[])
  .map(toProductCard)
  .filter((product): product is ProductCard => product !== null);

async function getPublishedProducts(): Promise<ProductCard[]> {
  try {
    const products: ShopifyProduct[] = [];

    for (let page = 1; page <= 20; page += 1) {
      const response = await fetch(
        `https://${SHOP_DOMAIN}/products.json?limit=${PRODUCTS_PER_PAGE}&page=${page}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error(`Shopify catalog returned ${response.status}`);

      const payload = (await response.json()) as { products?: ShopifyProduct[] };
      const batch = payload.products ?? [];
      products.push(...batch);

      if (batch.length < PRODUCTS_PER_PAGE) break;
    }

    const uniqueProducts = [...new Map(products.map((product) => [product.id, product])).values()];
    const cards = uniqueProducts
      .map(toProductCard)
      .filter((product): product is ProductCard => product !== null);

    return cards.length > 0 ? cards : fallbackProducts;
  } catch (error) {
    console.error("Unable to load the live Shopify catalog", error);
    return fallbackProducts;
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublishedProducts();

  return (
    <main>
      <header className="nav">
        <a className="wordmark" href="#top"><span>LAB</span><b>Lion Ass Bitch</b></a>
        <nav aria-label="Main navigation"><a href="#drop">Shop all</a><a href="#world">The World</a><a href="#manifesto">Manifesto</a></nav>
        <a className="bag" href={`https://${SHOP_DOMAIN}/cart`}>Shopify cart <span>↗</span></a>
      </header>

      <section className="hero" id="top">
        <video autoPlay muted loop playsInline poster="/assets/lab-trinity-neon.webp"><source src="/assets/lab-trinity-loop.mp4" type="video/mp4" /></video>
        <div className="veil" />
        <div className="heroCopy">
          <p className="eyebrow">The current inventory / The gate is open</p>
          <h1>Turned a diss<br/><i>into dominion.</i></h1>
          <p className="intro">They named the insult. We claimed the power. Lion Ass Bitch is Bronx-born fashion, art, and attitude for anyone who refuses to shrink.</p>
          <div className="actions"><a className="button light" href="#drop">Shop all live pieces</a><a className="button ghost" href="#world">Enter the world</a></div>
        </div>
        <p className="sideNote">Luxury with teeth · New York · Est. 2022</p>
      </section>

      <section className="marquee" aria-label="Brand values"><div>TURNED A DISS INTO DOMINION <span>✦</span> THEY NAMED THE INSULT. WE CLAIMED THE POWER. <span>✦</span> FUCK FAKE <span>✦</span> TURNED A DISS INTO DOMINION <span>✦</span></div></section>

      <figure className="warningBanner">
        <img src="/assets/lab-warning-banner.webp" alt="Fuck fake. This is not a brand. This is a warning." />
      </figure>

      <section className="drop" id="drop">
        <div className="sectionHead"><div><p className="eyebrow">All live pieces / {products.length} available</p><h2>Current<br/>inventory</h2></div><p>Every storefront-ready piece in one living universe. Drag the garment itself to inspect every available angle, choose your exact option, then add it straight to the Shopify cart.</p></div>
        <div className="productGrid">
          {products.map((product, index) => <ProductCard {...product} index={index} shopDomain={SHOP_DOMAIN} key={product.id} />)}
        </div>
        <a className="textLink" href={`https://${SHOP_DOMAIN}/cart`}>View Shopify cart <span>→</span></a>
      </section>

      <section className="world" id="world">
        <img src="/assets/lab-trinity-neon.webp" alt="Pryde, Kickz, and Khemetz walking through a neon Bronx alley" />
        <div className="worldCopy"><p className="eyebrow">Not a label. A signal.</p><h2>Turned a diss<br/>into <i>dominion.</i></h2><p>They named the insult. We claimed the power. Three archetypes carry the warning from the Bronx into every piece: sovereign will, stubborn truth, and sacred reckoning.</p><a className="button light" href="#drop">Wear the warning</a></div>
      </section>

      <section className="trinity" aria-labelledby="trinity-title">
        <div className="trinityHead"><p className="eyebrow">The bloodline</p><h2 id="trinity-title">Three forces.<br/>No permission.</h2></div>
        <article><img src="/assets/pryde-threshold.webp" alt="Pryde, the lion, standing in a neon temple" /><div><span>01 / Sovereign will</span><h3>Pryde</h3></div></article>
        <article><img src="/assets/kickz-neon.webp" alt="Kickz, the donkey, walking through a neon rain-soaked street" /><div><span>02 / Stubborn truth</span><h3>Kickz</h3></div></article>
        <article><img src="/assets/khemetz-temple.webp" alt="Khemetz, the black jackal, standing in a gold and magenta temple" /><div><span>03 / Sacred reckoning</span><h3>Khemetz</h3></div></article>
      </section>

      <section className="streetFilm">
        <div><p className="eyebrow">Bronx transmission / 01:24</p><h2>Kickz<br/>outside.</h2><p>The mascot leaves the mythology and hits the block. Press play for the full signal.</p></div>
        <video controls playsInline preload="metadata" poster="/assets/kickz-bronx-poster.webp"><source src="/assets/kickz-bronx-scene.mp4" type="video/mp4" /></video>
      </section>

      <section className="manifesto" id="manifesto">
        <p className="eyebrow">The manifesto</p>
        <p className="statement">Clothes are not a costume.<br/>They are <em>evidence.</em></p>
        <img className="manifestoSeal" src="/assets/lab-manifesto-wheel.webp" alt="Fuck fake, be you or be gone manifesto artwork with the LAB trinity" />
        <div className="manifestoGrid"><p>Lion Ass Bitch is for the maximalist, the minimalist, the misfit, and the main character. No gatekeeping. No shrinking. No permission needed.</p><p>Made to order. Shipped worldwide.<br/>Designed in the LAB.</p></div>
      </section>

      <section className="finalCta"><video autoPlay muted loop playsInline poster="/assets/lab-trinity-neon.webp"><source src="/assets/lab-trinity-loop.mp4" type="video/mp4" /></video><div className="veil"/><div><p className="eyebrow">This is not a brand</p><h2>This is<br/>a warning.</h2><a className="button light" href={`https://${SHOP_DOMAIN}/cart`}>View Shopify cart</a></div></section>
      <footer><a className="wordmark" href="#top"><span>LAB</span><b>Lion Ass Bitch</b></a><p>Turned a diss into dominion.</p><div><a href="https://www.instagram.com/lionassbitch/">Instagram</a><a href={`https://${SHOP_DOMAIN}/cart`}>Shopify cart</a></div><small>© 2026 Lion Ass Bitch LLC</small></footer>
    </main>
  );
}
