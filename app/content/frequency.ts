// Frequency — the institution's transmissions. Editorial dispatches from the
// studio, modeled so the index and individual transmission pages share content.

export type Transmission = {
  slug: string;
  index: string;
  kind: string;
  title: string;
  dek: string;
  date: string; // ISO
  readingMinutes: number;
  body: string[];
};

export const transmissions: Transmission[] = [
  {
    slug: "turned-a-diss-into-dominion",
    index: "001",
    kind: "Doctrine",
    title: "Turned a Diss Into Dominion",
    dek: "The founding transmission — why the worst thing they called you is the best material you own.",
    date: "2026-01-14",
    readingMinutes: 4,
    body: [
      "Every institution has an origin story it would rather not tell. Ours is two words thrown to make someone smaller. We kept them, capitalized them, and put them over the door.",
      "Dominion is not revenge. Revenge keeps you tethered to the person who insulted you. Dominion cuts the rope and keeps the crown. The diss gave us the shape; we poured the gold.",
      "If you are reading this because someone named you wrong, understand the assignment: the name is raw material. What you build with it is the only reply that matters.",
    ],
  },
  {
    slug: "fuck-fake-a-field-guide",
    index: "002",
    kind: "The Gate",
    title: "Fuck Fake: A Field Guide to the Weighing",
    dek: "How Khemetz keeps the gate, and how to run the same scale on your own life.",
    date: "2026-02-02",
    readingMinutes: 5,
    body: [
      "At the threshold, the heart is weighed against a feather. It is the oldest test in the mythology and the simplest: is this real, or is it performance dressed as truth?",
      "The counterfeit is loud. It flatters, it rushes, it needs you to decide before you think. The real can survive a pause. Run the pause. What flinches under it was never going to hold.",
      "Fuck fake is not cruelty. It is arithmetic the fake refused to do. You are allowed to close a gate. You are allowed to keep records.",
    ],
  },
  {
    slug: "clothes-are-evidence",
    index: "003",
    kind: "Doctrine",
    title: "Clothes Are Evidence, Not Costume",
    dek: "Why we call the pieces relics, and what they testify to.",
    date: "2026-03-18",
    readingMinutes: 3,
    body: [
      "A costume is worn to become someone else for a night. A relic is worn to prove who you already are on the record. We make relics.",
      "Every piece in the archive is made to order — brought into being because someone decided to enter their own evidence into the log. That is why nothing here is disposable and nothing here is neutral.",
      "When you wear the crest, you are not advertising a brand. You are testifying. The mark is the signature at the bottom of the statement.",
    ],
  },
  {
    slug: "presence-is-power",
    index: "004",
    kind: "Discipline",
    title: "Presence Is Power: Notes From the Floor",
    dek: "What Voguejitsu teaches the rest of the institution about taking up space.",
    date: "2026-04-09",
    readingMinutes: 4,
    body: [
      "Voguejitsu begins before the first step. Posture, gaze, stillness. Power is established in the pause, not the performance — the same law the whole institution runs on.",
      "The floor is not defeat. It is another territory. You descend, you travel, you rise without surrendering rhythm. Nothing that happens to you is the end of your composition unless you decide to stop moving.",
      "Leave every floor more powerful than you entered it. Dominate the moment; never destroy the person sharing it. That is the seventh law, and it is the hardest one.",
    ],
  },
];

export function getTransmission(slug: string): Transmission | undefined {
  return transmissions.find((t) => t.slug === slug);
}

export const transmissionDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
