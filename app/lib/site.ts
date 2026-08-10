// Central site configuration: identity, commerce endpoints, and the canonical
// navigation graph. Every route and component reads from here so the
// institution stays coherent as it grows.

export const SHOP_DOMAIN = "exsuvera-presents.myshopify.com";

export const site = {
  name: "Lion Ass Bitch",
  shortName: "LAB",
  tagline: "Turned a diss into dominion.",
  creed: "They named the insult. We claimed the power.",
  founded: "Est. 2022 · New York",
  description:
    "Lion Ass Bitch is a Bronx-born mythological institution — fashion house, relic archive, cinematic universe, and private academy for anyone who refuses to shrink.",
  shop: {
    domain: SHOP_DOMAIN,
    cartUrl: `https://${SHOP_DOMAIN}/cart`,
    addUrl: `https://${SHOP_DOMAIN}/cart/add`,
  },
  social: {
    instagram: "https://www.instagram.com/lionassbitch/",
    instagramHandle: "@lionassbitch",
  },
  // Public support address. Configure NEXT_PUBLIC_SUPPORT_EMAIL to route the
  // contact form to a real inbox; when unset the form guides visitors to the
  // (real, working) Instagram channel instead of a dead mailto link.
  support: {
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  },
  legalName: "Lion Ass Bitch LLC",
} as const;

export type NavLink = { href: string; label: string; note?: string };

// Primary navigation surfaced in the header. Kept intentionally tight —
// the full institution is reachable through the LABrynth index.
export const primaryNav: NavLink[] = [
  { href: "/archive", label: "Archive", note: "Shop every live relic" },
  { href: "/mythos", label: "Mythos", note: "The origin transmission" },
  { href: "/dossiers", label: "Dossiers", note: "The bloodline" },
  { href: "/creed", label: "Creed", note: "The laws we wear" },
  { href: "/exsuvera", label: "Exsuvera", note: "The parent studio" },
  { href: "/labrynth", label: "LABrynth", note: "Index of everything" },
];

// The complete route index, grouped, powering the LABrynth and the sitemap.
export const siteIndex: { group: string; blurb: string; links: NavLink[] }[] = [
  {
    group: "The Storefront",
    blurb: "Where the mythology becomes wearable evidence.",
    links: [
      { href: "/archive", label: "Relic Archive", note: "The full living catalog" },
      { href: "/", label: "The Front Gate", note: "Home transmission" },
      { href: "/search", label: "Search", note: "Find any relic or record" },
    ],
  },
  {
    group: "The Canon",
    blurb: "The story, the laws, and the bloodline behind the mark.",
    links: [
      { href: "/mythos", label: "Mythos", note: "How a diss became dominion" },
      { href: "/creed", label: "The Creed", note: "Seven laws worn on the body" },
      { href: "/dossiers", label: "Character Dossiers", note: "Pryde · Kickz · Khemetz" },
      { href: "/founder", label: "The Founder", note: "Eddie Colón, first witness" },
    ],
  },
  {
    group: "The Institution",
    blurb: "The wider Exsuvera universe and its disciplines.",
    links: [
      { href: "/exsuvera", label: "Exsuvera Studios", note: "The parent house" },
      { href: "/voguejitsu", label: "Voguejitsu", note: "A living discipline" },
      { href: "/frequency", label: "Frequency", note: "Transmissions & dispatches" },
      { href: "/contact", label: "Contact & Support", note: "Reach the studio" },
    ],
  },
];
