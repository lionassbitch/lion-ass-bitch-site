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

## 1. Buy `exsuvera.com` at Porkbun

1. Porkbun → search `exsuvera.com` → add to cart → check out.
2. Leave WHOIS privacy on (free at Porkbun).
3. Turn auto-renew on. A coined mark should never lapse.
4. Register it under the entity that will hold the trademark (Exsuvera LLC if
   that is the plan), not a personal name, so the WHOIS creation date and the
   mark's owner line up for first-use evidence.

## 2. Attach the hosts in Vercel

Vercel → team `edwin-colonjs-projects` → project `lion-ass-bitch-site` →
Settings → Domains → add each of:

- `exsuvera.com`
- `www.exsuvera.com` (set to redirect to `exsuvera.com`, or leave as-is; both serve the gate)
- `lab.exsuvera.com`
- `exsuvera.lionassbitch.com`

Vercel will show the exact records it expects for each. They match the table
below; if Vercel shows a different target, use Vercel's.

## 3. DNS records at Porkbun

### `exsuvera.com` zone

| Type | Host | Answer | TTL |
|---|---|---|---|
| A | `exsuvera.com` (apex, leave host blank) | `76.76.21.21` | 600 |
| CNAME | `www` | `cname.vercel-dns.com` | 600 |
| CNAME | `lab` | `cname.vercel-dns.com` | 600 |

Delete Porkbun's default parking / ALIAS records on the apex first, or the A
record will conflict.

### `lionassbitch.com` zone (already at Porkbun)

| Type | Host | Answer | TTL |
|---|---|---|---|
| CNAME | `exsuvera` | `cname.vercel-dns.com` | 600 |

Do not touch the existing apex or `www` records.

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
