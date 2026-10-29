# Domains — Porkbun registrar, Vercel hosting

**Registrar of record: Porkbun.** Every domain in the family is bought and
renewed at Porkbun; Vercel only hosts. Nothing is purchased through Vercel.

## The family

| Host | Serves | How |
|---|---|---|
| `lionassbitch.com`, `www.lionassbitch.com` | The flagship (this site) | Already attached to the `lion-ass-bitch-site` Vercel project |
| `exsuvera.com`, `www.exsuvera.com` | Exsuvera Presents gate at `/` | Same project; host-aware routing in `app/page.tsx` |
| `exsuvera.lionassbitch.com` | Exsuvera Presents gate at `/` | Same project; free subdomain |
| `lab.exsuvera.com` | 308 redirect to `https://lionassbitch.com` | Same project; `app/lib/hosts.ts` |

The parent sits above the flagship: `exsuvera.com` is the house and routes
down to LionAssBitch.com. `exsuvera.lionassbitch.com` is a courtesy alias so
the gate also lives inside the flagship's own domain. Both resolve to the same
gate and the same deployment.

Host matching lives in `app/lib/hosts.ts`. Add a host there and it starts
serving the gate or redirecting on the next deploy; DNS is the only per-domain
step.

## 1. Buy `exsuvera.com` at Porkbun — DONE

1. Porkbun → search `exsuvera.com` → add to cart → check out.
2. Leave WHOIS privacy on (free at Porkbun).
3. Turn auto-renew on. A coined mark should never lapse.
4. Register it under the entity that will hold the trademark (Exsuvera LLC if
   that is the plan), not a personal name, so the WHOIS creation date and the
   mark's owner line up for first-use evidence.

## 2. Hosts attached in Vercel — DONE (2026-10-29)

All four hosts are attached to project `lion-ass-bitch-site` and verified (no
TXT challenge was required):

- `exsuvera.com`
- `www.exsuvera.com`
- `lab.exsuvera.com` — Vercel-level 308 redirect to `lionassbitch.com`
  (belt and braces: `app/lib/hosts.ts` also redirects it in the app)
- `exsuvera.lionassbitch.com`

## 3. DNS records at Porkbun — the only step left

These are the values Vercel reports for this project (its rank-1
recommendations). `cname.vercel-dns.com` and `76.76.21.21` also work, but the
project-specific ones below are what Vercel prefers.

### `exsuvera.com` zone

First delete every default Porkbun record on the apex, `*`, and `www`
(the parking A records `207.207.210.x` and the `uixie.porkbun.com` CNAME).
The wildcard must go or it shadows `lab`.

| Type | Host | Answer | TTL |
|---|---|---|---|
| A | leave blank (apex) | `216.198.79.1` | 600 |
| A | leave blank (apex) | `64.29.17.1` | 600 |
| CNAME | `www` | `776d5f2d1c6e27a4.vercel-dns-017.com` | 600 |
| CNAME | `lab` | `776d5f2d1c6e27a4.vercel-dns-017.com` | 600 |

### `lionassbitch.com` zone

| Type | Host | Answer | TTL |
|---|---|---|---|
| CNAME | `exsuvera` | `776d5f2d1c6e27a4.vercel-dns-017.com` | 600 |

Do not touch the existing apex records. Note: the apex currently resolves to
Cloudflare addresses (`162.159.143.30`, `172.66.3.26`), not Vercel, and
`www.lionassbitch.com` has no record at all. Vercel reports the apex as
misconfigured for its purposes. Decide whether the flagship is meant to be
served by Cloudflare (in front of or instead of Vercel) before changing it.

## 4. Verify

- `https://exsuvera.com` → the gate (trinity hook, THE NAME, the reveal, ENTER).
- `https://exsuvera.lionassbitch.com` → the same gate.
- `https://lab.exsuvera.com` → lands on `https://lionassbitch.com`.
- `https://lionassbitch.com` → unchanged flagship home.

Vercel issues certificates automatically once DNS resolves; allow up to an hour
for propagation.

## Not doing

- `exsuverapresents.com` — "presents" is campaign language, not a mark. The
  gate is the root of `exsuvera.com`. Register it only if it is going on printed
  material that people will type cold.
- `exsuvera.lionassbitch.com` as the *primary* home of Exsuvera — it inverts the
  hierarchy (the child would appear to own the parent). Alias only.
