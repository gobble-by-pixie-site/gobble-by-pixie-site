# Gobble by Pixie — storefront

Astro storefront for Gobble by Pixie Cream Cheese ([@gobblebypixie](https://www.instagram.com/gobblebypixie/)). Read `CLAUDE.md` first for the "why" behind key decisions; this file is the practical setup/handoff reference.

**Live**: https://gobblebypixie.com

## Stack (2026-08-24 — SSR migration + Console content backfill)

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
| `CONSOLE_API_URL` | `https://console.linearventures.in` |
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
- **Verify the build landed (no Pages token needed):** `gh api repos/gobble-by-pixie-site/gobble-by-pixie-site/commits/<sha>/check-runs`
  returns a `Cloudflare Pages` check-run whose `conclusion` is the build result and whose `details_url` carries the deployment id.
  Measured on commit `de2eac2` (2026-10-26 cache fix): `completed / success`, deployment `7334088b-d8d7-4d83-8954-61302d6db750`,
  40 s after the push. This works because the push credential is the SSH key `~/.ssh/id_gobblebypixie` (host alias
  `github-gobblebypixie`) and the Pages GitHub App reports the build back to GitHub. No Cloudflare API token on this
  account has Pages read - the `cfut_r5gy...` token is Cache Purge/Cache Rules/DNS Edit only and 403s on the Pages API.
- **Fallback (GitHub down):** `bash deploy.sh` - builds locally, assembles
  the Pages worker, deploys straight to project `gobble-by-pixie-site`.
  OAuth login is the only working auth for this project (API-token auth is
  broken - see _Secrets reference, Account 3). Out-of-band deploy: verify live.

## 2026-10-06 - 404 page + custom pages + vision hooks

- **404 page**: `src/pages/404.astro` exists (previously NO 404 anywhere in
  src — Astro served a bare platform error for unknown routes).
- **Custom pages**: `src/pages/[...slug].astro` renders Console-authored
  pages (Settings → Content → Pages, `pages` capability flag) at `/<slug>`
  — published only, `?previewToken=` for drafts (DRAFT PREVIEW banner),
  real 404s with status 404 on every failure path. `sitemap.xml.js`
  appends published pages (fetch failure leaves it unchanged).
- **console-client.ts**: fetches now carry a 10s AbortSignal timeout.
- **Vision hooks**: BaseLayout's livedraft listener branches on IMG (patches
  src) + posts `{type:"lc-applied", key}` acks; HomeSections hero images and
  custom-page blocks carry `data-lc` hooks (`sec:<id>:imageUrl` /
  `page:<i>:<field>`) for the Console vision panel's image swap + live edit.
- **Navigate-follow** (commit `af1c97f`): the Console sends `lc-editable` and
  the listener intercepts ONLY those into `lc-navigate`, so `/menu`, `/events`,
  `/faq`, `/byop`, `/account` and the rest still navigate normally. The
  product grid is quick-view MODAL buttons rather than links, and HomeSections
  renders an unset section CTA as `href='#'`, so the interceptor bails on
  `button` / `[data-lc]` / hash hrefs. This site has no `/contact` page (and
  none in the PAGE map), which matches the Console hiding that tab for food
  tenants. `lcNormPath` matches the Console's `normPath`
  (`src/lib/vision-paths.ts`). `lc-content-ready` now carries the current
  `path` so the Console can say "no editor for this page" instead of going
  blank.

## 2026-10-12 — COD checkout: address keys, PIN→state, store credit, live offers, customer notes

- **Customer notes now reach Console.** The cart line's own `note` — used by
  `/byop` for occasion, gift note and kitchen instructions — was dropped twice
  on the way to checkout: once in the drawer's submit payload and again in
  `api/checkout/cod.ts`, each rebuilding the item as `{slug, qty}` /
  `{productId, qty}`. The customer saw their instruction in the drawer and the
  kitchen received nothing, which for "extra nut isolation, strict keto crisp
  preference" is a safety problem. `note` now travels as `lineNotes` and
  Console stores it on the order line (migration 0095), printing it on the
  invoice and packing slip.
- **New order-level note** in the COD form (`#codNote`): allergies, delivery
  instructions or a gift message for the order as a whole. Sent as
  `customerNote`; Console stores it as `orders.customer_note` and echoes it back
  in the order confirmation email so the shopper can see it landed.
- **BYOP platters stay WhatsApp-only** (owner decision, 2026-10-12). `cod.ts`
  still refuses `byop-`/`custom-` ids, because they have no product row to price
  from. The note is therefore still relayed by hand on that path — recorded
  here as a known gap, not an oversight.
- **GST was fixed at the same time**: every product had a NULL `gst_rate`, and
  because the GST 2.0 auto-classifier is clothing-only, all 37 resolved to 0%.
  Now 5% across the catalogue (owner's stated rate for branded packaged cheese).

- **Store credit** (drawer `#codForm`): code + amount inputs beside the coupon
  box, sending `creditCode` + `creditAmount` through `api/checkout/cod.ts` to
  Console's `orders/create-cod`, which validates it as credit and sums it
  into the discount. Previewed live (debounced `/api/coupons/validate`,
  display-only — submit re-sends raw fields for authoritative pricing); a
  promo code in the credit box says "That is a promo code, not store credit."
  at the box via the new proxy. The summary gained a store-credit row.
- **Live offers** (`api/coupons/best.ts` → Console `GET /best`, rendered in
  the COD form when opened). Renders nothing while the tenant has no live
  promos (zero today) — correct for a store that doesn't discount.
- **New proxies** (`api/coupons/validate.ts`, `api/coupons/best.ts`): thin,
  key-stays-server-side, best-effort shapes the drawer tolerates. Drawer
  email capture (`saveAbandonedCart` on `codEmail`) predates this and is
  unchanged — verified still firing.
- **The address keys Console actually reads** (commit `b6d8bd8`). Every Gobble
  invoice and delivery label had been printing the **pincode alone** — no
  street, no city, no state. Console's `addressLines()` reads
  `line1/line2/city/state/pincode/country` and there is NO aliasing anywhere,
  so the old `{name, phone, address, pincode}` payload matched only on
  `pincode`; the street arrived intact and sat under a label nothing reads.
  `cod.ts` now sends `{line1, city, state, pincode, country:"IN"}` plus
  `customerName` / `customerPhone` at the top level (guest find-or-create
  persists email only, which is why every guest's Bill To block was blank).
  pincode/city/state are required server-side: an empty state makes
  `interState` permanently false, i.e. CGST+SGST where IGST was owed.
- **PIN → state, editable on purpose** (`src/lib/pin-state.ts`, commit
  `b6d8bd8`). The COD form gained city + a state select whose value is
  DERIVED from the pincode (longest-prefix-first, so `403` Goa beats `40`
  Maharashtra) and stays editable, because a handful of PINs sit near a
  border and the invoice has to be right. The layout script cannot import,
  so the table is embedded in `BaseLayout.astro` (`COD_STATES` /
  `COD_PIN_PREFIX`) GENERATED from the module — and
  `tests/smoke/checkout-address.test.mjs` parses the embedded block back out
  and fails if the two drift, so editing `ZONES` without regenerating fails
  the build instead of shipping quietly.

## 2026-10-26 - Catalog fetch cached (Cloudflare `error 1102` hardening)

Same failure class that intermittently took the TCS storefront down with
`error code: 1102` (Cloudflare killing a Pages Function for exceeding a Worker
resource limit): every page renders `BaseLayout` (which calls `fetchProducts()`
for the nav) **and** its own body (which calls it again for the grid), so one
request downloaded and re-mapped the whole Console catalog twice — and this
module had no cache despite `fetchProductBySlug`'s comment saying it did.

- `fetchFromConsoleProducts()` now keeps a 60 s module-scope cache of the
  normalized catalog and returns a shallow copy, so callers can sort/filter
  without corrupting it. Only non-empty successful Console responses are
  cached; the Sheets/placeholder fallback path is unchanged.
- The Console fetch gained `AbortSignal.timeout(10000)`, matching
  `console-client.ts` — a hung Console can no longer hold the invocation open.
- Verified: `npm run build` clean; the built homepage is **byte-identical** to
  the live page (52,278 bytes, 369 lines, 0 differing lines); five rapid
  renders produced **zero** additional catalog fetches after the first.
- **Shipped and confirmed live:** commit `de2eac2` → Cloudflare Pages check-run
  `completed / success` at 2026-10-26T08:59:31Z (deployment
  `7334088b-d8d7-4d83-8954-61302d6db750`, via the Git integration). Post-deploy:
  18/18 requests 200 across `/`, `/menu`, `/about`; edge cache serving `HIT`
  at `Age: 122` on `/about`, i.e. the 300 s rule is in effect (the origin still
  sends `s-maxage=60`).
