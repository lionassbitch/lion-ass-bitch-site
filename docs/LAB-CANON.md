# LAB Character Canon — Anchor + Preset Architecture

**Status: LAW. Locked 2026-08-21 by Eddie Colón.**
**Supersedes the 2026-04-18 canon in full on body plan, world, and lineup.**

This is the durable record. The operative copy lives at
`lab-visuals/references/characters.md`; if the two ever disagree, this file wins
and the skill copy gets rewritten from it.

---

## THE FIRST LAW — TWO REGISTERS

LAB renders in two legitimate registers. The mistake is never *that* an animal
appears — it is using the wrong register for the job.

### 1. CHARACTER register — the default

**Anthropomorphic.** Upright, bipedal, humanoid body with an animal head and
animal hands/feet, wearing real garments cut for a humanoid frame.

This is Pryde, Kickz and Anput **as people**. Any frame where they act, wear,
speak, hold, stand with, or are named as characters is this register. Posters,
scenes, campaigns, dossiers, narrative, wardrobe — all character register.

If a frame is doing character work, it is anthropomorphic. No exceptions.

### 2. PRIMAL register — the animal as animal

**Naturalistic quadruped.** Real animal anatomy, four legs, no clothing, no
jewellery, no wardrobe. Daylight and natural settings are fully in bounds here —
savanna, field, stone, open sky.

This is the totem, the emblem, the nature-state, the origin image. The lion as a
lion, not as Pryde in a costume.

### The line between them

Ask: **is the frame presenting the animal AS the character, or as the animal?**

- Animal *as the character* — standing in for Pryde in a scene, wearing his gold,
  walking his city, captioned with his name → **wrong.** That is character work
  done in the wrong register, and it is exactly the drift that reached the site.
- Animal *as the animal* — totem, crest, emblem, primal/origin imagery, nature
  documentary register → **right.** Fully canon.

A naturalistic animal never wears LAB wardrobe and never carries a character
nameplate. The moment it does, it has crossed into character register and must be
anthropomorphic instead.

---

## THE WORLD — "BRONX IS THE PYRAMID"

One world. Every character poster and scene plate is shot in it.

**The premise:** the Bronx and ancient Kemet occupy the same street. Not a
crossover, not a dream sequence — one continuous city where both are simply true.

**Locked environmental elements:**

- Night. Heavy storm cloud with breaks of pale light.
- A great pyramid rising on the skyline at the end of the avenue, monumental,
  half-lost in weather.
- Bronx tenement and high-rise canyon walling the street on both sides — fire
  escapes, water towers, weathered brick, lit windows.
- Gold-lit obelisks at street level, faces dense with carved hieroglyphs.
- Seated pharaoh statuary at the curb, treated as ordinary street furniture.
- A vertical violet neon sign reading **BRONX IS THE PYRAMID**.
- Green street signage: **149 ST** and **3 AVE**.
- Burning vehicles throwing orange firelight into the lower frame.
- Police strobes — cold blue and red — in the middle distance.
- Rain-wet asphalt, standing water, rubble and debris. The ground always reflects.
- Falling embers and ash in the air. The air is never empty.

**The rule:** Egyptian elements are *civic infrastructure*, never set dressing.
The obelisk is on the corner because it has always been on the corner.

---

## LOCKED PALETTE

| Role | Value | Use |
|---|---|---|
| Dominant | Violet / purple | `#772cff` family — neon, glow, armor conduits, the name type |
| Signature metal | Gold | `#d6a64a` — collars, trim, embroidery, sigils, all typography except the name |
| Ground | Near-black | `#050306` — armor, garments, sky, asphalt |
| Heat accent | Orange | Fire, burning vehicles, sodium spill |
| Cold accent | Blue / white | Police strobes, window light, screen glow |

**Violet is dominant in the poster world.** Note that `#ff2cab` magenta is the
*site UI* signal color and does not govern rendered work. Do not let magenta take
over a plate — it reads as a different brand.

---

## THE POSTER FORMAT

The four 2026-08-21 posters define the format. Every character poster follows it.

**Frame:** 2:3 portrait. Single subject, centered, full body, feet near the lower
third. Eye level or slightly low — a mild hero angle, never a worm's-eye.

**Subject:** walking toward camera or standing squared to it. Hands visible.
Deep one-point perspective down the avenue behind them.

