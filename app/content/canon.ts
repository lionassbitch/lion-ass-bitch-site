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

// THE NAME — the brand nomenclature. What it is, why it is, how it arose.
// Written for the Exsuvera Presents gate (the domain that guides visitors to
// LionAssBitch.com) and rendered here on /mythos. The job of this copy is not
// to explain the name; it is to raise its price. Durable record and build
// notes: docs/LAB-NOMENCLATURE.md. If the two disagree, the doc wins.

export type NameWord = {
  index: string;
  word: string;
  domain: string;
  verb: string; // what this rank does inside the system
  body: string[];
  archetype: { slug: string; name: string };
};

export const theName = {
  kicker: "What it is. Why it is. How it arose.",
  whatItIs: [
    "Lion Ass Bitch.",
    "Three words. Three animals. Three ranks.",
    "Say it out loud and notice where your voice lands: on LION. The other two words push it forward. Read the way it's built — not the way it sounds in a hallway — it's a title, not an insult.",
    "It's also a system. Lion moves. Ass holds. Bitch guards. Most people get one of the three and call it a personality. Lion Ass Bitch is what it looks like when you run all three at once.",
  ],
  words: [
    {
      index: "I",
      word: "Lion",
      domain: "Sovereign Will",
      verb: "moves",
      body: [
        "The one who moves through the world unapologetically. Moves first, asks questions later. Doesn't ask permission to take up space, because permission was never on the table.",
      ],
      archetype: { slug: "pryde", name: "Pryde" },
    },
    {
      index: "II",
      word: "Ass",
      domain: "Stubborn Truth",
      verb: "holds",
      body: [
        "The donkey. It carried every civilization you've ever heard of, and it gets called stubborn for one reason: it will not walk into what it hasn't checked. That isn't stupidity. It's loyalty to your own footing.",
        "Unwavering resilience — the cosmic stubbornness that outlasts everyone who bet against you. Champions are built out of it.",
      ],
      archetype: { slug: "kickz", name: "Kickz" },
    },
    {
      index: "III",
      word: "Bitch",
      domain: "Sacred Guardian",
      verb: "guards",
      body: [
        "Strip the slur off and read the word. A bitch is a female canine: the one who guards the den, and the one you don't cross while she's protecting what's hers. Egypt put a jackal on that watch. Judgment. Boundaries. Transformation.",
      ],
      archetype: { slug: "khemetz", name: "Anput" },
    },
  ] as NameWord[],
  whyItIs: [
    "Because the words people use to shrink you are raw material.",
    "We didn't clean the words up. We restored them. \"Ass\" and \"bitch\" were animals before they were insults — a bearer and a guardian — and an insult only works if you accept the speaker's definition. We use the dictionary's.",
    "Put the lion in front and the whole phrase flips. That's the reclamation: the exact sentence somebody spits at you becomes the rank you carry.",
    "The initials spell LAB. A laboratory. Where things get tested, broken, and rebuilt on purpose.",
    "Lion Ass Bitch isn't a brand. It's a warning — to the world, that you're coming, and to yourself, that you're done lying.",
  ],
  howItArose: [
    "It started as an insult aimed at somebody else.",
    "A late-night Uber. A driver who wasn't where he said he'd be. An expanded state of mind in the back seat. Somebody called him a lying ass bitch — and the words landed as something else: Lion Ass Bitch.",
    "One syllable of difference. A whole life inside it.",
    "A lying ass bitch won't show up and won't own it. A Lion Ass Bitch is what you become the second you stop lying — to yourself first.",
    "It was a joke. Then a sketch. Then a company. Then the company became the thing keeping its founder above water. Then it grew three faces and a job: do for the next person what it did for him.",
  ],
  quote: {
    text: "I turned a late Uber trip into a company, the company into a life jacket, and the life jacket into a myth.",
    attribution: "Eddie Colón, Founder",
  },
  signOff: "Be the lion, not the liar.",
};

// EXSUVERA PRESENTS — the coined word, taken apart. Rendered as a scroll
// reveal: one beat per viewport, EX / SU / VERA pinned as they arrive, then
// closed up into one word. Native scrolling only; every line is in the page
// at load so the origin story indexes as text, not as a blank gate.

export type NamePart = { syllable: string; gloss: string };

export type RevealBeat = {
  index: number;
  kind: "line" | "part" | "word" | "payoff" | "close";
  lines: string[];
};

export const exsuveraName = {
  parts: [
    { syllable: "EX", gloss: "Latin. Out of. The way out." },
    { syllable: "SU", gloss: "Of the self. In Spanish, simply: yours." },
    { syllable: "VERA", gloss: "True. De veras — for real." },
  ] as NamePart[],
  payoff: "Out of truth comes your true self.",
  closing: "Exsuvera is the molt. Lion Ass Bitch is what walked out of it.",
  beats: [
    { index: 1, kind: "line", lines: ["Exsuvera isn't a word you'll find anywhere else."] },
    {
      index: 2,
      kind: "line",
      lines: [
        "It was coined. Built piece by piece, on purpose,",
        "so the name would carry its own instructions.",
      ],
    },
    { index: 3, kind: "part", lines: ["EX", "Latin. Out of. The way out."] },
    { index: 4, kind: "part", lines: ["SU", "Of the self. In Spanish, simply: yours."] },
    { index: 5, kind: "part", lines: ["VERA", "True. De veras — for real."] },
    { index: 6, kind: "word", lines: ["EX · SU · VERA"] },
    { index: 7, kind: "line", lines: ["There's a fourth word hiding in the middle."] },
    {
      index: 8,
      kind: "line",
      lines: ["Exuviae — the shell a creature sheds", "once it has outgrown it."],
    },
    {
      index: 9,
      kind: "line",
      lines: ["Snakes leave one. Cicadas leave one.", "The animal doesn't die in the molt."],
    },
    {
      index: 10,
      kind: "line",
      lines: ["The shape that stopped fitting gets left behind.", "The living thing walks out."],
    },
    {
      index: 11,
      kind: "line",
      lines: ["Most people never get there.", "They mistake the shell for the animal."],
    },
    { index: 12, kind: "payoff", lines: ["EXSUVERA", "Out of truth comes your true self."] },
    {
      index: 13,
      kind: "line",
      lines: [
        "Not self-improvement — you were never broken.",
        "Self-archaeology. Strip what was never yours",
        "and find what was always there.",
      ],
    },
    {
      index: 14,
      kind: "close",
      lines: ["Exsuvera is the molt.", "Lion Ass Bitch is what walked out of it."],
    },
  ] as RevealBeat[],
  cta: { label: "Enter LionAssBitch.com", href: "/" },
};

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
    {
      href: "/void",
      title: "Registry Void",
      blurb: "A cinematic 3D filing — rainy street, Door 22, crystals, VOID city.",
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
