# Lion Ass Bitch — Digital Institution

A Bronx-born mythological institution built as a premium, deployable web
platform: fashion house, relic archive, cinematic universe, and private academy
unified into one coherent system.

Built on [vinext](https://github.com/cloudflare/vinext) (Next.js App Router →
Nitro/Cloudflare), React 19, and Tailwind-tokened CSS. Commerce is powered by
the live Shopify storefront JSON with a committed catalog snapshot as a
resilient fallback.

## Prerequisites

- Node.js `>=22.13.0` (the test suite uses Node's built-in TypeScript type
  stripping, available in 22.18+).

## Quick start

```bash
npm install
npm run build      # production build (vinext → Nitro)
npm test           # build + verification suite (8 tests)
npm run lint       # eslint (0 errors)
npx tsc --noEmit   # type check (clean)
```

> **Local runtime note.** `npm run dev` (Cloudflare vite-plugin) and the
> `node-server` Nitro preview are both broken by upstream tooling in this repo's
> pinned versions (the CF plugin predates Vite 8; the `node-server` preset calls
> the RSC entry as a function while the Cloudflare `worker/index.ts` exports
> `{ fetch }`). The production target is **Vercel** (`vercel.json` sets
> `NITRO_PRESET=vercel`) / Cloudflare, where the `{ fetch }` worker shape is
> correct. Verification here runs through the production build, the type/lint
> gates, the content-model + catalog test suite, and rendered-CSS visual review.

## Architecture

```
app/
  layout.tsx              Root shell: fonts, SEO metadata (title template,
                          metadataBase, OG/Twitter), skip link, header, footer,
                          analytics.
  page.tsx                Home — editorial hero, featured relics, bloodline,
                          street film, creed teaser, final CTA.
  globals.css             Base tokens + homepage sections (existing).
  brand-refresh.css       Homepage palette + hero/trinity styling (existing).
  product-flip.css        Interactive garment gallery styling (existing).
  system.css              Design system: header, footer, mastheads, tenets,
                          cards, features, contact, search, reduced-motion.
  commerce.css            Relic grid cards, archive controls, add-to-cart,
                          product detail layout.

  lib/
    site.ts               Identity, Shopify endpoints, navigation graph, index.
    catalog.ts            Shopify fetch + Relic model, category taxonomy,
                          money formatter, fallback snapshot.
    search.ts             Content-derived page index for site search.

  content/                Reusable content models (the CMS-in-code layer):
    characters.ts         Character dossiers (Pryde / Kickz / Khemetz).
    canon.ts              Creed, Mythos chapters, Exsuvera studio, Founder.
    frequency.ts          Transmissions (editorial dispatches).

  components/
    SiteHeader.tsx        Responsive nav, mobile drawer, active-link state.
    SiteFooter.tsx        Grouped site index + connect links.
    RelicCard.tsx         Grid card → product page, hover angle reveal.
    RelicGallery.tsx      Drag/keyboard 360° garment viewer (+ GLB support).
    AddToCartForm.tsx     Variant select → Shopify /cart/add.
    ArchiveExplorer.tsx   Client-side category filtering.
    SearchExplorer.tsx    Client-side search over relics + canon.
    ContactForm.tsx       Validated message form (mailto / Instagram).
    Analytics.tsx         Env-gated privacy analytics loader.

  Routes: /  /archive  /archive/[handle]  /creed  /mythos  /dossiers
          /dossiers/[slug]  /frequency  /frequency/[slug]  /exsuvera
          /founder  /contact  /labrynth  /search  /voguejitsu
          + sitemap.ts, robots.ts, not-found.tsx
```

### Content model (CMS relationships)

Content lives in typed modules under `app/content/`. Pages and cross-links are
all derived from these — edit the data, every surface updates:

- **Dossiers** (`characters.ts`) power `/dossiers`, `/dossiers/[slug]`, the home
  bloodline trinity, the mythos bloodline grid, and the search index.
- **Canon** (`canon.ts`) powers `/creed`, `/mythos`, `/exsuvera`, `/founder`,
  and the home creed teaser.
- **Transmissions** (`frequency.ts`) power `/frequency` and
  `/frequency/[slug]`.
- **Relics** (`lib/catalog.ts`) are the live Shopify catalog, mapped to a shared
  `Relic` type used by home, `/archive`, `/archive/[handle]`, and `/search`.

## Commerce configuration

- Storefront: `exsuvera-presents.myshopify.com` (in `app/lib/site.ts`).
- Products are read from `https://<shop>/products.json` (no key required) and
  fall back to `app/catalog-snapshot.ts` if the network is unavailable.
- Add-to-cart posts to `https://<shop>/cart/add`; checkout is Shopify-hosted.
- To point at a different store, change `SHOP_DOMAIN` in `app/lib/site.ts` and
  regenerate the snapshot from the new store's `products.json`.

## Environment variables

All optional — the platform runs with none set.

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for `sitemap.xml` / `robots.txt` | `https://lionassbitch.com` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Routes the contact form to a real inbox (else it guides to Instagram) | _unset_ |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | Enables the Plausible analytics tag | _unset (no tracking)_ |
| `NEXT_PUBLIC_ANALYTICS_SRC` | Custom analytics script URL | `https://plausible.io/js/script.js` |

Put local values in an ignored `.env*` file.

## Deployment

Vercel is preconfigured via `vercel.json`:

```
buildCommand:    NITRO_PRESET=vercel npm run build
outputDirectory: .output
```

Cloudflare bindings (optional D1/R2) are declared in `.openai/hosting.json` and
simulated locally by `vite.config.ts`. `db/schema.ts` is intentionally empty
until a database is needed.

## Foundations in place

Accessibility (skip link, landmarks, `aria-current`, focus-visible rings,
keyboard-navigable gallery, reduced-motion handling), SEO (per-route metadata,
title template, OpenGraph/Twitter, JSON-LD Product schema, sitemap, robots),
and an env-gated analytics loader.

## Workspace auth (SIWC)

The vinext starter's ChatGPT sign-in helpers remain available in
`app/chatgpt-auth.ts` for the private-member systems planned in later releases
(see the delivery report). Reserved paths (`/signin-with-chatgpt`,
`/callback`, etc.) are owned by Dispatch — do not implement app routes for them.

## Useful commands

- `npm run build` — production build
- `npm test` — build + verification suite
- `npm run lint` — eslint
- `npm run db:generate` — Drizzle migrations (after schema changes)
