// Registry Void — scroll-reactive chapter map.
// Modeled as data so the 3D journey, HUD, reduced-motion alternate,
// search index, and the accessible filing record stay in lockstep.

export type VoidChapterId = "k1" | "k2" | "k3" | "k4";

export type VoidChapter = {
  id: VoidChapterId;
  code: "K1" | "K2" | "K3" | "K4";
  title: string;
  kicker: string;
  announcement: string;
  summary: string;
  record: string[];
  /** Inclusive start / exclusive end on the 0–1 scroll path. Last chapter includes 1. */
  range: readonly [number, number];
  plate: string;
  plateAlt: string;
};

export type VoidSideBeat = {
  id: string;
  start: number;
  end: number;
  label: string;
};

export const VOID_ROUTE = "/void";
export const VOID_TITLE = "Registry Void";
export const VOID_SCROLL_PAGES = 6;

export const voidNotice = {
  header: "THE REGISTRY",
  kind: "NOTICE OF FILING",
  lines: ["THIS ADDRESS RECORDED AS VACANT", "NO ENTRY"] as const,
  stamp: "FILED",
};

export const voidDisposition = {
  header: "THE REGISTRY",
  kind: "NOTICE OF DISPOSITION",
  lines: ["THIS FILING IS CLOSED", "THE GATE HAS BEEN ENTERED"] as const,
  stamp: "VOID",
};

export const voidChapters: VoidChapter[] = [
  {
    id: "k1",
    code: "K1",
    title: "Rainy street",
    kicker: "The alley / first witness",
    announcement: "Chapter K1. Rainy street. Camera travels a wet brick alley toward a purple glow.",
    summary:
      "A long, rain-slick brick alley at night. Fire escapes, warm lamp reflections, and a purple glow at the vanishing point.",
    record: [
      "The filing opens on wet brick. Fire escapes rib the brownstones. Amber windows smear themselves across the pavement.",
      "At the vanishing point a violet seam waits. The camera does not cut. It walks.",
    ],
    range: [0, 0.28],
    plate: "/assets/lab-trinity-neon.webp",
    plateAlt: "Rain-soaked Bronx alley at night, neon pink and amber reflecting on wet cobblestones",
  },
  {
    id: "k2",
    code: "K2",
    title: "Door 22",
    kicker: "The vacant address",
    announcement:
      "Chapter K2. Door 22. The Registry notice of filing. This address recorded as vacant. No entry. Stamp: filed.",
    summary:
      "A dark door marked 22. The Registry notice of filing is taped to the panel. Purple light leaks under the threshold.",
    record: [
      `${voidNotice.header}. ${voidNotice.kind}. ${voidNotice.lines.join(". ")}. Stamp: ${voidNotice.stamp}.`,
      "Trash bags slump against the stoop. The slit under the door is the only honest light on the block. The camera passes through.",
    ],
    range: [0.28, 0.48],
    plate: "/assets/underground-boutique.png",
    plateAlt: "Dim subterranean interior with wet concrete and a violet glow beyond the threshold",
  },
  {
    id: "k3",
    code: "K3",
    title: "Crystal descent",
    kicker: "The stair / the weigh",
    announcement:
      "Chapter K3. Crystal descent. Stone stairs, purple crystals, and glyphs leading to a bright violet depth.",
    summary:
      "A steep stone stairwell inscribed with glyphs. Jagged purple crystals light the descent toward a near-white violet opening.",
    record: [
      "The street ends. The building does not. Stairs cut into inscribed stone, each step a quieter filing.",
      "Crystals hold the only lamp. The bottom of the shaft is brighter than the sky the alley never had.",
    ],
    range: [0.48, 0.74],
    plate: "/assets/court-walk.png",
    plateAlt: "Dark stone hall with a circular purple portal glowing at the far end",
  },
  {
    id: "k4",
    code: "K4",
    title: "VOID city",
    kicker: "The shed skin",
    announcement:
      "Chapter K4. VOID city. Cave exit, void-stamped notice, dark pyramid, and a gothic-futurist spire city with searchlights.",
    summary:
      "The cave mouth opens on a dark pyramid and a gothic-futurist spire city. A weathered notice is stamped VOID.",
    record: [
      `${voidDisposition.header}. ${voidDisposition.kind}. Stamp: ${voidDisposition.stamp}.`,
      "A black pyramid holds the platform. Searchlights rake a city of needle spires. The filing is closed. The world is not.",
    ],
    range: [0.74, 1],
    plate: "/assets/crystal-city.png",
    plateAlt:
      "Gothic-futurist city of black and gold spires with purple energy, viewed from a high terrace",
  },
];

/** Transition windows reserved for later side content. Empty on purpose. */
export const voidSideBeats: VoidSideBeat[] = [
  { id: "k1-k2", start: 0.24, end: 0.32, label: "Street → Door 22" },
  { id: "k2-k3", start: 0.44, end: 0.52, label: "Door 22 → Descent" },
  { id: "k3-k4", start: 0.7, end: 0.78, label: "Descent → VOID city" },
];

export function getChapterAt(offset: number): VoidChapter {
  const t = Number.isFinite(offset) ? Math.min(1, Math.max(0, offset)) : 0;
  for (let i = voidChapters.length - 1; i >= 0; i -= 1) {
    const chapter = voidChapters[i];
    if (t >= chapter.range[0]) return chapter;
  }
  return voidChapters[0];
}

export function chapterProgress(offset: number, chapter: VoidChapter): number {
  const [start, end] = chapter.range;
  const span = Math.max(end - start, 0.0001);
  return Math.min(1, Math.max(0, (offset - start) / span));
}
