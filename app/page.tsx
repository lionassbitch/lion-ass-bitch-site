const products = [
  { name: "Orangecicle Lion Hoodie", note: "$56.12 · Unisex", href: "https://exsuvera-presents.myshopify.com/products/lion-lab-orangecicle-frayed-fleece-hoodie", front: "/products/hoodie-front.png", back: "/products/hoodie-back.png" },
  { name: "Neon Crown Portrait Knit Tee", note: "$45.94 · Unisex", href: "https://exsuvera-presents.myshopify.com/products/lab-neon-crown-portrait-knit-tee", front: "/products/tee-front.png", back: "/products/tee-back.png" },
  { name: "Denim Cat Eye Jacket", note: "$75.99 · Unisex", href: "https://exsuvera-presents.myshopify.com/products/denim-cat-eye-s-heavyweight-jacket", front: "/products/jacket-front.png", back: "/products/jacket-back.png" },
];

export default function Home() {
  return (
    <main>
      <header className="nav">
        <a className="wordmark" href="#top"><span>LAB</span><b>Lion Ass Bitch</b></a>
        <nav aria-label="Main navigation"><a href="#drop">Drop 01</a><a href="#world">The World</a><a href="#manifesto">Manifesto</a></nav>
        <a className="bag" href="https://exsuvera-presents.myshopify.com/">Shop all <span>↗</span></a>
      </header>

      <section className="hero" id="top">
        <video autoPlay muted loop playsInline poster="/assets/crystal-city.png"><source src="/assets/artifact-02.mp4" type="video/mp4" /></video>
        <div className="veil" />
        <div className="heroCopy">
          <p className="eyebrow">Drop 01 / The first gate is open</p>
          <h1>Wear the<br/><i>myth.</i></h1>
          <p className="intro">Art, apparel, and artifacts for anyone bold enough to enter. Lion Ass Bitch makes luxury louder, stranger, and impossible to ignore.</p>
          <div className="actions"><a className="button light" href="#drop">Shop Drop 01</a><a className="button ghost" href="#world">Enter the world</a></div>
        </div>
        <p className="sideNote">Luxury with teeth · New York · Est. 2022</p>
      </section>

      <section className="marquee" aria-label="Brand values"><div>WEAR THE MYTH <span>✦</span> NO PERMISSION NEEDED <span>✦</span> ART FOR THE BODY <span>✦</span> WEAR THE MYTH <span>✦</span></div></section>

      <section className="drop" id="drop">
        <div className="sectionHead"><div><p className="eyebrow">New arrivals</p><h2>Drop<br/>01</h2></div><p>Three entry points. One living universe. Built to be worn, collected, and remembered.</p></div>
        <div className="productGrid">
          {products.map((product, index) => (
            <a className="product" href={product.href} key={product.name} target="_blank" rel="noreferrer" aria-label={`View ${product.name} on Shopify. Hover to rotate from front to back.`}>
              <div className="flipScene">
                <div className="flipCard">
                  <figure className="productFace productFront"><img src={product.front} alt={`${product.name}, front view`} /><figcaption>Front</figcaption></figure>
                  <figure className="productFace productBack"><img src={product.back} alt={`${product.name}, back view`} /><figcaption>Back</figcaption></figure>
                </div>
                <span className="spinHint"><i>↻</i> Hover to flip</span>
              </div>
              <div className="productMeta"><span>0{index + 1}</span><h3>{product.name}</h3><small>{product.note} ↗</small></div>
            </a>
          ))}
        </div>
        <a className="textLink" href="https://exsuvera-presents.myshopify.com/">View the full collection <span>→</span></a>
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

      <section className="finalCta"><video autoPlay muted loop playsInline poster="/assets/crystal-city.png"><source src="/assets/artifact-03.mp4" type="video/mp4" /></video><div className="veil"/><div><p className="eyebrow">The gate is open</p><h2>Enter<br/>the LAB.</h2><a className="button light" href="https://exsuvera-presents.myshopify.com/">Shop everything</a></div></section>
      <footer><a className="wordmark" href="#top"><span>LAB</span><b>Lion Ass Bitch</b></a><p>Luxury with teeth. Myth with receipts.</p><div><a href="https://www.instagram.com/lionassbitch/">Instagram</a><a href="https://exsuvera-presents.myshopify.com/">Shopify</a></div><small>© 2026 Lion Ass Bitch LLC</small></footer>
    </main>
  );
}
