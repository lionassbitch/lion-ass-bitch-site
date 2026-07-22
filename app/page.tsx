import catalogSnapshot from "./catalog-snapshot";

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
        <video autoPlay muted loop playsInline poster="/assets/crystal-city.png"><source src="/assets/artifact-02.mp4" type="video/mp4" /></video>
        <div className="veil" />
        <div className="heroCopy">
          <p className="eyebrow">The current inventory / The gate is open</p>
          <h1>Wear the<br/><i>myth.</i></h1>
          <p className="intro">Art, apparel, and artifacts for anyone bold enough to enter. Lion Ass Bitch makes luxury louder, stranger, and impossible to ignore.</p>
          <div className="actions"><a className="button light" href="#drop">Shop all live pieces</a><a className="button ghost" href="#world">Enter the world</a></div>
        </div>
        <p className="sideNote">Luxury with teeth · New York · Est. 2022</p>
      </section>

      <section className="marquee" aria-label="Brand values"><div>WEAR THE MYTH <span>✦</span> NO PERMISSION NEEDED <span>✦</span> ART FOR THE BODY <span>✦</span> WEAR THE MYTH <span>✦</span></div></section>

      <section className="drop" id="drop">
        <div className="sectionHead"><div><p className="eyebrow">All live pieces / {products.length} available</p><h2>Current<br/>inventory</h2></div><p>Every storefront-ready piece and every Shopify mockup in one living universe. Choose your exact option, then add it straight to the Shopify cart.</p></div>
        <div className="productGrid">
          {products.map((product, index) => {
            const availableVariants = product.variants.filter((variant) => variant.available);
            const hasMultipleVariants = availableVariants.length > 1;

            return (
              <article className="product" key={product.id}>
                <div className="productGallery" role="group" aria-label={`${product.name} mockups`}>
                  <div className="imageRail">
                    {product.images.map((image, imageIndex) => (
                      <figure className="productMockup" key={`${product.id}-${imageIndex}`}>
                      <img
                          src={image.src}
                          alt={image.alt || `${product.name}, mockup ${imageIndex + 1} of ${product.images.length}`}
                          width={image.width}
                          height={image.height}
                          loading={index < 3 && imageIndex === 0 ? "eager" : "lazy"}
                          fetchPriority={index < 3 && imageIndex === 0 ? "high" : "auto"}
                        decoding="async"
                      />
                        <figcaption>{String(imageIndex + 1).padStart(2, "0")} / {String(product.images.length).padStart(2, "0")}</figcaption>
                      </figure>
                    ))}
                  </div>
                  {product.images.length > 1 ? <span className="galleryHint">Swipe / scroll all {product.images.length} mockups →</span> : null}
                </div>
                <div className="productMeta"><span>{String(index + 1).padStart(2, "0")}</span><h3>{product.name}</h3><small>{product.note}</small></div>
                <form className="shopifyCartForm" action={`https://${SHOP_DOMAIN}/cart/add`} method="post">
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="return_to" value="/cart" />
                  {availableVariants.length > 0 ? (
                    <>
                      <label htmlFor={`variant-${product.id}`}>{hasMultipleVariants ? "Choose color / size" : "Selected option"}</label>
                      <select id={`variant-${product.id}`} name="id" defaultValue={String(availableVariants[0].id)}>
                        {availableVariants.map((variant) => (
                          <option value={variant.id} key={variant.id}>{variant.title} · {money.format(Number.parseFloat(variant.price))}</option>
                        ))}
                      </select>
                      <button className="shopifyCartButton" type="submit">Add to Shopify cart</button>
                    </>
                  ) : (
                    <button className="shopifyCartButton" type="button" disabled>Sold out on Shopify</button>
                  )}
                </form>
              </article>
            );
          })}
        </div>
        <a className="textLink" href={`https://${SHOP_DOMAIN}/cart`}>View Shopify cart <span>→</span></a>
      </section>

      <section className="world" id="world">
        <img src="/assets/court-walk.png" alt="Lion Ass Bitch fashion campaign" />
        <div className="worldCopy"><p className="eyebrow">Not a label. A universe.</p><h2>Come as<br/>you are.<br/><i>Leave iconic.</i></h2><p>Every drop is a new room: cosmic intelligence, monstrous beauty, crystal energy, and a cast of mascots with something to say.</p><a className="button light" href="https://www.lionassbitch.com/">Explore the LAB</a></div>
      </section>

      <section className="manifesto" id="manifesto">
        <p className="eyebrow">The manifesto</p>
        <p className="statement">Clothes are not a costume.<br/>They are <em>evidence.</em></p>
        <div className="manifestoGrid"><p>Lion Ass Bitch is for the maximalist, the minimalist, the misfit, and the main character. No gatekeeping. No shrinking. No permission needed.</p><p>Made to order. Shipped worldwide.<br/>Designed in the LAB.</p></div>
      </section>

      <section className="finalCta"><video autoPlay muted loop playsInline poster="/assets/crystal-city.png"><source src="/assets/artifact-03.mp4" type="video/mp4" /></video><div className="veil"/><div><p className="eyebrow">The gate is open</p><h2>Enter<br/>the LAB.</h2><a className="button light" href={`https://${SHOP_DOMAIN}/cart`}>View Shopify cart</a></div></section>
      <footer><a className="wordmark" href="#top"><span>LAB</span><b>Lion Ass Bitch</b></a><p>Luxury with teeth. Myth with receipts.</p><div><a href="https://www.instagram.com/lionassbitch/">Instagram</a><a href={`https://${SHOP_DOMAIN}/cart`}>Shopify cart</a></div><small>© 2026 Lion Ass Bitch LLC</small></footer>
    </main>
  );
}
