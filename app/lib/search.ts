// A lightweight, content-derived search index over the institution's canon
// pages (relics are searched separately from the live catalog).
import { dossiers } from "../content/characters";
import { creed, mythos, exsuvera } from "../content/canon";
import { transmissions } from "../content/frequency";

export type PageRecord = {
  href: string;
  title: string;
  summary: string;
  kind: string;
  keywords: string;
};

export function buildPageIndex(): PageRecord[] {
  const records: PageRecord[] = [
    {
      href: "/archive",
      title: "Relic Archive",
      summary: "The full living catalog — every storefront-ready relic.",
      kind: "Storefront",
      keywords: "shop store catalog products merch clothing apparel buy cart",
    },
    {
      href: "/mythos",
      title: "Mythos",
      summary: "How a diss became dominion — the origin transmission.",
      kind: "Canon",
      keywords: "story origin naming claiming bloodline gate evidence history",
    },
    {
      href: "/creed",
      title: "The Creed",
      summary: "Seven laws worn on the body.",
      kind: "Canon",
      keywords: "laws values fuck fake be you or be gone dominion rules",
    },
    {
      href: "/dossiers",
      title: "Character Dossiers",
      summary: "The bloodline — Pryde, Kickz, and Khemetz.",
      kind: "Canon",
      keywords: "characters archetypes lion donkey jackal mascots",
    },
    {
      href: "/founder",
      title: "The Founder",
      summary: "Eddie Colón, first witness.",
      kind: "Institution",
      keywords: "eddie colon about story bio history bronx",
    },
    {
      href: "/exsuvera",
      title: "Exsuvera Studios",
      summary: exsuvera.positioning,
      kind: "Institution",
      keywords: "studio parent company laboratory brands worlds molt shed skin",
    },
    {
      href: "/voguejitsu",
      title: "Voguejitsu",
      summary: "Presence is power — a living performance discipline.",
      kind: "Discipline",
      keywords: "ballroom vogue dance movement discipline presence performance",
    },
    {
      href: "/frequency",
      title: "Frequency",
      summary: "Transmissions from the studio.",
      kind: "Institution",
      keywords: "blog journal articles dispatches doctrine news writing",
    },
    {
      href: "/contact",
      title: "Contact & Support",
      summary: "Reach the studio — orders, sizing, wholesale, press.",
      kind: "Institution",
      keywords: "help support email instagram orders shipping sizing wholesale press",
    },
    {
      href: "/labrynth",
      title: "The LABrynth",
      summary: "The full index of the institution.",
      kind: "Institution",
      keywords: "sitemap index directory map everything navigation",
    },
  ];

  for (const dossier of dossiers) {
    records.push({
      href: `/dossiers/${dossier.slug}`,
      title: `${dossier.name} — ${dossier.domain}`,
      summary: dossier.epithet,
      kind: "Dossier",
      keywords: `${dossier.animal} ${dossier.domain} character bloodline`,
    });
  }

  for (const entry of transmissions) {
    records.push({
      href: `/frequency/${entry.slug}`,
      title: entry.title,
      summary: entry.dek,
      kind: "Transmission",
      keywords: `${entry.kind} ${entry.dek}`,
    });
  }

  for (const tenet of creed) {
    records.push({
      href: "/creed",
      title: tenet.law,
      summary: tenet.gloss,
      kind: "Law",
      keywords: `creed law ${tenet.gloss}`,
    });
  }

  for (const chapter of mythos) {
    records.push({
      href: "/mythos",
      title: chapter.title,
      summary: chapter.body[0] ?? "",
      kind: "Mythos",
      keywords: `mythos chapter ${chapter.body.join(" ")}`,
    });
  }

  return records;
}
