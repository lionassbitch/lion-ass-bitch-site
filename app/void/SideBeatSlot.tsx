import type { ReactNode } from "react";

export type SideBeatSlotProps = {
  id: string;
  /** Inclusive start of the 0–1 scroll window. */
  start: number;
  /** Exclusive end of the 0–1 scroll window. */
  end: number;
  offset?: number;
  children?: ReactNode;
};

/**
 * Reserved mount for later side content. Renders nothing until children
 * are passed. Hook a beat by supplying `start` / `end` on the scroll path
 * and any accessible HTML as `children`.
 */
export default function SideBeatSlot({
  id,
  start,
  end,
  offset = 0,
  children,
}: SideBeatSlotProps) {
  if (!children) return null;
  const active = offset >= start && offset < end;
  return (
    <aside
      className="voidSideBeat"
      data-side-beat={id}
      data-start={start}
      data-end={end}
      hidden={!active}
    >
      {children}
    </aside>
  );
}
