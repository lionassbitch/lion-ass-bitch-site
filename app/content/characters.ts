// Character dossiers — the LAB bloodline. Three archetypes that carry the
// warning from the Bronx into every relic. Content-modeled so dossier pages,
// the home trinity, and the mythos all render from one source.

export type Dossier = {
  slug: string;
  name: string;
  animal: string;
  domain: string;
  index: string;
  title: string;
  aura: string; // css accent variable name
  portrait: string;
  scene: string;
  epithet: string;
  summary: string;
  verses: string[];
  traits: { label: string; value: string }[];
  wears: string;
};

export const dossiers: Dossier[] = [
  {
    slug: "pryde",
    name: "Pryde",
    animal: "The Lion",
    domain: "Sovereign Will",
    index: "01",
    title: "Pryde",
    aura: "--gold",
    portrait: "/assets/pryde-threshold.webp",
    scene: "/assets/lab-trinity-neon.webp",
    epithet: "The one who was named an insult and answered as a crown.",
    summary:
      "Pryde is the sovereign at the center of the bloodline — the refusal to shrink made flesh. Where the world reached for a leash, Pryde reached for a throne. The lion does not argue with the cage; the lion outgrows it. Every relic that carries the crest carries Pryde's first law: your presence is not up for a vote.",
    verses: [
      "They called it arrogance. It was accuracy.",
      "A crown is only heavy to the neck that doubts it belongs there.",
      "I did not raise my voice. I raised my standards, and the room got quiet.",
    ],
    traits: [
      { label: "Element", value: "Fire held still" },
      { label: "Law", value: "Take up your space" },
      { label: "Shadow", value: "Isolation of the throne" },
      { label: "Gift", value: "Ungovernable self-respect" },
    ],
    wears:
      "The Ancestors Crest and the Sacred Lion Crest — armor for the days the world tests whether you meant it.",
  },
  {
    slug: "kickz",
    name: "Kickz",
    animal: "The Donkey",
    domain: "Stubborn Truth",
    index: "02",
    title: "Kickz",
    aura: "--cyan",
    portrait: "/assets/kickz-neon.webp",
    scene: "/assets/kickz-bronx-poster.webp",
    epithet: "The mule who would not move for a lie, no matter who was pushing.",
    summary:
      "Kickz is the stubbornness that keeps a people alive — the one who plants both feet when everyone with a title says walk. The donkey is the most insulted animal in the language and the most necessary in the field. Kickz turns being underestimated into a strategy: mocked, then indispensable. This is the archetype of the block, the mule of the hustle, the truth that will not be relocated.",
    verses: [
      "Call me stubborn again. I'll take it as a résumé.",
      "The ones who carried the weight were never the ones holding the whip.",
      "I don't move because you're loud. I move because you're right — and you rarely are.",
    ],
    traits: [
      { label: "Element", value: "Earth that won't yield" },
      { label: "Law", value: "Refuse the comfortable lie" },
      { label: "Shadow", value: "Stubbornness against the truth" },
      { label: "Gift", value: "Endurance nobody clapped for" },
    ],
    wears:
      "The neon-washed pieces and the everyday uniforms — proof that the ordinary, worn with conviction, becomes a statement.",
  },
  {
    slug: "khemetz",
    name: "Khemetz",
    animal: "The Black Jackal",
    domain: "Sacred Reckoning",
    index: "03",
    title: "Khemetz",
    aura: "--violet",
    portrait: "/assets/khemetz-temple.webp",
    scene: "/assets/crystal-city.png",
    epithet: "The guardian at the gate who weighs the heart before it passes.",
    summary:
      "Khemetz is the reckoning — the jackal at the threshold of the underworld who decides what deserves to continue. Descended from Anubis and raised in the Bronx, Khemetz carries the oldest job in the mythology: to weigh what is real against a feather and let the fake fall away. This is the archetype of judgment without cruelty, memory that does not forgive fraud, and the sacred authority to say be you or be gone.",
    verses: [
      "I don't hold grudges. I keep records.",
      "The heart heavier than the feather stays outside the gate.",
      "Reckoning isn't revenge. It's arithmetic the fake refused to do.",
    ],
    traits: [
      { label: "Element", value: "Shadow with a lantern" },
      { label: "Law", value: "Fuck fake" },
      { label: "Shadow", value: "Judgment that forgets mercy" },
      { label: "Gift", value: "Discernment that cannot be flattered" },
    ],
    wears:
      "The temple pieces and the darkest editions — cut for the ones who guard their own gate.",
  },
];

export function getDossier(slug: string): Dossier | undefined {
  return dossiers.find((dossier) => dossier.slug === slug);
}