**Type stack**, bottom of frame, centered, in this order:

1. `LION ASS BITCH` — gold, small caps, wide letterspacing, modest size
2. **NAME** — very large violet display type, the loudest element on the page
3. `TAGLINE` — gold, small caps, wide letterspacing
4. **Sigil** — small, gold, centered, closing the stack

Reserve the bottom ~20% of the frame for the type. Compose the plate so nothing
important sits behind it.

---

## Canonical Reference Plates

The four posters signed off 2026-08-21. **These are the primary conditioning
references** — feed them for any render of these characters. They outrank the
older Flux identity heroes on wardrobe, world and framing.

| Character | Repo path | Cloudinary |
|---|---|---|
| Pryde | `docs/canon/pryde_poster_canonical.webp` | `https://res.cloudinary.com/drd16h5hl/image/upload/v1787347541/pryde_poster_canonical.webp` |
| Kickz | `docs/canon/kickz_poster_canonical.webp` | `https://res.cloudinary.com/drd16h5hl/image/upload/v1787347542/kickz_poster_canonical.webp` |
| Khemetz / Anput | `docs/canon/anput_poster_canonical.webp` | `https://res.cloudinary.com/drd16h5hl/image/upload/v1787347542/anput_poster_canonical.webp` |
| Eddie Colón | `docs/canon/eddie_poster_canonical.webp` | `https://res.cloudinary.com/drd16h5hl/image/upload/v1787347543/eddie_poster_canonical.webp` |
| Eddie Colón — identity | `docs/canon/eddie_reference_sheet_canonical.webp` | `https://res.cloudinary.com/drd16h5hl/image/upload/v1787348140/eddie_reference_sheet_canonical.webp` |

1024x1536 (2:3), webp q92. Held in two places on purpose: the repo copy survives
independently of any CDN or account, the Cloudinary copy is what generation tools
consume. Tagged `canon`, `law_2026_08_21`, `poster_canonical` and filed under
`LAB/characters/{name}`.

### Cloudinary authority order — READ THIS BEFORE PULLING A REF

Three asset families in Cloudinary carry `canonical` in the name. They do not
agree with each other. In descending authority:

1. **`{character}_poster_canonical`** (2026-08-21) — **THE LAW.** Anthropomorphic,
   Bronx-is-the-Pyramid, current wardrobe. Use these.
2. **`{character}_hero_canonical`** (2026-04-18) — anthropomorphic, correct body
   plan, **retired wardrobe**. Identity conditioning only. Never for wardrobe.
3. **`{character}_primal_canonical`** (2026-06-13) — **CANON, PRIMAL REGISTER.**
   Naturalistic daylight quadrupeds. Valid and correct for primal/totem/emblem
   work. Never feed them for character work — that substitution is what pulled the
   production site off-model. Right assets, wrong job.

The related `{character}_motion_canonical`, `_action_canonical` and
`_closeup_canonical` sets (2026-04-23) are video-reference derivatives of family 2
and inherit its identity-only status.

---

## PRYDE — The Lion / Sovereign Will

**Archetype:** Sovereign Will. Strength through wisdom, not brute force.
**Tagline:** `BE THE LION, NOT THE LIAR.`
**Sigil:** gold lion head, front-facing.

### Anchor Traits (LOCKED)

> A towering anthropomorphic lion, powerfully built — heavy through the chest and
> shoulders, a warrior's frame rather than a poet's. Dense dark golden-brown mane,
> thick and wild, falling in heavy locks that frame the face and break over the
> shoulders. Deep amber-gold eyes with a hard, steady, unhurried gaze. Broad noble
> muzzle, strong brow. A gold Egyptian brow circlet sits across the forehead at the
> hairline. Humanoid hands ending in real leonine claws; bare leonine feet, clawed,
> never shod. Posture squared and immovable — he walks like the street belongs to him.

### Wardrobe Preset — `SOVEREIGN_WARPLATE` ✅ canonical

> Matte-black segmented tech-plate armor over the torso, layered pauldrons at the
> shoulders, articulated gauntlets on both forearms. Violet light runs through
> recessed conduit channels across the chest, arms and greaves, with a single violet
> gem set at the sternum. Gold trim edges every plate. A heavy belt with a gold
> lion-head buckle. Below it, long black tabard panels fall to mid-shin, embroidered
> with vertical columns of gold hieroglyphs. Black greaves with violet conduit lines.
> Ceremonial and battle-ready in the same breath.

