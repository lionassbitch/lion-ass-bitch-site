# LAB Character Canon — Anchor + Preset Architecture

**Status: LAW. Locked 2026-08-21 by Eddie Colón.**
**Supersedes the 2026-04-18 canon in full on body plan, world, and lineup.**

This is the durable record. The operative copy lives at
`lab-visuals/references/characters.md`; if the two ever disagree, this file wins
and the skill copy gets rewritten from it.

---

## THE FIRST LAW — BODY PLAN

**Every LAB character is ANTHROPOMORPHIC.** Upright, bipedal, humanoid body with
an animal head and animal hands/feet. They wear real garments cut for a humanoid
frame.

They are **not** quadrupeds. A LAB character never walks on four legs, never
appears as a naturalistic animal, and is never rendered as wildlife photography.

This reverses the direction the production site drifted in. Every quadruped asset
is now **non-canon** — see *Superseded Assets* at the bottom.

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

> A real man — Puerto Rican, Bronx, mid-thirties, medium build, medium-light skin.
> Coiled curly hair worn short and full on top with blond-lightened tips, tapered
> and faded at the sides. Mustache and a light trimmed beard. Steady, level gaze
> straight down the lens. Grounded, unhurried stance — hands in his coat pockets,
> shoulders easy, entirely at home on the street.

He is a real person. Render him with documentary-portrait honesty — real skin
texture, real asymmetry, no idealization and no de-aging.

### Wardrobe Preset — `ARCHITECT_COAT` ✅ canonical

> A black knee-length coat worn open, its front panels and sleeves embroidered with
> gold geometric hieroglyphic linework. A black hoodie underneath, hood down.
> Layered gold chains carrying a large gold medallion at the chest. Black trousers
> with gold-embroidered panels at the thigh. Tan sand-coloured lace-up work boots —
> the boots are an anchor detail, the one warm note in an all-black fit.

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

1. **Body plan reversed to anthropomorphic.** The production site had drifted to
   quadruped animals across every asset. Anthropomorphic is now law without
   exception.
2. **World named and locked** — "Bronx is the Pyramid." Previously the environment
   was loose "Bronx Mythic" atmosphere; it is now a specific, consistent city.
3. **Palette shifted violet-dominant.** Magenta demoted to site-UI-only.
4. **Poster format specified** — 2:3, type stack, sigil close.
5. **Anput registered as Khemetz's sacred name.** Both names canon, same character.
6. **Eddie Colón promoted to full lineup member** with a locked anchor and preset.
7. **Taglines and per-character sigils locked** for all four.

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

Every one of these is **non-canon as of 2026-08-21** — all quadruped:

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
