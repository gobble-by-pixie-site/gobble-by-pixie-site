# Gobble by Pixie — storefront

- Astro static site, **vanilla CSS design tokens** (`src/styles/global.css`) — deliberately no Tailwind, no component library, per client design brief (luxury gourmet aesthetic, not a generic Shopify look).
- Colors are sampled from the client's own Instagram (@gobblebypixie) content, not invented — see `PLAN.md` for the research notes. If the palette ever needs re-deriving, re-check the real Instagram before guessing.
- Product/menu data: Google Sheet published as CSV, same pattern as `theclosetstory.com/tcs-store` — see `src/lib/fetchProducts.js`. Falls back to hardcoded placeholder products (real flavors seen on Instagram, not invented ones) when `GOOGLE_SHEET_CSV_URL` isn't set.
- Account/rewards system (`/account`, `/login`, `/signup`) follows the exact same pattern as `tcs-store`: localStorage session (`gbp_auth`, `gbp_customer`) + a Google Apps Script backend (`APPS_SCRIPT_URL` env var) for signin/signup/profile/orders. **The Apps Script backend itself is NOT yet built/deployed for this tenant** — the frontend is wired and will work the moment a script implementing the same `action=signin|signup|get-profile|update-profile|get-orders` contract as TCS's is deployed and its URL set in `.env`. Points/tiers are food-themed (Nibbler → Foodie → Gobbler VIP) instead of TCS's Bronze/Silver/Gold.
- Full build plan, scope decisions, and BOS integration roadmap: `../PLAN.md` (one level up, shared with the non-website phases).
- Deploy target: not yet configured — will mirror `tcs-store`'s Cloudflare Pages pattern once ready to go live.

See `README.md` for local dev setup and full file map.
