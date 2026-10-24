/**
 * LAB brand site content.
 *
 * Every piece of copy, link, and brand image for the scroll site lives
 * here. Swap text, add real image URLs (`image` fields), or change links
 * without touching the section components.
 *
 * Image fields accept any URL (e.g. "/brand/hero.jpg" placed in client/public/brand).
 * When an image is undefined, the section renders a generated gradient tile.
 * Brand art (hero planes, sigils, medallions) ships in client/public/brand as WebP.
 */

export type ArtVariant = "lion" | "donkey" | "jackal" | "geo" | "ember" | "void";

export interface ArchetypeContent {
  key: "pryde" | "kickz" | "khemetz";
  numeral: string;
  name: string;
  /** Chalkboard force name: The Will / The Work / The Wisdom. */
  force: string;
  /** Chalkboard epithet: The Sovereign Force, and so on. */
  title: string;
  animal: string;
  letter: string;
  art: ArtVariant;
  accent: string;
  quote: string;
  definition: string;
  shadow: string;
  /** Chalkboard "Function" line. */
  role: string;
  /** Optional aside, used for the reclaimed meaning of Bitch. */
  note?: string;
  image?: string;
}

export const labContent = {
  brand: {
    name: "Lion Ass Bitch",
    short: "LAB",
    parent: "Exsuvera LLC",
    tagline: "Three Forces. One Philosophy. Power without Validation.",
    year: new Date().getFullYear(),
  },

  nav: {
    links: [
      { label: "Manifesto", href: "#manifesto" },
      { label: "The Forces", href: "#pride" },
      { label: "Shop", href: "#shop" },
      { label: "Contact", href: "#contact" },
    ],
    cta: { label: "Shop the pieces", href: "#shop" },
  },

  hero: {
    eyebrow: "Exsuvera presents",
    /** Visually replaced by the wordmark image; kept for screen readers and the reduced-motion fallback. */
    words: ["Lion", "Ass", "Bitch"],
    lede: "Three forces. One philosophy. Power without validation.",
    primaryCta: { label: "Shop the pieces", href: "#shop" },
    secondaryCta: { label: "Read the manifesto", href: "#manifesto" },
    scrollCue: "Scroll",
    /**
     * Layers of the pinned hero sequence ("The Monument Awakens").
     * Files live in client/public/brand. Swap any path to re-skin a plane.
     */
    images: {
      bust: { src: "/brand/bust-kintsugi.webp", alt: "Black stone bust of a lion, a donkey and a jackal, cracked and repaired with gold" },
      crest: { src: "/brand/crest-lab.webp", alt: "LAB crest: lion, donkey and jackal inside a gold sacred-geometry ring" },
      mural: { src: "/brand/mural-power-without-validation.webp", alt: "Graffiti mural of the three archetypes: Power Without Validation" },
      wordmark: { src: "/brand/wordmark-warning.webp", alt: "Lion Ass Bitch. This is not a brand. This is a warning." },
    },
    /** Final beat: the monument resolves into the crimson LAB monogram before the manifesto. */
    mark: {
      eyebrow: "Three animals. One mark.",
      line: "L is the Lion. A frames the Ass. B is the Bitch.",
    },
  },

  /**
   * The crimson sigil set. Black-background art that sits on the dark site
   * with `mix-blend-mode: screen`; the `*-alpha` files have the black keyed
   * to transparency for use over translucent surfaces (nav, fixed dial).
   */
  sigils: {
    monogram: { src: "/brand/monogram-lab.webp", alt: "LAB monogram: the L is a lion, the A frames a kicking donkey, the B is a jackal" },
    monogramAlpha: { src: "/brand/monogram-lab-alpha.webp", alt: "LAB" },
    triad: { src: "/brand/sigil-triad.webp", alt: "Red triad sigil: lion, donkey and jackal medallions on a triangle around a glowing triquetra" },
    seal: { src: "/brand/seal-three-heads.webp", alt: "Circular seal of the three heads with a compass star" },
    sealAlpha: { src: "/brand/seal-three-heads-alpha.webp", alt: "" },
    shield: { src: "/brand/shield-crest.webp", alt: "Heraldic shield crest: lion, donkey and jackal under a crown, framed by laurels" },
  },

  manifesto: {
    label: "Manifesto",
    /** Collective definition from the Exsuvera chalkboard. */
    text:
      "The integrated force of sovereign will (Lion), relentless endurance (Ass), and discerning truth (Bitch). Together, Lion Ass Bitch is a complete archetypal system — the creator, the carrier, and the curator. It moves with courage, works with consistency, and protects with wisdom. It is power, persistence, and discernment in divine alignment.",
    balance: "Balance in Motion. Power with Purpose.",
    portrait: {
      src: "/brand/portrait-three-heads.webp",
      alt: "Lion, donkey and jackal, side by side, lit in gold and purple",
    },
  },

  /**
   * The chalkboard is the source document. The section shows the board;
   * the creed is set in type so it stays readable.
   */
  fieldNotes: {
    label: "Field Notes",
    heading: "Exsuvera Definitions",
    aside: "Archetype. Energy. Function. Not just animals or insults.",
    image: {
      src: "/brand/chalkboard-definitions.webp",
      alt: "Chalkboard of the Exsuvera definitions: Lion the Will, Ass the Work, Bitch the Wisdom",
    },
    creedLabel: "Exsuvera Creed",
    creed: ["Be the Lion, not the liar.", "Be the Ass, not the asshole.", "Be that Bitch, not a bitch."],
    close: "Lion Ass Bitch = Balance in Motion. Power with Purpose.",
  },

  plate: {
    src: "/brand/plate-property-of.webp",
    alt: "Distressed license plate: Property of Lion Ass Bitch, 7R13D born R15E 4LWAYZ, 2026",
  },

  archetypes: {
    label: "The Forces",
    heading: "Three forces. One name.",
    intro:
      "Lion is the Will. Ass is the Work. Bitch is the Wisdom. Three forces to carry into everything you build.",
    /** Medallion centres on the triad sigil, as percentages of the square image (used to light each one up). */
    medallions: {
      pryde: { x: 50, y: 25 },
      kickz: { x: 22, y: 69 },
      khemetz: { x: 79, y: 69 },
    },
    items: [
      {
        key: "pryde",
        numeral: "01",
        name: "Lion",
        force: "The Will",
        title: "The Sovereign Force",
        animal: "Lion",
        letter: "L",
        art: "lion",
        accent: "#C9A227",
        image: "/brand/medallion-lion.webp",
        quote: "The Lion roars so you remember you can too.",
        definition:
          "The sovereign force within. Courage, leadership, protection, and unapologetic presence. The one who moves first, without permission.",
        shadow: "Pride, domination, isolation, unchecked ego, burning bridges.",
        role: "Initiates. Opens the path. Stands in the fire first.",
      },
      {
        key: "kickz",
        numeral: "02",
        name: "Ass",
        force: "The Work",
        title: "The Enduring Force",
        animal: "Donkey",
        letter: "A",
        art: "donkey",
        accent: "#b9c0cc",
        image: "/brand/medallion-donkey.webp",
        quote: "The Ass walks so the vision has somewhere to land.",
        definition:
          "The enduring force within. Stubborn persistence, grounded labor, carrying what others refuse, and moving forward anyway.",
        shadow: "Stubbornness, over-burdening, dissatisfaction, resistance to change.",
        role: "Sustains. Carries the weight. Keeps going when it's unseen.",
      },
      {
        key: "khemetz",
        numeral: "03",
        name: "Bitch",
        force: "The Wisdom",
        title: "The Discerning Force",
        animal: "Jackal",
        letter: "B",
        art: "jackal",
        accent: "#7B2CBF",
        image: "/brand/medallion-jackal.webp",
        quote: "The Bitch bites so you don't drink poison.",
        definition:
          "The discerning force within. Intuition, boundary, fierce love, and the refusal to be manipulated.",
        shadow: "Reactivity, bitterness, exclusion, over-judgment, mistrust.",
        role: "Refines. Protects the sacred. Calls out what's false. Keeps the circle real.",
        note: "Not derogatory in Exsuvera. Reclaimed. Rewired. A sacred function.",
      },
    ] satisfies ArchetypeContent[],
  },

  blueprint: {
    label: "The LAB blueprint",
    heading: "Will. Work. Wisdom. Put it into practice.",
    steps: [
      { title: "Claim your ground", body: "The Lion is sovereign will. Move with courage. Your presence does not need permission." },
      { title: "Carry the vision", body: "The Ass is relentless endurance. Show up, do the work, and build what you said you would." },
      { title: "Protect the truth", body: "The Bitch is discerning wisdom. Set the boundary. Keep what is real. Release what asks you to disappear." },
      { title: "Wear the evidence", body: "Bring all three with you. The clothes carry the mark. You give it meaning." },
    ],
  },

  marquee: {
    items: [
      "Be the Lion, not the liar",
      "Be the Ass, not the asshole",
      "Be that Bitch, not a bitch",
      "Turned a diss into dominion",
      "They named the insult. We claimed the power.",
      "Balance in Motion",
      "Power with Purpose",
      "Power without Validation",
    ],
  },

  /**
   * Storefront facts taken from https://lionassbitch.com (the in-page shop)
   * and the live Shopify catalog. Prices stay on Shopify so this page does
   * not freeze a number that the store can change.
   */
  shop: {
    kicker: "The clothes",
    line: "Clothes are not a costume. They are evidence.",
    body:
      "Lion Ass Bitch is for the maximalist, the minimalist, the misfit, and the main character. No gatekeeping. No shrinking. No permission needed.",
    note: "Choose your size, see current pricing, and check delivery in the store.",
    cta: { label: "Shop the pieces", href: "https://exsuvera-presents.myshopify.com/collections/all" },
    cart: { label: "Shopify cart", href: "https://exsuvera-presents.myshopify.com/cart" },
  },

  /**
   * /voguejitsu on the live site. The code, the seven principles, and the oath.
   * Forms, ranks, and the competition ladder stay off this scroll.
   */
  voguejitsu: {
    label: "Voguejitsu",
    heading: "Presence is power.",
    lede: "Precision is defense. Expression is the weapon.",
    body:
      "A stylized performance discipline rooted in the movement language, competitive spirit, and chosen-family traditions of the Black and Latino LGBTQ+ ballroom scene. You do not enter quietly. Every entrance makes a claim: I am here. I know who I am. I determine how I will be seen.",
    houses: "Houses are schools, creative families, and competitive teams. Lineage comes before aesthetic.",
    principles: [
      {
        title: "Presence before movement",
        body: "Power begins before the first step. Posture, gaze, stillness, and attitude establish authority.",
      },
      {
        title: "Precision over force",
        body: "A clean line, a sharp angle, or a perfectly timed gesture carries more impact than aggression.",
      },
      {
        title: "Flow through resistance",
        body: "Pressure becomes performance. A stumble becomes a dip; confrontation becomes choreography.",
      },
      {
        title: "Identity as armor",
        body: "Personal style is cultivated as protection against conformity, shame, and erasure.",
      },
      {
        title: "Improvisation as intelligence",
        body: "Respond instantly to music, rivals, space, and the beautiful problem of the unexpected.",
      },
      {
        title: "Community as strength",
        body: "Excellence grows through houses, mentors, elders, rivals, and chosen family.",
      },
      {
        title: "Victory without destruction",
        body: "Dominate the moment. Never destroy the person sharing it.",
      },
    ],
    oathLabel: "The oath",
    oath: [
      "I enter with intention.",
      "I move with precision.",
      "I transform pressure into beauty.",
      "I honor the houses and legends before me.",
      "I protect my body, my community, and my truth.",
      "I do not disappear to make others comfortable.",
      "I leave the floor more powerful than I entered it.",
    ],
  },

  cta: {
    heading: "Ready to stop shrinking?",
    body: "Wear your will. Carry your truth. Find the piece that feels like you, then make it yours.",
    primary: { label: "Shop the collection", href: "https://exsuvera-presents.myshopify.com/collections/all" },
    secondary: { label: "Get in touch", href: "https://exsuvera-presents.myshopify.com/pages/contact" },
  },

  footer: {
    blurb: "Lion Ass Bitch is the Exsuvera mark. Turned a diss into dominion. Will, work, and wisdom.",
    /** Live footer entity on https://lionassbitch.com. */
    legalName: "Exsuvera LLC d/b/a Lion Ass Bitch",
    socials: [
      { label: "Instagram", href: "https://www.instagram.com/lionassbitch/", handle: "@lionassbitch" },
    ],
    /** Extra destinations. Shop leaves this site for Shopify. */
    destinations: [
      { label: "Shop the pieces", href: "https://exsuvera-presents.myshopify.com/collections/all" },
      { label: "Relic archive", href: "/archive" },
      { label: "Voguejitsu", href: "#voguejitsu" },
    ],
    contact: {
      label: "Contact the LAB",
      href: "https://exsuvera-presents.myshopify.com/pages/contact",
      note: "Product questions, order support, and collaborations.",
    },
    legal: [
      { label: "Store privacy policy", href: "https://exsuvera-presents.myshopify.com/policies/privacy-policy" },
    ],
  },
};

export type LabContent = typeof labContent;
