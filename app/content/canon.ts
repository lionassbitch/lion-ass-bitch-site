// The written canon: the Creed, the Mythos chapters, and the Exsuvera studio
// record. Modeled as data so the pages stay editorial and easy to extend.

export type Tenet = {
  index: string;
  law: string;
  gloss: string;
};

export const creed: Tenet[] = [
  {
    index: "I",
    law: "Turn the diss into dominion.",
    gloss:
      "Whatever they named you to make you small becomes the name over the door. The insult is raw material. Dominion is what you build with it.",
  },
  {
    index: "II",
    law: "Fuck fake.",
    gloss:
      "Counterfeit people, counterfeit humility, counterfeit love. The gate weighs the heart against a feather. Bring something real or don't come.",
  },
  {
    index: "III",
    law: "Be you or be gone.",
    gloss:
      "There is no dress code for authenticity and no discount for imitation. Arrive as yourself completely, or make room for someone who will.",
  },
  {
    index: "IV",
    law: "Clothes are evidence, not costume.",
    gloss:
      "What you wear testifies. Every relic is a statement entered into the record of who refused to shrink that day.",
  },
  {
    index: "V",
    law: "No gatekeeping. No shrinking.",
    gloss:
      "For the maximalist, the minimalist, the misfit, and the main character. The door is wide. The standard is high. Both are true.",
  },
  {
    index: "VI",
    law: "Take up your space.",
    gloss:
      "Apology is not a personality. Presence is power. Occupy the room you were told to tiptoe through.",
  },
  {
    index: "VII",
    law: "Leave every floor more powerful than you entered it.",
    gloss:
      "Dominate the moment; never destroy the person sharing it. Reckoning, not cruelty. Power that lifts the room is the only kind worth keeping.",
  },
];

export type Chapter = {
  index: string;
  title: string;
  body: string[];
};

export const mythos: Chapter[] = [
  {
    index: "01",
    title: "The Naming",
    body: [
      "It started as a weapon. Two words thrown to make someone smaller — Lion Ass Bitch — the kind of insult the Bronx hands out and the world repeats. It was meant to close a door.",
      "But an insult is only a curse if you agree to carry it as one. The naming is the first act of the mythology: the moment a person hears the worst thing said about them and decides it will be the truest thing they build.",
    ],
  },
  {
    index: "02",
    title: "The Claiming",
    body: [
      "They named the insult. We claimed the power. The lion in the slur was never an accident — it was the tell. Underneath the diss was a coronation nobody meant to give.",
      "To claim is to take the sound they used to shrink you and turn it into a signal others can find you by. The word stopped being a wound and became a frequency.",
    ],
  },
  {
    index: "03",
    title: "The Bloodline",
    body: [
      "Three forces answered the naming. Pryde, the lion — sovereign will. Kickz, the donkey — stubborn truth. Khemetz, the black jackal — sacred reckoning. Together they are the bloodline that carries the warning from the Bronx into every piece.",
      "They are not mascots. They are archetypes — the parts of a person that refuse a leash, refuse a lie, and refuse to let the fake pass through the gate.",
    ],
  },
  {
    index: "04",
    title: "The Gate",
    body: [
      "Khemetz keeps the gate the way Anubis kept the underworld: heart on one side of the scale, a feather on the other. What is real continues. What is counterfeit falls away.",
      "This is the law the whole institution is built on. Fuck fake is not an attitude — it is the weighing. Be you or be gone is not a threat — it is the doorway.",
    ],
  },
  {
    index: "05",
    title: "The Evidence",
    body: [
      "Clothes are not a costume. They are evidence — of the day you decided to take up space, of the standard you refused to lower, of the version of yourself you stopped apologizing for.",
      "Every relic in the archive is made to order and shipped worldwide. Not a brand. A warning, worn on the body, entered into the record.",
    ],
  },
];

export type StudioNote = {
  index: string;
  title: string;
  body: string;
};

export const exsuvera = {
  name: "Exsuvera Studios",
  latin: "exuviae — the skin a creature sheds to become larger",
  positioning:
    "Exsuvera is the parent studio behind Lion Ass Bitch: a creative laboratory building mythology-first brands, disciplines, and cinematic worlds. LAB is its flagship. Voguejitsu is its first discipline. More is in the forge.",
  pillars: [
    {
      index: "01",
      title: "Mythology-first",
      body:
        "Every project begins with a cosmology — archetypes, laws, and a gate — before it becomes a product. Meaning is the moat.",
    },
    {
      index: "02",
      title: "Institution, not campaign",
      body:
        "We build houses that outlast a season: archives, academies, and canons designed to compound rather than trend.",
    },
    {
      index: "03",
      title: "The shed skin",
      body:
        "Exuviae is the name and the method. Growth requires shedding — of the smaller self, the borrowed voice, the fake. Every release is a molt.",
    },
  ] as StudioNote[],
  disciplines: [
    {
      href: "/voguejitsu",
      title: "Voguejitsu",
      blurb: "Presence is power. A performance discipline where survival becomes style.",
    },
  ],
};

export const founder = {
  name: "Eddie Colón",
  role: "Founder · First Witness",
  location: "The Bronx, New York",
  portrait: "/assets/underground-boutique.png",
  standfirst:
    "Lion Ass Bitch began the way most warnings do — as something meant to be worn down instead of worn proudly.",
  story: [
    "Eddie Colón built Lion Ass Bitch out of the exact words that were supposed to break him. Born and raised in the Bronx, he learned early that the city hands you a name before you get to choose one — and that the only real freedom is deciding what that name will mean.",
    "The insult became an institution. Not a t-shirt line with a slogan, but a full mythology: a bloodline of archetypes, a creed of seven laws, a gate that weighs the real against the fake, and a studio — Exsuvera — designed to keep building worlds instead of chasing seasons.",
    "The mission is simple and it is not soft: make evidence. Give the maximalist, the minimalist, the misfit, and the main character something to wear that testifies to the day they refused to shrink. Turn every diss into dominion, and leave every floor more powerful than you entered it.",
  ],
  signature: "— E.C.",
};
