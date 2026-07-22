"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";

type ProductImage = {
  src: string;
  alt?: string | null;
  width?: number;
  height?: number;
};

type ProductVariant = {
  id: number;
  title: string;
  price: string;
  available: boolean;
};

type ProductCardProps = {
  id: number;
  index: number;
  images: ProductImage[];
  name: string;
  note: string;
  shopDomain: string;
  variants: ProductVariant[];
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function ProductCard({ id, index, images, name, note, shopDomain, variants }: ProductCardProps) {
  const [activeImage, setActiveImage] = useState(0);
  const availableVariants = variants.filter((variant) => variant.available);
  const nextImage = images.length > 1 ? (activeImage + 1) % images.length : activeImage;
  const front = images[activeImage];
  const back = images[nextImage];

  const handleTilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * 9}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * 12}deg`);
  };

  const resetTilt = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <article className="product">
      <div
        className={`productStage${images.length > 1 ? " hasSpin" : ""}`}
        onPointerMove={handleTilt}
        onPointerLeave={resetTilt}
        style={{ "--float-delay": `${(index % 6) * -0.4}s` } as CSSProperties}
      >
        <span className="orbitRing" aria-hidden="true" />
        <div className="tiltRig">
          <div className="turntable">
            <figure className="spinFace spinFront">
              <img src={front.src} alt={front.alt || `${name}, selected mockup`} width={front.width} height={front.height} loading={index < 3 ? "eager" : "lazy"} fetchPriority={index < 3 ? "high" : "auto"} decoding="async" />
            </figure>
            <figure className="spinFace spinBack" aria-hidden="true">
              <img src={back.src} alt="" width={back.width} height={back.height} loading="lazy" decoding="async" />
            </figure>
          </div>
        </div>
        <span className="spinHint">Hover to spin · drag the light</span>
      </div>

      <div className="mockupStrip" aria-label={`All ${images.length} mockups for ${name}`}>
        {images.map((image, imageIndex) => (
          <button type="button" className="mockupThumb" aria-label={`Show mockup ${imageIndex + 1} of ${images.length}`} aria-pressed={activeImage === imageIndex} onClick={() => setActiveImage(imageIndex)} key={`${id}-${imageIndex}`}>
            <img src={image.src} alt="" width={image.width} height={image.height} loading="lazy" decoding="async" />
            <span>{String(imageIndex + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>

      <div className="productMeta"><span>{String(index + 1).padStart(2, "0")}</span><h3>{name}</h3><small>{note}</small></div>
      <form className="shopifyCartForm" action={`https://${shopDomain}/cart/add`} method="post">
        <input type="hidden" name="quantity" value="1" />
        <input type="hidden" name="return_to" value="/cart" />
        {availableVariants.length > 0 ? (
          <>
            <label htmlFor={`variant-${id}`}>{availableVariants.length > 1 ? "Choose color / size" : "Selected option"}</label>
            <select id={`variant-${id}`} name="id" defaultValue={String(availableVariants[0].id)}>
              {availableVariants.map((variant) => <option value={variant.id} key={variant.id}>{variant.title} · {money.format(Number.parseFloat(variant.price))}</option>)}
            </select>
            <button className="shopifyCartButton" type="submit">Add to Shopify cart</button>
          </>
        ) : <button className="shopifyCartButton" type="button" disabled>Sold out on Shopify</button>}
      </form>
    </article>
  );
}
