# AGENTS.md — Gobble by Pixie storefront (gobble-site)

Astro 7 (`output: 'server'`) on `@astrojs/cloudflare` v14, deployed to
Cloudflare Pages project **`gobble-by-pixie-site`** (the client's own account),
git-connected: **every push to `main` auto-builds and goes live.**
`.node-version` pins Node 22.23.4 — an insufficient Node fails the Pages build
and the previous deployment stays live silently. Architecture, endpoints and
known issues live in `README.md` (the single reference doc).

This repo owns presentation only. All editable data belongs in the separate
`linear-console` repo (`Downloads/Projects/linear-console`), reached solely
through `/api/public/*` via the storefront API client with THIS tenant's own
`CONSOLE_STOREFRONT_API_KEY` (a cross-tenant key leaks another tenant's data —
the 2026-09-01 incident class). **No database connection strings here.**

## The estate's build standards — read before adding any form or page

The canonical checklist lives in `linear-console/AGENTS.md` § "UNIVERSAL BUILD
STANDARDS" (2026-11-14). The short form:

1. **Phone entry** goes through the searchable country combobox from
   `src/lib/estate-forms.js` — it auto-upgrades EVERY dial `<select>` (the
   206-row country mirror in `src/lib/phone-countries.js`). Never hand-roll a
   phone field; never render `PHONE_COUNTRIES` through a plain native select
   (the flag-emoji option labels kill native type-ahead — the bug that
   started this). The select stays the source of truth; the enhancer only
   changes how the user picks and dispatches real `change` events.
2. **India address forms** get PIN → city/state autofill from the same
   module (`input[name="pincode"]` with a city/state sibling is enhanced
   automatically). Gobble's COD drawer (`#codPincode`) and the account page
   (`#a-pincode`) have their OWN lookups (offline prefix map / India Post)
   and keep them — the module only fills surfaces without one.
3. **"Price on request"** is the estate's ₹0 display rule (per-line in
   Console's `priceOrder`; display-side in this repo's card/quick-view).
4. Run `npm run build` (it includes the hover-CSS gate) before pushing.

`estate-forms.js` is IDENTICAL in all four commerce storefronts (nanoliss,
TCS, gobble, mane). If you fix a bug in it here, fix it in all four — it is a
copy, not a package. The detector lesson lives in its header comment: flag
emoji are Regional Indicators (U+1F1E6–FF) and are NOT
`\p{Extended_Pictographic}` — the first detector matched ZERO selects live.

## Deployment

Push to `main` → Cloudflare Pages builds. Verify AFTER deploy by fetching a
real page (an SSR route, not just an asset) and checking the content hash of
the changed bundle — the edge can serve the previous build for minutes.

## Do not break

- Tenant isolation: every Console call is keyed per tenant; never share keys.
- The quiz/reviews/track/recommendations parity rules (Console AGENTS.md).
- `.node-version` — bumping it without the Pages dashboard env matching will
  silently keep the old deployment live.
