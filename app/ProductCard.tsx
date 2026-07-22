"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { findGarmentModel } from "./garment-models";

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
  handle: string;
  id: number;
  index: number;
  images: ProductImage[];
  name: string;
  note: string;
  shopDomain: string;
  variants: ProductVariant[];
};

type ModelViewerElement = HTMLElement & {
  cameraOrbit?: string;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function normalizeFrame(frame: number, length: number) {
  return ((frame % length) + length) % length;
}

function GlbGarment({ name, poster, src }: { name: string; poster: string; src: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;

    void import("@google/model-viewer").then(() => {
      if (cancelled || !host) return;

      const viewer = document.createElement("model-viewer") as ModelViewerElement;
      viewer.setAttribute("src", src);
      viewer.setAttribute("poster", poster);
      viewer.setAttribute("alt", `${name}, interactive 360 degree garment model`);
      viewer.setAttribute("camera-controls", "");
      viewer.setAttribute("auto-rotate", "");
      viewer.setAttribute("auto-rotate-delay", "0");
      viewer.setAttribute("rotation-per-second", "18deg");
      viewer.setAttribute("interaction-prompt", "none");
      viewer.setAttribute("shadow-intensity", "0");
      viewer.setAttribute("environment-image", "neutral");
      viewer.setAttribute("exposure", "1.05");
      viewer.setAttribute("touch-action", "pan-y");
      viewer.className = "garmentModel";
      host.replaceChildren(viewer);
    });

    return () => {
      cancelled = true;
      host?.replaceChildren();
    };
  }, [name, poster, src]);

  return <div className="garmentModelHost" ref={hostRef} />;
}

export default function ProductCard({ handle, id, index, images, name, note, shopDomain, variants }: ProductCardProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [hovering, setHovering] = useState(false);
  const dragStart = useRef<{ frame: number; x: number } | null>(null);
  const modelSrc = findGarmentModel(handle, name);
  const availableVariants = variants.filter((variant) => variant.available);
  const activeFrame = images[activeImage] ?? images[0];

  useEffect(() => {
    if (modelSrc || !hovering || images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveImage((current) => normalizeFrame(current + 1, images.length));
    }, images.length > 4 ? 520 : 1250);

    return () => window.clearInterval(interval);
  }, [hovering, images.length, modelSrc]);

  const stepFrame = (delta: number) => {
    if (images.length < 2) return;
    setActiveImage((current) => normalizeFrame(current + delta, images.length));
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (modelSrc || images.length < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { frame: activeImage, x: event.clientX };
    event.currentTarget.dataset.dragging = "true";
  };

  const dragGarment = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || modelSrc || images.length < 2) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const frameWidth = Math.max(34, bounds.width / Math.max(images.length * 1.5, 5));
    const frameDelta = Math.round((dragStart.current.x - event.clientX) / frameWidth);
    setActiveImage(normalizeFrame(dragStart.current.frame + frameDelta, images.length));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (modelSrc) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepFrame(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepFrame(1);
    }
  };

  return (
    <article className="product">
      <div
        aria-label={`${name}. ${modelSrc ? "Drag to rotate the garment in 360 degrees." : images.length > 1 ? "Drag or use arrow keys to rotate through garment angles." : "Garment view."}`}
        className={`productStage${modelSrc ? " hasModel" : images.length > 1 ? " hasFrames" : ""}`}
        onKeyDown={handleKeys}
        onPointerCancel={endDrag}
        onPointerDown={startDrag}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={(event) => {
          setHovering(false);
          endDrag(event);
        }}
        onPointerMove={dragGarment}
        onPointerUp={endDrag}
        role="group"
        tabIndex={0}
      >
        {modelSrc ? (
          <GlbGarment name={name} poster={images[0].src} src={modelSrc} />
        ) : (
          <figure className="garmentMedia" key={`${id}-${activeImage}`}>
            <img
              src={activeFrame.src}
              alt={activeFrame.alt || `${name}, angle ${activeImage + 1} of ${images.length}`}
              width={activeFrame.width}
              height={activeFrame.height}
              loading={index < 3 ? "eager" : "lazy"}
              fetchPriority={index < 3 ? "high" : "auto"}
              decoding="async"
              draggable="false"
            />
          </figure>
        )}
        <span className="spinHint">
          {modelSrc ? "Drag garment · 360°" : images.length > 1 ? `Drag garment · ${activeImage + 1}/${images.length}` : "Garment view"}
        </span>
      </div>

      <div className="mockupStrip" aria-label={`All ${images.length} garment angles for ${name}`}>
        {images.map((image, imageIndex) => (
          <button
            type="button"
            className="mockupThumb"
            aria-label={`Show garment angle ${imageIndex + 1} of ${images.length}`}
            aria-pressed={activeImage === imageIndex}
            onClick={() => setActiveImage(imageIndex)}
            key={`${id}-${imageIndex}`}
          >
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