---

## KICKZ — The Donkey / Stubborn Truth

**Archetype:** Stubborn Truth. Street intelligence, rebellion, creation through chaos.
**Tagline:** `EVERY STEP COUNTS. EVERY KICK ECHOES.`
**Sigil:** gold donkey head, front-facing.

### Anchor Traits (LOCKED)

> A medium-built anthropomorphic donkey on a human frame — wiry, grounded, neither
> bulky nor slight. Grey-brown head with a pale muzzle and dark, bright, knowing
> eyes. Long donkey ears carried upright and alert; the ears are an anchor trait and
> never droop. Dark short coat. Stance relaxed and weight-shifted, hands loose at the
> sides, the bearing of someone entirely unbothered by the room.

### Wardrobe Preset — `BLOCK_DENIM` ✅ canonical

> A distressed black denim jacket worn open over a black hoodie with the hood down.
> Layered fine gold chains at the neck carrying a single medallion. Black tactical
> gloves. Black distressed utility trousers, ripped at the knee, hung with webbing
> straps, buckles and small pouches at the hip and thigh. Dark scuffed boots.
> Everything black on black, the gold doing all the talking.

---

## KHEMETZ / ANPUT — The Jackal / Sacred Reckoning

**One character, two registers.** `Khemetz` is her street name — how the block
knows her, and the name the site route `/dossiers/khemetz` uses. `Anput` is her
sacred name — how the temple, the posters, and all ceremonial work name her.
Neither supersedes the other. Choose the register the piece is speaking in.

**Archetype:** Sacred Reckoning. Divine judgment carried at street level.
**Tagline:** `LOYALTY IS POWER. PROTECTION IS PURPOSE.`
**Sigil:** gold ankh.

### Anchor Traits (LOCKED)

> A tall, slender, feminine anthropomorphic jackal — pure Egyptian jackal, no other
> canine blend, never a pitbull fusion. Jet-black head and skin with a lacquered
> sheen, elongated slender muzzle, very tall pointed ears carried upright and angled
> forward. Deep amber eyes, ancient and surgical at once. Gold headdress fittings at
> the brow and at the base of the ears. Long limbs, graceful neck, a deliberate
> almost-ceremonial carriage. Movement unhurried; she arrives, she does not rush.

**Safety filter note:** never describe her with "seductive" or "sultry" — those
trip platform filters. Use "composed, centered, quietly magnetic."

### Wardrobe Preset — `RECKONING_REGALIA` ✅ canonical

> A broad gold usekh collar with lapis-blue inlay spanning the shoulders. Beneath it
> a black lacquered armored bodysuit, close-fitted, edged in gold, with a gold
> pendant at the sternum. Gold armbands at the biceps, gold bracers at both forearms,
> a gold-plated belt at the waist. From the belt falls a long black wrap skirt to the
> ankle, split at the front, with a central vertical panel of gold hieroglyphic
> embroidery. Gold greave plates at the shins.

---

## EDDIE COLÓN — The Architect

**Full member of the lineup, locked 2026-08-21.** Eddie renders on equal footing
with Pryde, Kickz and Khemetz — group frames, campaigns and scenes as a matter of
course. The old "use sparingly, in-frame Eddie is rare" rule is retired.

**Archetype:** The Architect. The man who built the myth and stands inside it.
**Tagline:** `THE ARCHITECT. THE VISION. THE FUTURE.`
**Sigil:** gold crowned lion.

### Anchor Traits (LOCKED)

> A real man — Puerto Rican, Bronx, 38, 5'9" (175 cm), athletic and lean, light
> brown skin, brown eyes. Curly hair worn short and full on top, blonde on top over
> dark roots, tapered and faded at the sides. Mustache and a light trimmed beard.
> Steady, level gaze straight down the lens. Grounded, unhurried stance — shoulders
> easy, entirely at home on the street.

**Role:** Founder / Visionary. **Allegiance:** Exsuvera / LAB.

### Distinguishing Marks (LOCKED)

Real tattoos. Render them; they are identity, not decoration.

