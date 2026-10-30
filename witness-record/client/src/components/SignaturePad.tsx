import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import { useT } from "../lib/i18n";

export interface SignaturePadHandle {
  toDataUrl: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

/** Pointer-based signature canvas (touch, stylus, mouse). Exports a PNG data URL. */
export const SignaturePad = forwardRef<SignaturePadHandle, { label: string }>(function SignaturePad({ label }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokes = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const { t } = useT();

  const setup = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    // Preserve existing strokes when resizing.
    const snapshot = strokes.current > 0 ? c.toDataURL() : null;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f1b2d";
    if (snapshot) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = snapshot;
    }
  };

  useEffect(() => {
    setup();
    const onResize = () => setup();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
    strokes.current += 1;
    setEmpty(false);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    last.current = null;
    try {
      canvasRef.current!.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    strokes.current = 0;
    setEmpty(true);
  };

  useImperativeHandle(ref, () => ({
    toDataUrl: () => (strokes.current > 0 ? canvasRef.current!.toDataURL("image/png") : null),
    clear,
    isEmpty: () => strokes.current === 0,
  }));

  return (
    <div>
      <div className="sigpad">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        />
        <div className="baseline" />
      </div>
      <div className="actions">
        <button type="button" className="btn secondary" onClick={clear} disabled={empty}>
          {t.sign.clear}
        </button>
        <span className="muted small" aria-live="polite">
          {empty ? t.sign.drawHelp : ""}
        </span>
      </div>
    </div>
  );
});
