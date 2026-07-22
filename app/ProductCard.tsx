"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

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
  const [isDragging, setIsDragging] = useState(false);
  const dragX = useRef(0);
  const availableVariants = variants.filter((variant) => variant.available);
  const nextImage = images.length > 1 ? (activeImage + 1) % images.length : activeImage;
  const front = images[activeImage];
  const back = images[nextImage];

  const handleTilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * 9}deg`);
      event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * 12}deg`);
    }

    if (!isDragging || images.length < 2) return;
    const distance = event.clientX - dragX.current;
    if (Math.abs(distance) < 34) return;
    setActiveImage((current) => (current + (distance > 0 ? 1 : -1) + images.length) % images.length);
    dragX.current = event.clientX;
  };

  const startSpin = (event: PointerEvent<HTMLDivElement>) => {
    if (images.length < 2) return;
    dragX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const stopSpin = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  };

  const handleSpinKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (images.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    setActiveImage((current) => (current + (event.key === "ArrowRight" ? 1 : -1) + images.length) % images.length);
  };

  const resetTilt = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <article className="product">
      <div
        className={`productStage${images.length > 1 ? " hasSpin" : ""}${isDragging ? " isDragging" : ""}`}
        role="group"
        tabIndex={0}
        aria-label={`${name} interactive product view. Move to tilt; drag or use left and right arrow keys to rotate through ${images.length} mockups.`}
        onPointerDown={startSpin}
        onPointerMove={handleTilt}
        onPointerUp={stopSpin}
        onPointerCancel={stopSpin}
        onPointerLeave={(event) => { resetTilt(event); setIsDragging(false); }}
        onKeyDown={handleSpinKeys}
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
        <span className="spinHint">3D view · drag / hover · {activeImage + 1}/{images.length}</span>
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
