# Gobble by Pixie — storefront

- Astro static site, **vanilla CSS design tokens** (`src/styles/global.css`) — deliberately no Tailwind, no component library.
- **Design pivoted 2026-07-30** to an editorial style matching client-approved reference `miampatisserie.com`: muted dusty-rose/cream palette, sharp corners (not rounded pills), unified Cormorant Garamond/EB Garamond typography (dropped the earlier Playfair Display + colorful multi-hue direction). If you see references to a "colorful boutique" palette elsewhere (old commits, PLAN.md history), that's superseded — current tokens are the source of truth.
- Real brand assets in use: logo (`public/Logos/gobble-logo-tm-black.png` — black variant chosen for contrast against the light/cream site; red/white variants also present but unused), real product photography (`public/cover-photo.jpg`, `public/green-jar.png`).
- **Console (ARM Postgres on `immich-arm`) is the single source of truth** — no direct DB access from this repo. Menu/products/collections/site copy/analytics IDs all come from Linear Console's `/api/public/*` at request time with a 60s in-memory cache. Console edits are live in ≤60s — no rebuilds. Site content (about page eyebrow/heading/values, home page hero/sub/trust, BYOP copy, best-sellers copy) is managed via Console → Settings → Content and backfilled as of 2026-08-24. The old Google Sheets CSV fallbacks remain in `lib/*.js` as dead-code paths only.
- Site copy (hero eyebrow/sub/trust text, footer tagline, fulfillment banner, FSSAI/GSTIN, grazing-table price, about-page intro) is wired to the SiteContent tab (`src/lib/fetchSiteContent.js`, `GOOGLE_SITE_CONTENT_CSV_URL` env var) as of 2026-07-31 — she can edit the `value` column and rebuild+redeploy to update text without touching code. Falls back to hardcoded defaults per-key if the Sheet value is blank or the CSV fetch fails, so a half-filled Sheet can't break the site. **Use the standard gid-based `export?format=csv&gid=<id>` URL, same pattern as `GOOGLE_SHEET_CSV_URL`** — a `gviz/tq?tqx=out:csv&sheet=<name>` URL was tried first and looked more robust on paper (survives tab reordering) but Google's gviz export reproducibly squashed most rows of this exact sheet into one row while the gid-based export read it perfectly; root cause never identified, just avoid gviz here. Not yet wired: the H1 "Handmade Flavoured Cream Cheese" wordmark (kept hardcoded — it's split into two `<span>`s for the gradient effect, not a plain string) and the FAQ page's dispatch cards (structured differently from the banner's combined string, left as-is).
- Account/rewards system (`/account`, `/login`, `/signup`) is Console-native since 2026-10-07: the session is Console's customer token in an httpOnly `gbp_session` cookie, set by same-origin proxies (`src/pages/api/auth/*`, `src/pages/api/account/*`) that forward to Console `/api/public/customers/*` with the tenant key (`src/lib/auth-customer.ts`, `src/lib/auth-session.ts` — ported from the TCS pattern). Points come from Console `me/loyalty`; the displayed tier is derived from those points in `account.astro` (`displayTier(points)`) and Console's own tier name is deliberately NOT read (`621ac96`) — Nibbler/Foodie/Gobbler-VIP and their thresholds are house brand copy with no mapping for Console's Bronze/Silver/Gold/Platinum, so trusting it would print a name the legend has never heard of. REPLACES the old Google Apps Script backend (`code.gs`, untracked 2026-10-07): signup/signin/profile/orders used to hit a deployed Apps Script web app keeping customers in a Sheet. That path is fully removed from `src/` — no page reads `APPS_SCRIPT_URL` anymore. `code.gs` remains on disk for reference only; its Razorpay keys were always placeholders (never live), and its only real-looking secret is `AUTH_SECRET` (Sheet-token signing) — relevant only if the Sheet backend is ever revived, which it must not be.
- **Cart**: `public/cart.js` is a plain-JS, localStorage-backed shopping cart shared across every page (loaded globally via a `<script>` tag in `BaseLayout.astro`, exposed as `window.GobbleCart`). Every "add to order" action on the site (homepage cards, menu Quick View modal, BYOP custom platters, account-page Reorder) adds to this cart, not a per-item WhatsApp link. Checkout has two paths since 2026-10-07. (1) WhatsApp (unchanged default): builds one combined message from the cart contents. (2) Cash on Delivery: the drawer's “Pay on Delivery” button collects name/phone/email/address/city/pincode (state derived from the pincode and left editable) and POSTs slugs+qty to same-origin `/api/checkout/cod` (`src/pages/api/checkout/cod.ts`), which resolves slugs to Console UUIDs against the LIVE catalog, rejects custom platters and priced-on-request rows with plain WhatsApp-redirect messages, and calls Console `orders/create-cod` (server-repriced; needs `clients.cod_enabled`, on for this tenant since 2026-10-07, no fee set). **The address keys are literal**: `cod.ts` sends `{line1, city, state, pincode, country}` plus top-level `customerName`/`customerPhone`, because the old `{name, phone, address, pincode}` shape matched Console's `addressLines()` on `pincode` alone and every invoice printed the pincode by itself; pincode/city/state are REQUIRED, since an empty state makes `interState` permanently false (CGST+SGST where IGST was owed). `src/lib/pin-state.ts` owns the PIN→state table (longest-prefix-first, so `403` Goa beats `40` Maharashtra); it is embedded in `BaseLayout.astro` (`COD_STATES`/`COD_PIN_PREFIX`) and `tests/smoke/checkout-address.test.mjs` parses that block back out, so regenerate it whenever `ZONES` changes. Signed-in shoppers ride the `gbp_session` cookie; guests check out with an email (Console links repeats). Cart items now carry a GST breakdown (Taxable Value / CGST 2.5% / SGST 2.5% / Total), computed client-side in `cart.js`'s `gstBreakdown()` mirroring `code.gs`'s `computeGstBreakdown()` exactly — same intra-state (Delhi NCR) assumption caveat applies. **Important Astro gotcha**: `.cart-item*`, `.cart-empty`, `.qty-btn` styles live in `global.css`, not in `BaseLayout.astro`'s scoped `<style>` block — those elements are built via `innerHTML` in `renderCart()` at runtime, so they never receive Astro's scoped `data-astro-cid` attribute and a scoped rule would silently never match. Any future cart-item markup change needs its CSS added to `global.css`, not the layout's own style block.
- **Events page** (`/events`, built 2026-07-31): reads the Events tab (`src/lib/fetchEvents.js`, `GOOGLE_EVENTS_CSV_URL` env var) — photo + title + date + description per event, only rows with `published=TRUE` show. Reuses `convertImageUrl()` exported from `fetchProducts.js` for Drive-link handling, same convention as Products. Header nav's Menu dropdown is now built dynamically from live Products categories (`BaseLayout.astro` calls `fetchProducts()`/`getCategories()` itself) instead of a hardcoded list — same pattern `theclosetstory.com/tcs-store`'s Categories dropdown uses — so adding a category row to the Sheet makes it appear in the dropdown and menu pages on the next rebuild, no code change needed.
- **Menu restructured into per-category pages** (2026-07-31, replacing the old single-page-with-anchor-sections design): `/menu` is now a hub of category tiles, `/menu/[category].astro` is a `getStaticPaths()`-driven dynamic route generating one real page per live Products category — exact pattern copied from `theclosetstory.com/tcs-store/src/pages/category/[category].astro`. `/menu/grazing-tables` is a static sibling page (Grazing Tables isn't a real Products category, just a service enquiry). Every category page has a sticky sub-nav linking to every *other* category page (not anchors), so browsing across categories doesn't require going back through the hub. `ProductQuickViewModal.astro` is a shared component included on each category page rather than duplicated. `slugify()` (in `fetchProducts.js`) is the single source of truth for category-name → URL-slug, used by both `BaseLayout.astro`'s dropdown and every `/menu/*` page's `getStaticPaths`/links — never hardcode a slug.
- **Favicon + social share image** (2026-07-31): the old `<link rel="icon" href="/favicon.svg">` pointed at a file that didn't exist — the site had no working favicon at all. `public/favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png` are generated (via `sharp`, the same image lib Astro already depends on) by cropping just the "g" mark out of the wordmark logo and compositing it onto a parchment-colored square — the raw logo files in `public/Logos/` are wide wordmarks, unreadable at favicon size. Full OG/Twitter meta tags added too (previously none existed); `public/og-image.jpg` is the full wordmark centered on the same parchment background, 1200×630.
- **Cart vs. WhatsApp-enquiry split** (2026-07-31): "price on request" products never enter the cart — the cart's GST math assumes every line has a real price. `ProductQuickViewModal.astro` and `ProductCard.astro`'s no-modal fallback both check `hasPrice` and, if false, open a direct WhatsApp enquiry for that product instead of adding anything. Button reads "Add to Cart" for priced items, "Enquire on WhatsApp" for unpriced ones (was "Add to Order" for everything, including unpriced items that silently entered the cart with a null price — a real bug, not a naming nitpick).
- Full build plan, scope decisions, and BOS integration roadmap: `../PLAN.md` (one level up, shared with the non-website phases — this is a planning doc, not deployed with the site).
- **Deploy target**: Cloudflare Pages, project `gobble-by-pixie-site`, under the client's own `gobblebypixie@gmail.com` account (not a Linear Ventures account). As of 2026-07-31 the project is **Git-connected** (GitHub `gobble-by-pixie-site/gobble-by-pixie-site`, branch `main`) — any push to `main` triggers a real production rebuild automatically. A manual `wrangler pages deploy dist` (OAuth login, not an API token — token auth hit a reproducible wrangler bug on this project, never root-caused) still works as a fallback but isn't the primary path anymore; don't push design/experimental branches to `main` casually, it's live now.
- **Auto-deploy on Sheet edit** (built 2026-07-31, RETIRED 2026-10-07): a Cloudflare Deploy Hook was wired into `code.gs` (`onProductSheetChange` + `flushPendingDeploy`). Dead twice over now — the Sheet is no longer the source of anything (Console serves catalog/content with a 60s cache, no rebuilds) AND the account system no longer touches Apps Script. Do not revive; if a rebuild hook is ever needed, wire it to Console, not a Sheet. `DEPLOY_HOOK_URL` in `code.gs` (a build-trigger URL, not a data secret) remains in git history alongside the file.
- **Live domain**: https://gobblebypixie.com
- **SEO (fixed 2026-08-30):** custom `src/pages/sitemap.xml.js` — curated static pages + product URLs pulled LIVE from Console (new jars appear without a deploy); @astrojs/sitemap removed (its build output missed every product and listed account/login/preview-sections). `public/robots.txt` carries the `Sitemap:` line (CF's managed content-signals block prepends to it). Organization JSON-LD sitewide in BaseLayout (new `head` slot), Product JSON-LD on `/products/[slug]` (price/availability/image from Console data), `preview-sections` now actually noindex. Verified live: 45 URLs incl. all 37 products. (cutover from Squarespace completed 2026-07-30/31 — DNS migrated to Cloudflare, SSL active, MX/email records preserved).

- **Wishlist (2026-10-07, parity with TCS/Nanoliss).** `src/pages/api/account/wishlist.ts` proxies Console `/api/public/customers/me/wishlist`, resolving SLUG -> UUID against the LIVE catalog first (Console 400s a non-uuid, and cards speak slugs), so an unavailable product gets a real label instead of vanishing. Sign-in is inferred from the `gbp_session` cookie; a 401 means guest, not error. Hearts render unfilled for everyone, then paint from either source — a shopper who saved elsewhere is not left staring at empty hearts. Local key `gbp_wishlist`.
- **Abandoned-cart capture (2026-10-07).** `src/pages/api/cart/save.ts` POSTs the cart to Console's abandoned-cart endpoint once an email is known; fired from `saveAbandonedCart()` on `codEmail` input, signature-deduped + 60s-throttled, and every failure returns `200 {saved:false}` on purpose so a broken save can never block checkout.
- **COD coupon field (2026-10-07).** The COD form takes an optional code and forwards `couponCode` to `orders/create-cod`; Console re-validates and recomputes server-side, so the drawer never decides a discount.

See `README.md` for local dev setup and full file map.

## 2026-09-01 - Cross-tenant leak fix (CRITICAL)

- **Console API env (CRITICAL):** this site's CF Pages dashboard MUST use its
  OWN `CONSOLE_STOREFRONT_API_KEY`:
  `396d9b1deb929b7a635afd26ae21866e62b64e19f48ad8a756f4168df7a2b658` and
  `CONSOLE_API_URL=https://console.linearventures.in`.
- **What happened:** on 2026-09-01 the dashboard had TCS's key, so this site
  rendered TCS products/hero copy/images. The console scopes by key, so a
  wrong key returns the wrong tenant's data (RLS was NOT the cause).
- **Verify after any env edit:** fetch the live site and confirm Gobble
  products/images, not TCS.
- **Revalidation secret:** set `REVALIDATE_SECRET` =
  `f62750bb322621c712be35724324bcfb479e96b5c7bffa7905f917a3e8242bc8` as an
  encrypted secret (matches the console fallback) for instant purge.
- **Edge cache (2026-09-01):** middleware sets `s-maxage=60,
  stale-while-revalidate=30`. The old "Cache HTML 1hr" Cache Rule was deleted
  from this zone 2026-09-01 (it made console edits take 1h to show).
  **A new 60s edge Cache Rule was created 2026-10-24 — see the section
  below**; the "do NOT re-create" warning applied to the 1h-TTL rule, not to
  edge caching with instant purge.

## 2026-10-24 — Edge caching live (60s, instant purge unchanged)

The middleware's `s-maxage=60` header alone never cached anything — Cloudflare
Pages Functions SSR responses stay `cf-cache-status: DYNAMIC` unless a zone
Cache Rule opts them in. The owner added Zone → Cache Rules to the Gobble
Cache-Purge API token (`cfut_r5gy...`, see Vaultwarden) and a Cache Rule was
created via API on the zone's `http_request_cache_settings` ruleset
(`728e37ec598c44e0b98fead991d26bfb`, rule `32f74aebd2824c79a19400db238d2bab`):
`set_cache_settings`, `cache: true`, `edge_ttl`/`browser_ttl` both
`respect_origin`, expression excluding exactly the nine prefixes
`isCacheablePath()` in `src/middleware.ts` excludes (`/cart`, `/checkout`,
`/account`, `/login`, `/signup`, `/search`, `/admin`, `/api`, `/preview`).

Verified live 2026-10-24: `/`, `/shop`, `/about`, `/menu` MISS→HIT; `/cart`,
`/login`, `/api/public/products` stay DYNAMIC; `purge_cache` of the homepage
flipped HIT→MISS→HIT, so Console edits still appear instantly. This is NOT the
old "Cache HTML 1hr" rule (deleted 2026-09-01 because its long Edge TTL delayed
edits) — TTL is `respect_origin`, so it follows the middleware's 60s
`s-maxage` and the purge webhook remains the primary invalidation.

Two standing rules: **a new dynamic path must be added to BOTH
`isCacheablePath()` in `src/middleware.ts` AND the Cache Rule expression**
(keep them in sync), and **keep the middleware body-buffering** — streamed
bodies are never cached. Rollback = delete the rule (instantly reverts to
DYNAMIC; no code change). All four storefronts now carry this rule (Sohini's
is `override_origin` 60s because her site is static with no s-maxage header).

## 2026-11-05 — Announcement banner: Console-only, empty = hidden

The site-top banner joined the estate-wide contract (owner: it is HER
announcements, same as Mane/Nanoliss):

- The hardcoded 🧀/✨ emoji glyphs are GONE — the banner renders
  `fulfillment_platters` / `fulfillment_jars` as plain text (divider only
  when both lines exist), and `filter(Boolean)` means empty on Console
  renders nothing at all.
- The two banner keys were removed from `FALLBACK_CONTENT` in
  `fetchSiteContent.js` — never-configured or Console-down no longer forces
  copy; the seeded values live in Console's home row, not in this repo.
- `bannerSpark` ("" | "on", Console → Home tab → "Announcement sparkle" —
  the field was already on the food-vertical editor) flows through
  `SNAKE_HOME_KEYS`; when "on", a gold spark star + whole-text shimmer
  (Mane's `.banner-shimmer` treatment ported into `--accent-gold`, static
  under reduced-motion) accompany line 1. It is absent from Gobble's home
  row until she first saves the Home tab — before that, plain text only.
- Live text still comes from Console's home row (the 2026-08 seeds:
  "Cheese Platters: Next-Day Dispatch" / "Cream Cheese Jars: Order by Thu
  Midnight, Shipped Sat") — verified rendering after deploy.

## 2026-09-05 - Instant purge live

- **CF_API_TOKEN** (Zone Cache Purge on gobblebypixie.com only) set as an
  encrypted secret + redeployed — signed probe to `/api/revalidate`
  returns `success:true`. Console edits now purge instantly, not in ~60s.
- **Compat is load-bearing:** this repo has no `wrangler.toml`, so Pages runs
  workerd defaults where `process.env`/`Buffer` don't exist and
  `revalidate.ts` 500s on every call (probed 2026-09-05). Fixed
  dashboard-only: Settings → Functions → Compatibility Date `2025-04-01` +
  flag `nodejs_compat` (mirrors nanoliss-store). Do NOT remove these without
  adding a `wrangler.toml` equivalent — any route reading `process.env` at
  module scope breaks silently the same way.

## 2026-09-08 - Console-side additions (no storefront change needed)

- **OAuth scopes** now include pages + Instagram (`instagram_basic`,
  `pages_read_engagement`, … — same app, same approval umbrella as BOS),
  and connects record "Authorized as". Nothing to do here until this
  tenant connects Meta.
- **IG feed guard:** Console's `/api/public/instagram` skips
  system-provisioned WhatsApp rows, so a future WhatsApp provisioning can
  never leak another tenant's feed here. Live feed still needs this
  tenant's own token + Page-linked IG.
- **Console UI only** (no action): new-product images at create,
  Storage folder names, Marketing Overview + ad builder + catalog (all
  read this tenant's own connection when present).
- **Hero per-device fields** (`mobileUrl`, `fit`, `visibleOn`) exist in
  the Console API but this storefront doesn't read them yet — hero
  behavior unchanged. Say the word to wire the TCS treatment here.
- **2026-10-06 — 404 page, custom pages, vision hooks.** `src/pages/404.astro`
  now exists (previously NO 404 anywhere in src). `src/pages/[...slug].astro`
  renders Console-authored custom pages at `/<slug>` (Settings → Content →
  Pages, gated per tenant by the `pages` capability flag): published only,
  `?previewToken=` unlocks drafts with a DRAFT PREVIEW banner, and every
  failure (unknown/malformed slug, Console down) renders the real 404 with
  status 404 — never a soft 404. `sitemap.xml.js` appends published pages
  (fetch failure leaves the sitemap unchanged). `console-client.ts` now
  sends a 10s AbortSignal timeout on its fetches. BaseLayout's livedraft
  listener branches on IMG (patches src, not textContent) and posts
  `{type:"lc-applied", key}` acks; HomeSections hero images and
  custom-page blocks carry `data-lc` hooks for the Console vision panel
  (`sec:<id>:imageUrl` / `page:<i>:<field>`). All listener behavior stays
  inside the `?livedraft=1` guard.
- **Navigate-follow (2026-10-06, commit `af1c97f`).** Same protocol as the
  other storefronts: the Console sends `lc-editable` and the listener
  intercepts ONLY those into `lc-navigate`, so `/menu`, `/events`, `/faq`,
  `/byop`, `/account` and the rest still navigate normally. **Gobble-specific:**
  the product grid is quick-view MODAL buttons rather than links, and
  HomeSections renders an unset section CTA as `href='#'`, so the interceptor
  bails on `button` / `[data-lc]` / hash hrefs. This site has **no `/contact`
  page** (and none in the PAGE map), which matches the Console hiding that tab
  for food tenants — the interception is driven purely by the list the Console
  sends, so the two cannot drift. `lcNormPath` must match the Console's
  `normPath` (`src/lib/vision-paths.ts`). `lc-content-ready` now carries the
  current `path` so the Console can say "no editor for this page" instead of
  going blank.

## 2026-11-06 - Account accordion, dep state, astro security re-land

- **Account order history is a collapsed-by-default `<details>` accordion**
  (estate contract): summary header + items/price-ladder/address/timeline/
  invoice in the body; `escHtml()` on every Console string. The
  `.order-card` chevron CSS lives in global.css (runtime innerHTML — §A12).
- **Deps current**: RESOLVED 2026-11-06 (`8ab2e4c`, deployment `e201234d`
  success), then bumped again 2026-11-11 (`cb9d609`): astro 7.4.10 +
  @astrojs/cloudflare 14.4.7 + wrangler 4.160.0, deployment
  `d62f32ce-281f-4e1f-bc38-a7bf67d543c0`, check-run `completed / success`.
  Gobble's Pages `NODE_VERSION` was already 22.23.4 (API-verified
  2026-11-06, no-op) - the repo pin/lock were what lagged. astro 7.4.7 +
  @astrojs/cloudflare 14.4.6 (patch line over the 7.4.6/14.4.5 security
  pass) re-landed; repo `.node-version`/`engines` bumped to 22.23.4; lock
  gate verified (npm ci --dry-run clean, 26/26 @esbuild variants, audit 0
  after fast-uri 3.1.6→3.1.9 in the dev-only ajv chain). 13/13 smoke green,
  build Complete. **Correction to an earlier note in this file:** wrangler is
  NOT transitive here — it IS a manifest entry (`"wrangler": "^4.116.0"` in
  `devDependencies`, added 2026-07-30 in `01f5e68`), so it can be bumped
  directly. The nested `4.156.1` copy under `@cloudflare/vite-plugin` is the
  transitive one; the root `node_modules/wrangler` is 4.160.0.
- **Announcement banner is live estate-default** (see 2026-11-05 section):
  bannerSpark seeded "on" (`patch-gobble-banner-spark.mjs`), glyphs gone,
  orders page verified.

## 2026-11-06 (late) - Search render fix, COD verified off, cancelled order removed

- **Search results render again** (`fff57a1`, deployment `6190ce2e` success,
  live-verified): the results were innerHTML-injected but their rules
  (`.search-hit*`, `.search-empty`) sat in BaseLayout's SCOPED block — runtime
  nodes carry no `data-astro-cid`, so every rule missed and the panel painted
  an unstyled inline smear with a 0×0 image (§A12 third face). Rules moved to
  `global.css` (tokens are :root-global); scoped block keeps only the
  statically-rendered overlay chrome + a pointer comment. Verified in the
  built CSS (unscoped selectors) and on the live page (getComputedStyle:
  flex / 44px img / weight 600).
- **COD is OFF and cannot silently come back on the order path.** Owner's
  context: the store wasn't ready; a customer called directly and was handled
  on WhatsApp; Pixie turned COD off. End-to-end verified the same day:
  `clients.cod_enabled = f`; `createCodOrder` re-checks the flag inside
  `withTenant` and throws `CodNotAvailableError` → HTTP 501 fail-closed
  (lib/orders.ts); live probe through this site's own
  `/api/checkout/cod` proxy returned **501 "Cash on delivery is not
  available right now."** with no order created; the drawer's "Pay on
  Delivery" button renders only on `codEnabled === true` (failed config
  fetch degrades to WhatsApp-only). The WhatsApp CTA is now the only
  checkout path, as intended.
- **Cancelled order `ORD-MW2G1P4E-6135` removed from the DB** (owner ask;
  the customer was handled directly). Safe path: child-row audit first
  (order_items 3 = CASCADE, inventory_movements 6 with NO FK, notification_log
  12 = SET NULL, returns/loyalty/concierge 0), stock legs proven net-zero
  (sale −1×3 on creation, refund +1×3 on Console cancel; products back at
  10), BEGIN…ROLLBACK probe (6|1), then committed delete + `audit_log`
  row (`ORDER_DELETED_MANUAL`, full details jsonb), read-back 0/0/0 + audit
  1. Console has NO order-delete feature (by design — cancel is the flow);
  one-off DB surgery must repeat this exact protocol if ever needed again.
- Console label fix same day (`16e1d01`, worker ok): FOOD vertical's banner
  fields relabelled "Fulfillment — platters/jars" → "Announcement line 1/2"
  (estate-standard labels; keys unchanged).

## 2026-11-06 (night) - banner hooks: click-to-editable in the Console vision panel

- **The banner is now data-lc-hooked** (`ed7bc14`, deployment `164f2f99`
  success, live-verified): both spans carry
  `data-lc="home:fulfillment_platters/jars"` + `data-lc-empty`, and under
  `?livedraft=1` the strip + BOTH hooks render even when a line is empty
  (published visitors byte-identical) — an unfilled announcement is
  clickable in the vision panel instead of only editable via the Home tab
  form. The listener gained the `.lc-live [data-lc]:empty::before`
  placeholder rule (CSS-generated content — never part of the element text,
  so it can never stream back as the value) with
  `-webkit-text-fill-color:currentColor`, because the banner-shimmer's
  inherited transparent fill would otherwise render the placeholder
  invisible when the spark is on (same one-line fix applied to all six
  listeners estate-wide, mane included).
- Console needed zero changes: `vision-apply-edit.ts` maps any
  `home:<field>` hook generically to the HomeCopyEditor's `home_<field>`
  input, which all four verticals carry since the estate-default change.
- Verified live: published HTML carries the hook for the line that has copy
  (Pixie's line sits in `fulfillment_jars`); `/?livedraft=1` renders BOTH
  hooks including the empty platters one.

## 2026-11-07 — Serviceability gate (estate default): gobble is the live refusal, zero storefront code

Console's serviceability gate landed estate-wide (linear-console `0dd5715` +
`2c11e04` + `ee52d7e`): `priceOrder` refuses destinations outside the
tenant's configured area BEFORE any money math (`NotServiceableError` → 400
with a shopper-verbatim reason). Gobble needed **no storefront change** —
its only checkout is the WhatsApp path, so there is no estimate call or
address form to surface the gate in; any future order path inherits the
enforcement from Console automatically.

**Gobble is the one tenant WITH an active gate config** (owner-approved
seed, 2026-11-07): Delhi-NCR only + no international, per the documented
intent for perishables. Prefixes 11/121/122/123/124/201 (Delhi, Faridabad,
Gurgaon, Sonepat, Rohtak, Ghaziabad/Noida), note "Gobble delivers around
Delhi-NCR only — fresh food doesn't travel well." written into every
refusal. Seed: `linear-console/scripts/seed-gobble-serviceability-2026-11-07.mjs`
(dry-run default), applied via the ssh→pg-mirror route, read-back verified.
Live probes (gobble's key): IN/110001 → serviceable, home rate ₹249;
IN/560001 → refused with the note; US → "We don't ship internationally
right now." Pixie can widen/narrow the area any time in Console → Settings
→ Business → Serviceability (the form writes the same shape the seed did).
Contract: STOREFRONT-STANDARDS §A15.

## Zone security hardening (added 2026-11-07, estate audit — full record: vault §"2026-11-07 — Cloudflare security audit")

gobblebypixie.com zone: SSL full→strict, min TLS 1.0→1.2, Always-HTTPS on, HSTS
enabled (max-age 31536000, includeSubDomains) — verified live. **DNSSEC is
ACTIVE** — the DS was added at Squarespace on 2026-11-07 (key tag 2371, algo
13, SHA-256); never delete it. DMARC was created the same day:
`v=DMARC1; p=quarantine; rua=mailto:support@linearventures.in` (record id
`9a5208f2e3aafa42e5a90e051776eb24`, plus the
`gobblebypixie.com._report._dmarc.linearventures.in` authorization TXT that
makes Google actually deliver the reports). Quarantine is safe here because
Pixie sends from Google Workspace with `google._domainkey` DKIM — if she ever
reports missing legitimate mail, check the rua XML aggregates FIRST before
loosening the policy. Auth rate-limit rule id
`670fdae0ad6d41b3b357d19dca483472` (/api/auth/* 10 req/10s/IP, block 10s —
free-plan shape; /api/auth/session excluded). admin.gobblebypixie.com's Caddy
vhost imports the box's (sec-headers) snippet. Storefront headers/CSP
unchanged — vision panel verified unaffected.

## 2026-11-07 — doc-currency correction: gobble's own cache rule is override_origin too

The sections above describe gobble's rule as created with `respect_origin`
(the 2026-10-24 shape) — superseded 2026-10-26 by the estate-wide error-1102
hardening, measured and recorded in the vault: rule `32f74aeb…` re-PUT
(v3→v4) to `edge_ttl: {mode: "override_origin", default: 300}` +
`serve_stale: {disable_stale_while_updating: false}`. Behavioural proof in the
vault record: `/about` held `cf-cache-status: HIT` at `Age: 122` — past the
origin's 60s. Origin still sends `s-maxage=60`; purge-on-publish still applies;
rollback = the backed-up ruleset JSON
(`…\Temp\opencode\cache-rules-backup\gobblebypixie.com.json`). Also current:
order-notes markers parse ONLY via Console `src/lib/order-notes.ts`
(2026-11-05); STOREFRONT-STANDARDS §A16 sanctions this repo's middleware-set
CSP — no competing `public/_headers` CSP; the zone joined the 2026-11-07
security baseline (DNSSEC Active via the Squarespace DS, DMARC `p=quarantine`
— see its own section below).

## 2026-11-10 — delivery partner block on /account orders (Console DELIVERY.md §8.6, `3d37993` on main)

The order accordion gained the Delivered-by block: **Delivered by {courier} ·
AWB · Track live** (berry link, only when Console returned a trackUrl) plus
the WISMO redirect line — a late-parcel customer calls the COURIER, not the
store; Reorder/invoice/concierge untouched. Fields flow straight from
Console's `/api/public/customers/orders` (no mapping layer in this repo);
they appear when Console books a courier (Shipmozo, Console branch
`delivery/phase1`) or staff type tracking into the Dispatch panel, and are
absent otherwise — untracked orders render byte-identically. Gobble
parchment/berry inline-style tokens. **Verification: live, not inferred** —
`astro build` clean, production `/account` HTML contains "Delivered by"
(inline script), prod 200 post-push.

## 2026-11-10 — nanoliss parity pass (owner: "all tenants should have everything")

`75aefb1` — the full account parity batch, Gobble parchment/berry language:
- **Rewards tab** (was points/tier/progress only): redeem slot (points →
  store credit; Console mints the coupon, the shopper pastes it in the
  checkout credit box), Recent activity ledger (last 10), referral card
  (code, Copy code, Copy invite link, Share on WhatsApp, counts).
- **Referral lifecycle**: `/r/[CODE]` invite page (logged-in →
  `?refPending=`; guest parks `gbp:referralCode` before signup/login) +
  `/api/account/referral-redeem` + the account redeem loop (retries
  pending codes). Console validates/issues; referrer's reward lands with
  their first completed order.
- **Profile**: phone country selector (the FULL calling-code plan - 206
  calling codes covering all 245 ISO countries, generated into
  `src/lib/phone-countries.js`; E.164 assembly - Console derives customer
  country), birthday (feeds the birthday-coupon cron),
  marketing consent, save feedback both ways.
- **Password**: email reset link section (`/api/auth/forgot-password` —
  new proxy; the storefront never takes a current password).
- **PDP**: notify-me on sold-out (guest email → `/api/stock-alert` →
  Console feedback intake, deduped per email+product).
- **Orders**: payment-method row.

New lib helpers in auth-customer.ts (getReferral/redeemReferral/
redeemLoyalty/forgotPassword/stockAlert) — callConsole stays private,
proxies import the helpers like getLoyalty. 13/13 smoke tests. Quiz
deliberately not wired (owner call). NOTE: signup mints referral codes
Console-side since 2026-11-10 (welcome email commit) - shared route, no
per-tenant work.

## 2026-11-10 - The phone country list is the FULL calling-code plan (+ a doubled-country-code bug)

The profile's country selector was a hand-typed list of **17** dial codes.
Console derives a customer's COUNTRY from the calling code of their stored
E.164 phone, so a shopper outside those 17 markets had no country to pick
and their country read "unknown".

- **`src/lib/phone-countries.js` is the mirror** of the Console's table
  (linear-console/src/lib/phone-countries.ts): **206 rows, one per CALLING
  CODE, covering all 245 ISO countries**. A calling code is not a country
  (+1 covers 25 countries, +7 two), so each row carries the primary
  country's flag + name and every ISO code in the group.
- **GENERATED, never hand-typed.** Regenerate with
  `node scripts/gen-phone-countries.cjs --mirror <repo>/src/lib/phone-countries.js`
  from the linear-console repo. The Console's
  `tests/static/phone-countries-parity.test.ts` compares the two files row
  for row; this repo's `tests/smoke/phone-countries.test.mjs` is the local
  half.
- **The page renders the options from the list** (`PHONE_COUNTRIES.map` in
  `src/pages/account.astro`) and the label is `flag + country + dial`
  ("🇮🇳 India +91"). The select widened 7.5rem -> 9.5rem for the longer
  labels.

**THE BUG THIS FOUND: every profile save DOUBLED the country code.** The
input was filled with the whole stored E.164 string (`p-phone`.value =
`customer.phone` -> "+919876543210") while the save handler assembles
`'+' + dial + digits` - so saving a profile to change a NAME rewrote the
phone to "+91919876543210". `fillPhone()` now splits the stored number
into the dial select and the national number in the input (longest-prefix,
and only for an explicit "+" - a bare number carries no country code, so
the whole number stays in the input and the dial keeps its default rather
than guessing one: 98 would read as Iran, 90 as Türkiye). The dial codes
come from the SELECT'S OWN OPTIONS, so there is no second copy of the plan
to fall out of step.

## 2026-11-10 (later) - the SIGNUP form carries the same system, and a pasted number is never doubled

The account profile was fixed first; the SIGNUP form was still a free-text
phone field with the placeholder "+91 98765 43210". Two measured
consequences:

- **The shopper had to KNOW to type the country code.** A bare foreign local
  number ("0501234568" in the UAE) is stored by Console's normaliser as an
  INDIAN number - the exact class of mislabel this whole system exists to
  remove, and the reason the country list exists at all.
- **A pasted full number was DOUBLED on save.** The account's phone field
  holds the NATIONAL number (the dial is in the select), so pasting
  "+91 98765 43210" into it produced "+91" + "919876543210".

Both are fixed by ONE rule, and it is the Console's own ("a value that
already starts with + IS the number; otherwise the picker + the digits make
it"):

- **The signup form now has the same country select** as the account page
  (the generated mirror, `src/lib/phone-countries.js`), and assembles
  `"+" + dial + digits`.
- **Both the signup and the account save** use a value that starts with "+"
  as it is, and assemble the rest from the select.

The old free-text behaviour still works: a shopper who types a full number
still gets exactly that number. 5 smoke tests.

## 2026-11-10 (later) - "Notify me": the ask could not be made, and it never reached Console

Owner: *"Notify me has email only, and it ships asks to console, should we
let people type their numbers also? give them an option?"*

**TWO DEFECTS, both measured:**

**1. THE ASK NEVER REACHED CONSOLE.** The helper posted
`{ type: "back-in-stock" }` while Console's `/api/public/feedback` route only
ever read `body.kind` — so every ask was refused with a **400** and dropped.
**Measured on the live table:** the ONLY `back-in-stock` rows in the database
were **nanoliss's** — the one storefront that sent `kind`. TCS, Gobble and
Mane had produced **zero** rows, ever.

Console now also accepts `type` as a **legacy alias** (so a storefront
deployed later cannot silently lose the feature again), and all four
storefronts send the canonical `kind`.

**2. THE ASK COULD NOT BE MADE AT ALL.** Gobble's product page showed
**"Sold Out"** and nothing else — there was **no notify form**, and the
`/api/stock-alert` route was orphaned code nothing called. The form now
exists on the out-of-stock state: an email **or** a phone (or both).

- the **email** is the universal channel (every tenant has SMTP);
- the **phone** is served over **WhatsApp**, and only where the tenant has a
  WhatsApp connection and the approved `backInStock` template — otherwise
  that channel is skipped and the email still goes.

The phone must be **E.164** (`+919876543210`) — the same rule the customer
country system uses, because a bare number carries no country code and the
store would have to **guess** one. The form assembles it from the country
select (`PHONE_COUNTRIES`) + the national number, and the forgiving rule
applies: **a value that already starts with `+` IS the number.**

6 new smoke tests (`tests/smoke/stock-alert.test.mjs`), mutation-checked
(reverting the helper to `type:` turns the suite red).

## 2026-11-10 (later) - HOVER: this site is NOT affected, and now it cannot become affected

Owner report (on nanoliss.com): "Hover not working - used to work before."

**MEASURED in real Chrome over CDP on the owner's own machine:**
`matchMedia("(hover: hover)").matches` -> **false**,
`matchMedia("(pointer: fine)").matches` -> **false**,
`navigator.maxTouchPoints` -> 10. Chrome reports a **touch-primary pointer**
there, and Tailwind v4 compiles every `hover:` / `group-hover:` utility
inside `@media (hover: hover)` - so on a Tailwind site EVERY hover effect
dies on that machine.

**This site writes plain CSS**, so its `:hover` rules are unconditional and
hover works here - which is exactly why it never showed the symptom. That
was a property of the CSS this repo happens to have, not a guarantee, so
this repo now carries the SAME build guard as the Tailwind v4 sites:

- `scripts/assert-hover-css.mjs` walks the built CSS and fails if a
  **Tailwind hover utility** is gated behind `@media (hover: hover)`; wired
  into `npm run build` (`astro build && node scripts/assert-hover-css.mjs
  dist`), so a regression **cannot ship**.
- It refuses to pass vacuously: no CSS at all, or zero hover rules in the
  output, is a failure.
- Verified by mutation: adding a media-guarded hover rule turns the build
  red (exit 1).
- `tests/smoke/hover.test.mjs` is the fast source-level half (2 tests).

If Tailwind is ever adopted here, the CSS entry must carry
`@custom-variant hover (&:hover);` - the same one-line override the
nanoliss and TCS repos use.

## 2026-11-10 (evening) — the footer box goes Console-driven + the animation selector

- **"First Bites" reads the estate keys:** the footer newsletter box now
  renders `home.newsletterTitle`/`home.newsletterSub` (the same pair every
  storefront takes) with `data-lc` hooks, and renders ONLY when the Console
  has copy — or under `?livedraft=1`, with `data-lc-empty` placeholders. The
  hardcoded "First Bites" / "New flavours…" copy is GONE; those words were
  seeded into the Console as DATA first (linear-console's
  `scripts/patch-newsletter-seeds.mjs`), so nothing changed visually — they
  are just editable now, and clearing them removes the box (the feature).
  `fetchSiteContent`'s allowlist grew the two keys — a key missing there
  would make the box read empty forever with no error anywhere (the new
  smoke test pins it). The submit handler is unchanged.
- **`bannerSpark` is the estate ANIMATION selector:** `""` off | `"on"`
  shimmer (the legacy value, = the original sweep — no data migration) |
  `"pulse"` | `"drift"` | `"marquee"` | `"type"`. The accent star shows
  whenever ANY animation is on; the four new motions live in the scoped
  style (safe here: Gobble is SSR, every rendered element carries Astro's
  scope attribute — same reason the original `.banner-shimmer` lives there)
  and everything goes static under reduced-motion. Guard:
  `tests/smoke/newsletter-banner.test.mjs` (5 tests, mutation-checked).

## 2026-11-10 (late) — the cart drawer carries the free-shipping nudge

- **Free-shipping nudge** (the estate pattern — nanoliss progress bar, mane
  message): the drawer reads `freeShippingThreshold` from Console store-config
  (baked onto #cartDrawer as `data-ship-threshold` — gobble's cart logic is
  the STATIC public/cart.js, which cannot fetch server data, so the SSR
  markup carries the number) and shows "₹X away from free shipping." or
  "✓ Your order ships free." above the summary, on the live GST-inclusive
  total. Unset threshold in Console = no nudge, never a guessed number.
- Guard: `tests/smoke/cart-nudge.test.mjs` (registered in npm test,
  mutation-checked).

## 2026-11-11 — dependency bump (astro 7.4.10 / @astrojs/cloudflare 14.4.7 / wrangler 4.160.0) and the npm lesson

`cb9d609` — lockfile-only, no source change. astro 7.4.7 → **7.4.10**,
`@astrojs/cloudflare` 14.4.6 → **14.4.7**, wrangler → **4.160.0**. The
manifest ranges were NOT touched (`astro: "^7.4.6"`, `@astrojs/cloudflare:
"^14.4.5"`, `wrangler: "^4.116.0"`) — every new version already sat inside
the declared caret range, so this was an in-range bump.

**Verified build:** the `Cloudflare Pages` check-run on `cb9d609` is
`completed / success`, deployment `d62f32ce-281f-4e1f-bc38-a7bf67d543c0`.

### `npm install --package-lock-only` is a NO-OP for an in-range bump

It prints "up to date" and moves NOTHING: npm keeps the locked version
whenever it already satisfies the caret range in `package.json`. The working
verb is:

```
npx -y npm@10 update <pkg> --package-lock-only
```

For a **range change** the order is different — edit `package.json` FIRST,
then regen with `install --package-lock-only`.

### Verify the resolved version in the LOCKFILE, not with `npm ls`

`npm ls` reads `node_modules`, which is stale until you actually install — it
will happily report the OLD version after a successful lockfile regen. Read
the resolved version out of `package-lock.json` instead.

### npm@10 vs npm@11 — the `libc` divergence is real, and the strip is CORRECT

npm 11 writes `"libc": ["glibc"]/["musl"]` onto optional platform packages;
npm@10 strips that field. The npm@10 flavour is what the ARM box needs, so
the strip is CORRECT — the lockfile diff looks alarming and is NOT a
regression. Regenerate with npm@10 (`npx -y npm@10 …`).

### `npm ls --all` "extraneous" wasm packages are pre-existing Windows noise

`npm ls --all` reports "extraneous" wasm packages (`@emnapi/*`,
`@img/sharp-wasm32`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`) on
Windows. These are PRE-EXISTING npm-on-Windows noise, not a defect — prove
it by comparing against HEAD's lockfile, then move on.

### THIS repo's own 2026-10-29 incident — the check-run on the commit IS the verification

**This is the lesson this bump re-learned, and gobble paid for it first.**
On 2026-10-27 an astro bump (`3bb5fa5`, astro 7.4.2 + @astrojs/cloudflare
14.4.2) **built clean locally and FAILED in Cloudflare's Linux builder** —
the check-run on that commit is `completed / failure`, deployment
`3c63f141-53d3-4b74-90b9-3a4e0cd55dc3`. The next push (`cfb9b46`, a
menu/cart fix) inherited the same red lockfile and failed too
(`47088500-43a9-46a0-afc7-8af6135c4682`), as did the empty retrigger
(`6f9d83d`, `89185ffe-110a-4d46-9e64-db995468c465`).

**Because the verification was "does the live page still contain a marker",
the failure went UNNOTICED for a day** — the old site kept serving, and every
marker was still present. It surfaced only when someone looked at the
build: the lock was reverted (`f12c808`, green again — `c9dbf8fa-…`), the
Node pin was blamed and moved to 22.22.0 (`381037c`, red again —
`0d15e81a-…`), and the bump was abandoned (`e95a35d`, green —
`e8844826-…`). Three reds across two Node pins, all read off the check-runs.

**THE RULE, now estate policy: the check-run on the commit IS the
verification** — and for gobble it IS readable via `gh`
(`gh api repos/gobble-by-pixie-site/gobble-by-pixie-site/commits/<sha>/check-runs`).
**A live-site marker is NOT build proof:** the edge can serve the previous
build for minutes after a deploy (`cf-cache-status: HIT` plus an old
`last-modified`), and when the build FAILS the previous build is what keeps
serving — which is exactly why the marker check stayed green through a day
of red builds.
