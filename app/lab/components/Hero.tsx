import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { labContent } from "../content";

/**
 * Hero — "The Monument Awakens".
 *
 * A pinned 100svh stage over a 400vh runway. Three image planes give depth
 * (mural far + blurred, crest mid, kintsugi bust near). On mount the bust
 * materialises, a light sweep crosses it and the metallic wordmark wipes in.
 * Scrolling then drives: the gold cracks ignite (lighten/screen copies of the
 * bust), the crest rises and turns behind it, every plane pushes in at its own
 * rate, and finally the monument pushes through the camera and resolves into
 * the crimson LAB monogram, which hands off to the manifesto.
 *
 * Reduced motion renders the awakened composite statically, followed by the
 * monogram as a plain figure.
 */
export function Hero() {
  const reduce = useReducedMotion();
  return reduce ? <StaticHero /> : <ScrollHero />;
}

const { hero, sigils } = labContent;
const img = hero.images;

function usePreloadHeroImages() {
  useEffect(() => {
    const links = [img.bust.src, img.wordmark.src].map(href => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach(l => l.remove());
  }, []);
}

function ScrollHero() {
  usePreloadHeroImages();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Far plane — mural
  const muralOpacity = useTransform(p, [0, 0.25, 0.55, 0.72], [0.28, 0.5, 0.5, 0]);
  const muralScale = useTransform(p, [0, 0.75], [1.25, 1.12]);
  const muralY = useTransform(p, [0, 0.75], ["0%", "-6%"]);

  // Mid plane — crest
  const crestOpacity = useTransform(p, [0.04, 0.3, 0.55, 0.7], [0, 0.6, 0.6, 0]);
  const crestScale = useTransform(p, [0, 0.75], [0.78, 1.14]);
  const crestRotate = useTransform(p, [0, 0.75], [-6, 6]);
  const crestY = useTransform(p, [0, 0.75], ["4%", "-10%"]);

  // Near plane — bust and its glow. Past 0.6 it pushes through the camera.
  const bustScale = useTransform(p, [0, 0.6, 0.8], [1, 1.16, 1.5]);
  const bustY = useTransform(p, [0, 0.6, 0.8], ["0%", "-5%", "6%"]);
  const bustOpacity = useTransform(p, [0.62, 0.78], [1, 0]);
  const glowOpacity = useTransform(p, [0.02, 0.32], [0, 1]);
  const haloOpacity = useTransform(p, [0.06, 0.36], [0, 0.6]);
  const sweepX = useTransform(p, [0.28, 0.58], ["-70%", "70%"]);
  const sweepOpacity = useTransform(p, [0.26, 0.3, 0.56, 0.6], [0, 1, 1, 0]);

  // Wordmark + copy
  const wordmarkY = useTransform(p, [0, 0.7], ["0%", "-40%"]);
  const wordmarkOpacity = useTransform(p, [0.54, 0.66], [1, 0]);
  const copyOpacity = useTransform(p, [0.48, 0.6], [1, 0]);
  const copyY = useTransform(p, [0, 0.6], [0, -40]);
  const cueOpacity = useTransform(p, [0, 0.06], [1, 0]);

  // Final beat — the monogram resolves out of the dissolving monument
  const markOpacity = useTransform(p, [0.66, 0.84], [0, 1]);
  const markScale = useTransform(p, [0.62, 0.86, 1], [0.62, 1, 1.05]);
  const markY = useTransform(p, [0.86, 1], ["0%", "-6%"]);
  const bloomOpacity = useTransform(p, [0.64, 0.86, 1], [0, 1, 0.7]);
  const captionOpacity = useTransform(p, [0.82, 0.92], [0, 1]);
  const captionY = useTransform(p, [0.82, 0.92], [24, 0]);
  const exitShade = useTransform(p, [0.92, 1], [0, 0.45]);

  return (
    <section id="top" ref={ref} className="relative h-[400vh]" aria-label="Lion Ass Bitch">
      <div className="sticky top-0 lab-stage">
        <h1 className="sr-only">{hero.words.join(" ")}</h1>

        <motion.div className="lab-plane lab-plane-mural" style={{ opacity: muralOpacity, scale: muralScale, y: muralY }} aria-hidden="true">
          <img src={img.mural.src} alt="" decoding="async" fetchPriority="low" />
        </motion.div>

        <motion.div className="lab-plane lab-plane-crest" style={{ opacity: crestOpacity, scale: crestScale, rotate: crestRotate, y: crestY }} aria-hidden="true">
          <img src={img.crest.src} alt="" decoding="async" fetchPriority="low" />
        </motion.div>

        <motion.div className="lab-bust" style={{ scale: bustScale, y: bustY, opacity: bustOpacity }}>
          <div className="lab-bust-inner lab-bust-intro">
            <img src={img.bust.src} alt={img.bust.alt} decoding="async" fetchPriority="high" />
            <motion.img className="lab-bust-halo" src={img.bust.src} alt="" aria-hidden="true" style={{ opacity: haloOpacity }} />
            <motion.img className="lab-bust-glow" src={img.bust.src} alt="" aria-hidden="true" style={{ opacity: glowOpacity }} />
            <div className="lab-sweep lab-sweep-intro" aria-hidden="true" />
            <motion.div className="lab-sweep" style={{ x: sweepX, opacity: sweepOpacity }} aria-hidden="true" />
          </div>
        </motion.div>

        <div className="lab-vignette" aria-hidden="true" />

        <motion.div className="lab-section absolute inset-x-0 top-[12svh]" style={{ opacity: copyOpacity }}>
          <motion.p className="lab-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 2.2 }}>
            {hero.eyebrow}
          </motion.p>
        </motion.div>

        {/* Plain column on purpose: a transform/opacity here would isolate the wordmark's screen blend from the scene. */}
        <div className="lab-copy">
          <motion.div className="lab-wordmark lab-wordmark-intro" style={{ y: wordmarkY, opacity: wordmarkOpacity }}>
            <img src={img.wordmark.src} alt={img.wordmark.alt} decoding="async" fetchPriority="high" />
          </motion.div>
          <motion.div className="hidden md:block" style={{ opacity: copyOpacity, y: copyY }}>
            <motion.p
              className="lab-serif max-w-sm text-lg leading-snug text-[var(--lab-bone)]/85 md:text-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2.6 }}
            >
              {hero.lede}
            </motion.p>
          </motion.div>
          <motion.div style={{ opacity: copyOpacity, y: copyY }}>
            <motion.div className="flex flex-wrap gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 2.9 }}>
              <a href={hero.primaryCta.href} className="lab-btn lab-btn-primary">
                {hero.primaryCta.label}
              </a>
              <a href={hero.secondaryCta.href} className="lab-btn lab-btn-ghost">
                {hero.secondaryCta.label}
              </a>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="lab-section absolute bottom-6 left-0 hidden flex-col items-start gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--lab-muted)] md:flex"
          style={{ opacity: cueOpacity }}
        >
          <span>{hero.scrollCue}</span>
          <span className="lab-cue block h-8 w-px bg-[var(--lab-gold)]" aria-hidden="true" />
        </motion.div>

        {/* Final beat: the mark */}
        <motion.div className="lab-mark-bloom" style={{ opacity: bloomOpacity }} aria-hidden="true" />
        <div className="lab-mark">
          <motion.img
            className="lab-mark-img"
            src={sigils.monogram.src}
            alt={sigils.monogram.alt}
            decoding="async"
            loading="lazy"
            style={{ opacity: markOpacity, scale: markScale, y: markY }}
          />
        </div>
        <motion.div className="lab-section absolute inset-x-0 bottom-[9svh] text-center" style={{ opacity: captionOpacity, y: captionY }}>
          <p className="lab-eyebrow lab-eyebrow-crimson mb-3">{hero.mark.eyebrow}</p>
          <p className="lab-display text-[clamp(1rem,2.2vw,1.6rem)] uppercase tracking-[0.2em] text-[var(--lab-bone)]/80">{hero.mark.line}</p>
        </motion.div>

        <motion.div className="pointer-events-none absolute inset-0 bg-[var(--lab-bg)]" style={{ opacity: exitShade }} aria-hidden="true" />
      </div>
    </section>
  );
}

/** Static composite for prefers-reduced-motion: the awakened monument, then the mark. */
function StaticHero() {
  usePreloadHeroImages();
  return (
    <section id="top" aria-label="Lion Ass Bitch">
      <div className="lab-stage relative">
        <h1 className="sr-only">{hero.words.join(" ")}</h1>
        <div className="lab-plane lab-plane-mural" style={{ opacity: 0.4, transform: "scale(1.15)" }} aria-hidden="true">
          <img src={img.mural.src} alt="" decoding="async" />
        </div>
        <div className="lab-plane lab-plane-crest" style={{ opacity: 0.55 }} aria-hidden="true">
          <img src={img.crest.src} alt="" decoding="async" />
        </div>
        <div className="lab-bust">
          <div className="lab-bust-inner">
            <img src={img.bust.src} alt={img.bust.alt} decoding="async" />
            <img className="lab-bust-halo" src={img.bust.src} alt="" aria-hidden="true" style={{ opacity: 0.5 }} />
            <img className="lab-bust-glow" src={img.bust.src} alt="" aria-hidden="true" />
          </div>
        </div>
        <div className="lab-vignette" aria-hidden="true" />
        <div className="lab-section absolute inset-x-0 top-[12svh]">
          <p className="lab-eyebrow">{hero.eyebrow}</p>
        </div>
        <div className="lab-copy">
          <div className="lab-wordmark">
            <img src={img.wordmark.src} alt={img.wordmark.alt} decoding="async" />
          </div>
          <p className="lab-serif hidden max-w-sm text-lg leading-snug text-[var(--lab-bone)]/85 md:block md:text-xl">{hero.lede}</p>
          <div className="flex flex-wrap gap-3">
            <a href={hero.primaryCta.href} className="lab-btn lab-btn-primary">
              {hero.primaryCta.label}
            </a>
            <a href={hero.secondaryCta.href} className="lab-btn lab-btn-ghost">
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>

      <figure className="lab-section relative grid place-items-center bg-[#050507] py-16 text-center">
        <div className="lab-mark-bloom" style={{ opacity: 0.8 }} aria-hidden="true" />
        <img src={sigils.monogram.src} alt={sigils.monogram.alt} decoding="async" loading="lazy" className="lab-mark-img relative" />
        <figcaption className="relative mt-6">
          <p className="lab-eyebrow lab-eyebrow-crimson mb-3">{hero.mark.eyebrow}</p>
          <p className="lab-display text-[clamp(1rem,2.2vw,1.6rem)] uppercase tracking-[0.2em] text-[var(--lab-bone)]/80">{hero.mark.line}</p>
        </figcaption>
      </figure>
    </section>
  );
}