| Mark | Placement |
|---|---|
| Eagle with shield | Upper chest, left |
| Ornate cross | Upper chest, right |
| `TRUST` in serif caps | Right collarbone |
| `VIII·XI` Roman numerals | Left collarbone |
| Dove over `LOYALTY` | Right side of neck |

### Bearing

Grounded leader. Strategic and observant. Builder and creator. Carries the future
on his shoulders. Calm intensity, quiet authority.

**NOT CANON — do not render:** the wireless earbud visible in all three views of
the reference sheet is a shoot artifact. Models will happily reproduce it. Exclude
it explicitly in every prompt.

He is a real person. Render him with documentary-portrait honesty — real skin
texture, real asymmetry, no idealization and no de-aging.

### Reference Layers — two, split by job

Eddie runs the same two-layer setup as the rest of the lineup.

| Layer | Asset | Holds | Status |
|---|---|---|---|
| **Identity anchor** | `eddie_reference_sheet_canonical` | The face, from three angles. Fed for **every** render of him. | ✅ approved 2026-08-21 |
| **Wardrobe + world plate** | `eddie_poster_canonical` | `ARCHITECT_COAT`, Bronx-is-the-Pyramid framing | ✅ approved 2026-08-21 |

This mirrors the animals: `hero_canonical` holds the face, `poster_canonical`
holds the fit. Feed both together — the avatar keeps him *him*, the poster keeps
him dressed and in the right city.

The identity anchor is a **three-view reference sheet** — frontal, profile and
three-quarter turn on dark seamless, plus a written spec panel. Three angles on a
clean ground is the strongest face lock available; it beats a single headshot and
it beats the poster, where his head is a small share of a full-body frame.

Eddie is now the best-referenced character in the canon.

### Wardrobe Preset — `ARCHITECT_COAT` ✅ canonical

> A black knee-length coat worn open, its front panels and sleeves embroidered with
> gold geometric hieroglyphic linework. A black hoodie underneath, hood down.
> Layered gold chains carrying a large gold medallion at the chest. Black trousers
> with gold-embroidered panels at the thigh. Tan sand-coloured lace-up work boots —
> the boots are an anchor detail, the one warm note in an all-black fit.

---

## ORION — The Signal

**Not a character. Not an alias. A separate entity.**

**Form (LOCKED):** an **amethyst dodecahedron** — the twelve-faced Platonic solid,
rendered in amethyst: purple crystalline quartz, faceted, translucent, with the
internal banding and colour-zoning real amethyst carries.

**Relationship to the lineup:** Eddie is the **receiver**, Orion is the **source**.
Eddie's own spec says he "deciphers the signals from Orion." Orion transmits;
the Architect reads. Nobody else in the canon is documented as receiving it.

### Correction — Orion was never Eddie

The 2026-04-18 canon filed this as a single entry: *"EDDIE / ORION — The Architect."*
That was wrong. It treated Orion as Eddie's alias and erased a distinct entity from
the mythology. **Retired 2026-08-21 on Eddie's explicit confirmation.** Eddie is
Eddie. Orion is Orion. Never write them as one.

### Why the form matters

Amethyst **is** the locked violet. The brand's dominant colour and Orion's material
are the same substance, which means the violet running through every LAB frame —
the neon, the armour conduits, the name type — can be read in-world as Orion's
signal reaching the street. That is not decoration; it is the palette having a
source.

The dodecahedron is the twelve-faced solid classically assigned to the cosmos
itself — the shape used for the heavens when the other four Platonic solids were
assigned to the elements. A cosmic-order form transmitting to a man in the Bronx is
the same move the world already makes with the pyramid on the skyline.

**Available resonance, not yet locked:** Orion is also the constellation Egyptian
cosmology identifies with Osiris, and the one the Giza pyramids are popularly held
to mirror. Given that this world's premise is a pyramid standing at the end of a
Bronx avenue, the name is already doing structural work. Flagged as available if
Eddie wants to draw on it — not written as canon, because he has not said so.

### Open — needs Eddie

None of the following is invented here. Answer them and this block gets finished:

- **Scale.** Handheld object, room-sized, or monumental?
- **Manifestation.** Solid physical presence, apparition, projection, or only ever
  implied and off-frame?
- **Behaviour.** Static, slowly rotating, pulsing, fracturing, growing?
- **Light.** Does it emit, or only refract what is around it?
- **In frame?** Does Orion ever appear in a rendered plate, or is it always
  something Eddie is reacting to rather than something we see?
