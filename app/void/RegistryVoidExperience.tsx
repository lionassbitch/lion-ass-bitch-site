"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { getChapterAt, VOID_SCROLL_PAGES, voidChapters, voidSideBeats } from "../content/void";
import SideBeatSlot from "./SideBeatSlot";
import { usePrefersReducedMotion, useWebGL } from "./usePrefersReducedMotion";
import VoidHud from "./VoidHud";

type CanvasProps = {
  onOffset: (offset: number) => void;
  onElement: (el: HTMLDivElement) => void;
};

function scrollElementTo(el: HTMLElement | null, offset: number, behavior: ScrollBehavior) {
  if (!el) return;
  const max = el.scrollHeight - el.clientHeight;
  el.scrollTo({ behavior, top: Math.max(0, offset) * Math.max(max, 0) });
}

function ReducedMotionJourney({
  chapterId,
  onSelect,
}: {
  chapterId: string;
  onSelect: (offset: number) => void;
}) {
  return (
    <div className="voidStill" role="region" aria-label="Registry Void still chapters">
      {voidChapters.map((chapter) => {
        const current = chapter.id === chapterId;
        return (
          <article
            aria-current={current ? "location" : undefined}
            className="voidStill__card"
            data-active={current ? "true" : "false"}
            id={`void-still-${chapter.id}`}
            key={chapter.id}
          >
            <button
              className="voidStill__hit"
              onClick={() => onSelect(chapter.range[0] + 0.012)}
              type="button"
            >
              <img alt={chapter.plateAlt} src={chapter.plate} />
              <div>
                <p>
                  <span>{chapter.code}</span>
                  {chapter.kicker}
                </p>
                <h2>{chapter.title}</h2>
                <p>{chapter.summary}</p>
              </div>
            </button>
            {chapter.id === "k2" ? (
              <img
                alt="The Registry notice of filing, stamped Filed"
                className="voidStill__notice"
                src="/assets/void/notice-registry.svg"
              />
            ) : null}
            {chapter.id === "k4" ? (
              <img
                alt="The Registry notice of disposition, stamped Void"
                className="voidStill__notice"
                src="/assets/void/notice-void.svg"
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default function RegistryVoidExperience() {
  const prefersReduced = usePrefersReducedMotion();
  const webgl = useWebGL();
  const [forceReduced, setForceReduced] = useState<boolean | null>(null);
  const [offset, setOffset] = useState(0);
  const [ready, setReady] = useState(false);
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const scrollEl = useRef<HTMLDivElement | null>(null);
  const chapter = getChapterAt(offset);
  const reducedMotion = forceReduced ?? prefersReduced;
  const stillMode = reducedMotion || !webgl;

  useEffect(() => {
    document.body.dataset.void = "true";
    return () => {
      delete document.body.dataset.void;
    };
  }, []);

  useEffect(() => {
    if (stillMode) return;
    let cancelled = false;
    void import("./RegistryVoidCanvas").then((mod) => {
      if (!cancelled) setCanvas(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [stillMode]);

  const onOffset = useCallback((value: number) => {
    setOffset((current) => (Math.abs(current - value) > 0.002 ? value : current));
  }, []);

  const onElement = useCallback((el: HTMLDivElement) => {
    el.id = "void-scroll";
    el.tabIndex = 0;
    el.setAttribute("role", "region");
    el.setAttribute(
      "aria-label",
      "Registry Void 3D journey. Scroll or use arrow keys, page keys, or space to travel from the rainy street to VOID city.",
    );
    scrollEl.current = el;
    setReady(true);
  }, []);

  const jumpTo = useCallback(
    (next: number) => {
      const clamped = Math.min(1, Math.max(0, next));
      if (stillMode) {
        setOffset(clamped);
        const target = voidChapters.find((item) => clamped >= item.range[0] && clamped < item.range[1]) ??
          voidChapters[voidChapters.length - 1];
        document.getElementById(`void-still-${target.id}`)?.scrollIntoView({
          behavior: prefersReduced ? "auto" : "smooth",
          block: "nearest",
        });
        return;
      }
      scrollElementTo(scrollEl.current, clamped, prefersReduced ? "auto" : "smooth");
    },
    [prefersReduced, stillMode],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.isContentEditable)
      ) {
        return;
      }
      const step = 1 / (VOID_SCROLL_PAGES * 3.2);
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        jumpTo(offset + (event.key === "PageDown" ? step * 3 : step));
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        jumpTo(offset - (event.key === "PageUp" ? step * 3 : step));
      } else if (event.key === "Home") {
        event.preventDefault();
        jumpTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        jumpTo(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jumpTo, offset]);

  return (
    <div className="voidStage">
      {stillMode ? (
        <ReducedMotionJourney chapterId={chapter.id} onSelect={jumpTo} />
      ) : (
        <>
          {!ready || !Canvas ? <p className="voidStage__boot">Opening the filing…</p> : null}
          {Canvas ? <Canvas onElement={onElement} onOffset={onOffset} /> : null}
        </>
      )}

      <VoidHud
        chapter={chapter}
        offset={offset}
        onJump={jumpTo}
        onToggleMotion={() => {
          setForceReduced((current) => !(current ?? prefersReduced));
        }}
        reducedMotion={stillMode}
      />

      {voidSideBeats.map((beat) => (
        <SideBeatSlot
          end={beat.end}
          id={beat.id}
          key={beat.id}
          offset={offset}
          start={beat.start}
        />
      ))}
    </div>
  );
}
