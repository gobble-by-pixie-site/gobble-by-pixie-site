# Gobble by Pixie — storefront

Astro storefront for Gobble by Pixie Cream Cheese ([@gobblebypixie](https://www.instagram.com/gobblebypixie/)). Read `CLAUDE.md` first for the "why" behind key decisions; this file is the practical setup/handoff reference.

## Stack

- **Astro** (static output), no UI framework, no Tailwind — vanilla CSS with design tokens.
- **Content**: Google Sheet published as CSV (see `src/lib/fetchProducts.js`).
- **Accounts/Rewards**: localStorage session + Google Apps Script backend (same pattern as `theclosetstory.com/tcs-store`) — see `CLAUDE.md` for current status (frontend done, backend script not yet deployed).

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

## Environment variables

Create a `.env` file (not committed) with:

```
GOOGLE_SHEET_CSV_URL=   # published-CSV URL for the product/menu Sheet — see fetchProducts.js header comment for column layout
APPS_SCRIPT_URL=        # Google Apps Script web-app URL backing signup/signin/orders/rewards — not yet deployed, see CLAUDE.md
```

Without these, the site builds fine using hardcoded placeholder products and the account pages show the "not configured yet" state instead of erroring.

## File map

```
src/
  layouts/
    BaseLayout.astro       — header (nav + account link), footer, fulfillment banner, global <head>
  components/
    ProductCard.astro      — single product card used on home + menu
  lib/
    fetchProducts.js       — Sheet-CSV fetch + parse + fallback data + formatPrice()
  pages/
    index.astro            — homepage
    menu.astro              — full catalog with category filter tabs
    byop.astro              — "Build Your Own Platter" 5-step wizard (client-side state, WhatsApp checkout)
    about.astro              — brand story
    faq.astro                — delivery/fulfillment schedule + FAQ accordion
    account.astro            — logged-in account: Profile / Orders / Rewards tabs
    login.astro               — sign in
    signup.astro               — create account (100pt signup bonus)
  styles/
    global.css              — ALL design tokens live here (colors, type, spacing, radii, shadows). Change the brand look by editing this file only — components consume var(--token-name), nothing is hardcoded inline except one-off gradients that reference the same tokens.
```

## Design system

All colors/fonts/spacing are CSS custom properties in `src/styles/global.css`, sampled from the client's real Instagram content (not invented — see `../PLAN.md` for the research notes and the canvas-based color-extraction pass that produced them). To retheme:

1. Edit the `:root` block in `global.css` — every component reads from these tokens.
2. Don't hardcode hex values in component `<style>` blocks; add a token instead if you need a new color.

## Ordering flow (current state)

There is no checkout/payment backend yet. The BYOP wizard and product cards build a prefilled WhatsApp message and hand off to the client's existing `wa.link/sngzs9` ordering channel — this is intentional (see `../PLAN.md` build order: webhook/BOS wiring is a later phase, not blocking the website launch).

## Where to look next

- `../PLAN.md` — full scope decisions, phased build order, BOS/backend integration plan, what's confirmed vs. still open with the client.
- `CLAUDE.md` in this folder — architecture rationale and current known gaps (Apps Script backend, deploy target).