- **Nature.** Machine, deity, ancestor, artefact, or deliberately unexplained?

Until these are answered, **do not render Orion.** A guessed form becomes canon by
accident the moment it is generated, and this entity has already been mis-filed
once.

---

## Lineup Formation

When the full lineup shares a frame:

- **Pryde** center-left, dominant, the anchor of the group.
- **Kickz** center-right, mid-energy, loose.
- **Khemetz / Anput** between and half a step behind, surveilling.
- **Eddie** at the outside edge — left or right as the composition needs — reading
  as the one who brought them, not the one being led.

Connect with a faint gold trinity triangle overlay only when the piece is
sigil-styled. Never on a photoreal plate.

---

## Revision Log

**2026-08-21 — THE LAW REWRITE. Signed off by Eddie.**
Four reference posters (Pryde, Kickz, Anput, Eddie Colón) submitted and locked as
canon. Changes:

1. **Two registers defined.** Character work is anthropomorphic without exception.
   Primal work — the animal as animal, daylight and natural settings included — is
   equally canon. Amended same day: the first draft banned naturalistic animals
   outright, which was too broad. The rule is register discipline, not a ban.
2. **World named and locked** — "Bronx is the Pyramid." Previously the environment
   was loose "Bronx Mythic" atmosphere; it is now a specific, consistent city.
3. **Palette shifted violet-dominant.** Magenta demoted to site-UI-only.
4. **Poster format specified** — 2:3, type stack, sigil close.
5. **Anput registered as Khemetz's sacred name.** Both names canon, same character.
6. **Eddie Colón promoted to full lineup member** with a locked anchor and preset.
7. **Taglines and per-character sigils locked** for all four.
8. **Orion separated from Eddie** and given its own entry. The prior canon filed
   them as one. Orion is an amethyst dodecahedron, a distinct entity that
   transmits signals Eddie deciphers.

**Prior scar tissue retained from the 2026-04-18 canon:**

- Character-prefix every Cloudinary `public_id`. Same-name assets overwrite each
  other across folders. This has already cost us assets once.
- Khemetz is pure Egyptian jackal. The pitbull fusion produced compact muscular
  builds that missed her elegance. Dropped permanently.
- Build the bible before the hero render. Renders without the soul doc surface the
  character but not their gravity.
- Wardrobe language must be Bronx-sovereign-specific, never generic "tailored" —
  that pulls renders toward Wall Street blazer territory.
- Consolidate fur/texture description into one sentence. Distributing anatomical
  descriptors across body parts trips NSFW filters and over-directs the model.

---

## Superseded Assets

These are **off-canon as of 2026-08-21** — not because they contain animals, but
because each uses a naturalistic animal **in the character role**: standing in for
Pryde, Kickz or Anput, carrying their names, wearing their gold, walking their
city. That is character work, and character work is anthropomorphic.

Re-shooting them means re-shooting them as characters, not deleting the animals:

| Asset | Where it is used |
|---|---|
| `lab-trinity-neon.webp` | `.world` section, Pryde dossier scene |
| `lab-trinity-hero.webp` | Home hero poster, final CTA poster |
| `pryde-threshold.webp` | Pryde dossier portrait |
| `kickz-neon.webp` | Kickz dossier portrait |
| `kickz-bronx-poster.webp` | Kickz dossier scene |
| `khemetz-temple.webp` | Khemetz dossier portrait |
| `lab-trinity-loop.mp4` | Home hero video, final CTA video |

They remain live on the site until replaced. Regenerating them against this canon
is the outstanding work.

### Cloudinary primal set — KEEP, do not archive

| Asset | Note |
|---|---|
| `pryde_primal_canonical` | 2026-06-13, 1664x2496 PNG, `LAB/characters/pryde` |
| `kickz_primal_canonical` | 2026-06-13, 1664x2496 PNG, `LAB/characters/kickz` |
| `khemetz_primal_canonical` | 2026-06-13, 1664x2496 PNG, `LAB/characters/khemetz` |

Naturalistic daylight wildlife portraits with a LAB badge. **These are canon** —
they are the reference set for the primal register, and they are correct at what
they do.

They are not superseded and must not be archived. What went wrong was never these
images; it was feeding them into character work, where the anthropomorphic form
was required.
