# Gobble by Pixie — storefront

Astro storefront for Gobble by Pixie Cream Cheese ([@gobblebypixie](https://www.instagram.com/gobblebypixie/)). Read `CLAUDE.md` first for the "why" behind key decisions; this file is the practical setup/handoff reference.

**Live**: https://gobblebypixie.com

## Stack (2026-08-24 — SSR migration)

- **Astro 7, `output: 'server'`** on `@astrojs/cloudflare` v14 — same stack as nanoliss.com. Deployed to Cloudflare Pages project **`gobble-by-pixie-site`** (client's own account), git-connected: every push to `main` auto-builds and goes live.
- **`.node-version` pins Node 22.12** — Astro 7 requires it; without the pin the Pages build fails on older defaults and the previous deployment stays live silently.
- **Console is the source of truth**: menu/products/collections/site copy/analytics IDs all come from Linear Console's `/api/public/*` at request time with a 60s in-memory cache. Console edits are live in ≤60s — no rebuilds.
- **Env rule (critical)**: never read `import.meta.env.*` for server config — it's build-time-only under the Cloudflare adapter and once served a placeholder catalog to production (2026-08-24 incident). Everything goes through `src/lib/env.ts` (`getEnv()`, populated by `src/middleware.ts` capturing worker runtime env) which accepts both `CONSOLE_API_URL` and `CONSOLE_API_BASE_URL`. Same pattern as nanoliss.com.
- **Stock**: Console exposes `stockQty`, never a boolean. `in_stock = stockQty > 0` is derived in `fetchProducts.js`.
- **Cart/checkout**: WhatsApp-based ordering (`public/cart.js` + wa.link deep links, GST breakdown client-side). Standalone-tenant Razorpay checkout via Console (`orders/create` + `verify-payment`) is the documented upgrade path once Razorpay keys are seeded for this tenant.
- **Search**: header search overlay → `/api/search` → Console search API.
- **Waitlist/newsletter**: footer "First Bites" + category waitlists POST `/api/newsletter` → upserts into Console `newsletter_subscribers` (Settings → Newsletter campaigns send to that list).
- **Analytics**: GA4/GTM/Meta Pixel snippets render from Console store-config when IDs are set.

## Local development

```bash
npm install
npm run dev      # port 3005 (see astro.config.mjs)
npm run build    # production build -> dist/client + dist/server
```

`.env.local` mirrors the Pages dashboard vars:

| Var | Value |
|---|---|
| `CONSOLE_API_URL` | `https://linear-console.vercel.app` |
| `CONSOLE_STOREFRONT_API_KEY` | tenant key from `_Secrets/PROJECT_SECRETS_REFERENCE.md` §14 |

## Product cards

Deliberately compact (client feedback: jars looked oversized): 168px image well, tight type scale, 2-line clamped descriptions. Adjust in `ProductCard.astro`'s scoped styles.

## Legacy

`code.gs` / Google Sheets CSV fallbacks remain in `lib/*.js` as dead-code fallback paths only; Console owns all data since the 2026-08 cutover.


## 2026-08-24 - Verification pass + full audit (no code changes)

Full audit against live SSR deploy: /api/search returns real JSON results
(q=gift -> 6 hits), catalog pages healthy. Search endpoints on all three
storefronts (gobble/nanoliss/tcs) verified same day. Nothing to fix;
no deploy triggered.

## Deployment

- **Normal:** git push to `main` (CF Pages auto-builds).
- **Fallback (GitHub down):** `bash deploy.sh` - builds locally, assembles
  the Pages worker, deploys straight to project `gobble-by-pixie-site`.
  OAuth login is the only working auth for this project (API-token auth is
  broken - see _Secrets reference, Account 3). Out-of-band deploy: verify live.
