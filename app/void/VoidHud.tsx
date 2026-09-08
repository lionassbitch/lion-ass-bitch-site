"use client";

import type { VoidChapter } from "../content/void";
import { voidChapters } from "../content/void";

type VoidHudProps = {
  chapter: VoidChapter;
  offset: number;
  reducedMotion: boolean;
  onToggleMotion: () => void;
  onJump: (offset: number) => void;
};

export default function VoidHud({
  chapter,
  offset,
  reducedMotion,
  onToggleMotion,
  onJump,
}: VoidHudProps) {
  return (
    <div className="voidHud">
      <div className="voidHud__top">
        <p className="voidHud__chapter">
          <span>{chapter.code}</span>
          {chapter.title}
        </p>
        <nav aria-label="Journey chapters" className="voidHud__markers">
          {voidChapters.map((item) => {
            const current = item.id === chapter.id;
            return (
              <button
                aria-current={current ? "location" : undefined}
                aria-label={`${item.code}. ${item.title}`}
                className="voidHud__marker"
                key={item.id}
                onClick={() => onJump(item.range[0] + 0.012)}
                type="button"
              >
                <b aria-hidden="true">{item.code}</b>
                <small>{item.title}</small>
              </button>
            );
          })}
        </nav>
        <button
          aria-pressed={reducedMotion}
          className="voidHud__toggle"
          onClick={onToggleMotion}
          type="button"
        >
          {reducedMotion ? "Enable motion" : "Reduce motion"}
        </button>
      </div>

      <div className="voidHud__copy">
        <p className="voidHud__kicker">{chapter.kicker}</p>
        <p className="voidHud__summary">{chapter.summary}</p>
      </div>

      <div className="voidHud__base">
        <p className="voidHud__hint">
          {reducedMotion
            ? "Use the chapter markers or arrow keys to move through the filing."
            : "Scroll, arrows, page keys, or space move the camera. Markers jump chapters."}
        </p>
        <a className="voidHud__skip" href="#void-record">
          Skip to written record
        </a>
      </div>

      <div
        aria-hidden="true"
        className="voidHud__progress"
        style={{ ["--void-progress" as string]: String(offset) }}
      />

      <div aria-atomic="true" aria-live="polite" className="visually-hidden">
        {chapter.announcement}
      </div>
    </div>
  );
}
