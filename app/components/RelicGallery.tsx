"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { findGarmentModel } from "../garment-models";
import type { ShopifyImage } from "../lib/catalog";

type ModelViewerElement = HTMLElement & { cameraOrbit?: string };

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

export default function RelicGallery({
  handle,
  name,
  images,
  eager = false,
}: {
  handle: string;
  name: string;
  images: ShopifyImage[];
  eager?: boolean;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [hovering, setHovering] = useState(false);
  const dragStart = useRef<{ frame: number; x: number } | null>(null);
  const modelSrc = findGarmentModel(handle, name);
  const activeFrame = images[activeImage] ?? images[0];

  useEffect(() => {
    if (modelSrc || !hovering || images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(
      () => setActiveImage((current) => normalizeFrame(current + 1, images.length)),
      images.length > 4 ? 520 : 1250,
    );
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

  if (!activeFrame) return null;

  return (
    <div className="relicGallery">
      <div
        aria-label={`${name}. ${
          modelSrc
            ? "Drag to rotate the garment in 360 degrees."
            : images.length > 1
              ? "Drag or use arrow keys to rotate through garment angles."
              : "Garment view."
        }`}
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
          <figure className="garmentMedia" key={`${handle}-${activeImage}`}>
            <img
              src={activeFrame.src}
              alt={activeFrame.alt || `${name}, angle ${activeImage + 1} of ${images.length}`}
              width={activeFrame.width}
              height={activeFrame.height}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              draggable="false"
            />
          </figure>
        )}
        <span className="spinHint">
          {modelSrc
            ? "Drag garment · 360°"
            : images.length > 1
              ? `Drag garment · ${activeImage + 1}/${images.length}`
              : "Garment view"}
        </span>
      </div>

      {images.length > 1 ? (
        <div className="mockupStrip" aria-label={`All ${images.length} garment angles for ${name}`}>
          {images.map((image, imageIndex) => (
            <button
              type="button"
              className="mockupThumb"
              aria-label={`Show garment angle ${imageIndex + 1} of ${images.length}`}
              aria-pressed={activeImage === imageIndex}
              onClick={() => setActiveImage(imageIndex)}
              key={`${handle}-${imageIndex}`}
            >
              <img src={image.src} alt="" width={image.width} height={image.height} loading="lazy" decoding="async" />
              <span>{String(imageIndex + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
