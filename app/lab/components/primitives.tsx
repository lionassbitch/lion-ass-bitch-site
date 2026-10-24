import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import type { ArtVariant } from "../content";

/** True when the viewport matches a CSS media query. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/**
 * Generated placeholder artwork. Pass `image` to render a real asset instead
 * of the gradient tile; the overlay geometry stays so the look is consistent.
 */
export function ArtTile({
  variant,
  image,
  label,
  className = "",
  children,
}: {
  variant: ArtVariant;
  image?: string;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`lab-art lab-art-${variant} ${className}`}
      style={image ? { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      role={image ? "img" : undefined}
      aria-label={image ? label : undefined}
    >
      {!image && <SacredGeometry className="absolute inset-0 m-auto h-[70%] w-[70%] opacity-30" />}
      {children}
    </div>
  );
}

/** Flower-of-life inspired line drawing used as ambient brand geometry. */
export function SacredGeometry({ className = "", stroke = "#c9a84c" }: { className?: string; stroke?: string }) {
  const r = 28;
  const cx = 100;
  const cy = 100;
  const petals = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + 84 * Math.cos(a)},${cy + 84 * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" fill="none" stroke={stroke} strokeWidth="0.6">
      <circle cx={cx} cy={cy} r={96} opacity={0.7} />
      <circle cx={cx} cy={cy} r={84} opacity={0.4} />
      <polygon points={hex} opacity={0.6} />
      <circle cx={cx} cy={cy} r={r} />
      {petals.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={r} />
      ))}
      <circle cx={cx} cy={cy} r={r * 2} opacity={0.5} />
      <line x1={cx} y1={cy - 96} x2={cx} y2={cy + 96} opacity={0.25} />
      <line x1={cx - 96} y1={cy} x2={cx + 96} y2={cy} opacity={0.25} />
    </svg>
  );
}

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
};

/** Fade-up once the element enters the viewport. Respects reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "p" | "h2" | "h3" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      variants={reduce ? reducedVariants : revealVariants}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
    >
      {children}
    </Comp>
  );
}

/** Eyebrow with a rule. `crimson` switches to the sigil-set accent. */
export function SectionLabel({ children, crimson = false }: { children: ReactNode; crimson?: boolean }) {
  return (
    <Reveal as="p" className={`lab-eyebrow mb-6 flex items-center gap-4 ${crimson ? "lab-eyebrow-crimson" : ""}`}>
      <span className="h-px w-10 bg-[var(--lab-gold)]" aria-hidden="true" />
      {children}
    </Reveal>
  );
}
