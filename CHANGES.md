# Gobble by Pixie Storefront — Change Log

## [2026-07-30] — Design, UX & Mobile Review Pass

### Summary of Audit & Findings
Conducted a thorough visual, UX, and feature review pass across all 8 storefront pages (`/`, `/menu`, `/byop`, `/about`, `/faq`, `/account`, `/login`, `/signup`) and menu categories/special panels.

---

### 1. Menu Navigation & Catalog UX (`src/pages/menu.astro`)
- **What Changed**:
  - Added real-time instant search input (`#menuSearch`) filtering items by name, category, or subcategory.
  - Added dietary filter pills (`All Dietary`, `🌱 100% Vegetarian`, `✨ Gluten-Free`, `🥑 Keto-Friendly`).
  - Added dynamic subcategory filter pills (`#subcatBar`) for categories with subcategories (Platters: Picnic, Boat, Box, Party, Wooden Platters; Cheese Art: Sizes, Add-ons, Platter).
  - Added active matching item counter (`#resultsCount`) and empty search state (`#noResultsState`) with a "Reset Search & Filters" button.
- **Why**: Navigating 37 catalog items across 7 main categories was cumbersome. Real-time search, subcategory pills, and dietary filters allow customers to quickly discover specific items (e.g. "Truffle", "Boat Platter") without scrolling endlessly.

---

### 2. Food Ordering Feature: Product Quick View Modal (`src/pages/menu.astro`, `src/components/ProductCard.astro`)
- **What Changed**:
  - Added `data-*` attributes (`data-id`, `data-name`, `data-category`, `data-subcategory`, `data-price`, `data-weight`, `data-desc`, `data-image`, `data-fulfillment`, `data-dietary`) to `ProductCard.astro`.
  - Added an interactive **Product Quick View Modal** (`#productModalBackdrop`) on `menu.astro`. Clicking any product card or its "Quick View / Order" button opens a detailed modal with item description, photo or "Photo coming soon" badge, dietary pills, and a direct "Order via WhatsApp" button pre-filling the exact item.
- **Why**: Provides a standard food e-commerce experience without requiring a complex backend. Customers can inspect product details and initiate a WhatsApp order directly for that specific SKU.

---

### 3. Mobile (375px) Mascot Collision & Layering Fix (`src/layouts/BaseLayout.astro`)
- **What Changed**:
  - Added `body:has(.mobile-sticky-bar) .wa-fab { bottom: 5rem; }` for mobile viewports (`max-width: 720px`).
- **Why**: On mobile viewports (375px), the floating WhatsApp mascot (`.wa-fab` at `bottom: 1rem`) overlapped the right side of the floating sticky bar on `byop.astro`, obscuring the "Order Board" CTA button. Shifting the mascot up when a sticky bottom bar is present ensures zero visual collision and unobstructed access to both CTAs.

---

### 4. Color Palette & Visual Coherence (`src/styles/global.css`, `src/layouts/BaseLayout.astro`)
- **What Changed**:
  - Rebalanced multi-hue palette tokens (`--accent-gold: #E89D17`, `--accent-coral: #E8573D`, `--accent-berry: #B82E3E`, `--accent-teal: #1B8A85`, `--tag-sage: #4C7A1F`) and added warm ambient radial background gradients (`rgba(253, 241, 214, 0.5)`).
  - Maintained all original Instagram-sampled base tokens while adding subtle focus rings, luxury glassmorphism borders (`--border-hairline`), and text gradient utilities (`.text-gradient`, `.text-gradient-gold`).
  - Added active page indicator lines (`.main-nav a.active::after`) and styled hamburger drawer navigation.
- **Why**: Enhances visual cohesion and depth across pages, elevating the boutique brand feel while preserving the client's authentic Instagram-sampled color scheme.

---

### 5. Special Panels & WhatsApp Message Verification (`src/pages/menu.astro`)
- **What Changed**:
  - Verified form submission listeners for "Suggest a Flavour" (Jars), "Customize Your Flavour" (Butter Candles), and "Grazing Tables for Parties" enquiry cards.
- **Why**: Ensured all special panels generate clear, properly formatted WhatsApp text parameters without breaking navigation or page state.

---

## Verification & Build Log
- **Local Dev Server**: Verified on `http://localhost:3005`.
- **Static Build**: Ran `npm run build`:
  - `✓ Completed in 3.83s. 8 page(s) built cleanly into dist/`
  - Zero syntax errors, zero broken imports, zero build warnings.
