# Gobble by Pixie — storefront

Astro storefront for Gobble by Pixie Cream Cheese ([@gobblebypixie](https://www.instagram.com/gobblebypixie/)). Read `CLAUDE.md` first for the "why" behind key decisions; this file is the practical setup/handoff reference.

**Live**: https://gobblebypixie.com

## Stack

- **Astro** (static output), no UI framework, no Tailwind — vanilla CSS with design tokens.
- **Content**: Google Sheet published as CSV (see `src/lib/fetchProducts.js`) — live in production, real 37-item catalog. Site copy (hero text, fulfillment banner, FSSAI/GSTIN, etc.) reads from the SiteContent tab the same way (see `src/lib/fetchSiteContent.js`).
- **Accounts/Rewards**: localStorage session + a deployed, working Google Apps Script backend (`code.gs` in this repo — also the source of truth mirrored into the Sheet's own Script Editor).
- **Cart**: `public/cart.js`, plain JS + localStorage, shared across every page via `window.GobbleCart`.

## Local development

```bash
npm install
npm run dev
```

Runs on `http://localhost:3005` by default (see `astro.config.mjs` → `server.port`). A `.claude/launch.json` entry named `gobblebypixie-dev` is already registered for browser-preview tooling.

```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## Deploying

No CI — deploys are manual:

```bash
npm run build
node_modules/.bin/wrangler pages deploy dist --project-name gobble-by-pixie-site --branch main
```

Requires being logged into wrangler via OAuth (`wrangler login`) as the client's own Cloudflare account — **not** an API token (hits a reproducible wrangler bug on this project, see `CLAUDE.md`). `git push` alone does not deploy the live site.

## Environment variables

`.env` (gitignored, not committed) needs:

```
GOOGLE_SHEET_CSV_URL=          # published-CSV URL for the Products tab of the backend Sheet
GOOGLE_SITE_CONTENT_CSV_URL=   # published-CSV URL for the SiteContent tab (see src/lib/fetchSiteContent.js)
GOOGLE_EVENTS_CSV_URL=         # published-CSV URL for the Events tab (see src/lib/fetchEvents.js)
APPS_SCRIPT_URL=               # deployed Apps Script Web App /exec URL (code.gs)
```

Both are live in production. Without them locally, the site builds fine using hardcoded placeholder products and the account pages show a "not configured yet" state instead of erroring — useful for working on layout/design without needing real credentials.

## File map

```
code.gs                    — Google Apps Script backend: auth, points/tiers, orders, coupons,
                              GST calculation, Razorpay webhook (built, keys pending)
public/
  cart.js                  — shared cart engine, window.GobbleCart
  Logos/                   — real brand logo, red/black/white (black variant in use)
  Cover photo.JPG          — hero image
  Green Jar.png            — used in the floating WhatsApp contact button
src/
  layouts/
    BaseLayout.astro       — header (nav, cart icon, account link), cart drawer, mobile drawer,
                              footer (incl. FSSAI/GSTIN), floating WhatsApp button, global <head>
  components/
    ProductCard.astro          — product card used on home + menu category pages; wires "Add to
                                  Cart" for priced items, "Enquire on WhatsApp" for unpriced ones
    ProductQuickViewModal.astro — shared Quick View modal, included by each /menu/[category] page
    GlutenFreeIcon.astro       — generic GF icon (not a certification mark — product isn't certified)
  lib/
    fetchProducts.js       — Sheet-CSV fetch + parse + fallback data + formatPrice(); also
                              exports convertImageUrl() (Drive share link → thumbnail URL,
                              reused by fetchEvents.js) and slugify() (category name → URL
                              slug, reused by BaseLayout.astro's Menu dropdown and every
                              /menu/* page so the two always agree)
    fetchSiteContent.js    — SiteContent tab fetch + parse, falls back to hardcoded copy
    fetchEvents.js         — Events tab fetch + parse, filters to published=TRUE rows only
  pages/
    index.astro            — homepage
    menu.astro              — category hub: tiles linking to /menu/[category], not a product list
    menu/
      [category].astro      — one page per live category (getStaticPaths), sticky cross-category
                               sub-nav, product grid + Quick View modal
      grazing-tables.astro  — static "book a grazing table" page, same sub-nav as category pages
    byop.astro              — "Build Your Own Platter" 5-step wizard, adds to cart on completion
    events.astro             — event photo/write-up gallery, reads the Events tab
    about.astro              — brand story
    faq.astro                — delivery/fulfillment schedule + FAQ accordion
    account.astro            — logged-in account: Profile / Orders (with Reorder) / Rewards tabs
    login.astro               — sign in + forgot-password request
    signup.astro               — create account (100pt signup bonus)
  styles/
    global.css              — ALL design tokens live here. Change the brand look by editing this
                              file only — components consume var(--token-name), nothing hardcoded.
```

## Design system

Editorial style (client-approved reference: `miampatisserie.com`) — muted dusty-rose/cream palette, sharp corners, unified Cormorant Garamond/EB Garamond. All tokens in `src/styles/global.css`. To retheme:

1. Edit the `:root` block in `global.css` — every component reads from these tokens.
2. Don't hardcode hex values in component `<style>` blocks; add a token instead if you need a new color.

## Ordering flow (current state)

Real multi-item cart (`public/cart.js`) — customers can add several items across pages, adjust quantities, and check out with one combined WhatsApp message. No payment backend yet (waiting on Razorpay keys), so checkout ends at WhatsApp rather than a real payment — swap that step out once keys are added; `code.gs`'s order-creation and webhook logic is already built for it.

## Where to look next

- `../PLAN.md` — full scope decisions, phased build order, BOS/backend integration plan (one directory up — planning doc, not deployed with the site).
- `CLAUDE.md` in this folder — architecture rationale and current known gaps.
