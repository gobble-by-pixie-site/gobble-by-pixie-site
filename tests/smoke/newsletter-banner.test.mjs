import { test } from "node:test";
import assert from 'node:assert/strict';
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The footer newsletter box's Console contract, and the announcement
 * animation selector.
 *
 * NEWSLETTER (estate contract, 2026-11-10 — owner: "when they are empty no
 * box rendered, no fallback"): the "First Bites" footer box reads the ESTATE
 * keys (home.newsletterTitle / home.newsletterSub), renders ONLY when the
 * Console has copy (or under ?livedraft=1, with data-lc-empty placeholders,
 * so the vision panel can click-to-edit an empty field), and carries NO
 * hardcoded copy — the words that were hardcoded here were seeded into the
 * Console as data before this shipped. fetchSiteContent must PASS the keys
 * through: its Console merge is allowlisted.
 *
 * ANIMATION (owner: "add more animations in the selector"): the banner's
 * bannerSpark value maps to a text-animation class — "" nothing, "on" the
 * original shimmer (legacy value, unchanged), "pulse" / "drift" /
 * "marquee" / "type" the newer motions — and the accent star shows whenever
 * ANY animation is on. The CSS lives in BaseLayout's scoped style (safe
 * here: Gobble is SSR, so every rendered element carries Astro's scope
 * attribute) and collapses to static text under prefers-reduced-motion.
 */

const ROOT = process.cwd();
const layout = readFileSync(join(ROOT, "src/layouts/BaseLayout.astro"), "utf8");
const fetcher = readFileSync(join(ROOT, "src/lib/fetchSiteContent.js"), "utf8");

test("the footer box reads the estate newsletter keys", () => {
  assert.match(layout, /data-lc="home:newsletterTitle"/, "the box must hook the estate title key");
  assert.match(layout, /data-lc="home:newsletterSub"/, "the box must hook the estate sub key");
});

test("the box carries NO hardcoded copy and renders only when copy exists", () => {
  assert.doesNotMatch(layout, />First Bites</, "the hardcoded heading must be gone (it lives in the Console now)");
  assert.doesNotMatch(layout, /New flavours, seasonal platters/, "the hardcoded note must be gone");
  assert.match(
    layout,
    /\{\(content\.newsletterTitle \|\| content\.newsletterSub \|\| isLivedraft\) && \(/,
    "the box must render only when the Console has copy (or under livedraft)",
  );
  assert.match(layout, /data-lc-empty="Newsletter heading"/, "livedraft placeholder for the heading");
  assert.match(layout, /data-lc-empty="Newsletter note"/, "livedraft placeholder for the note");
});

test("fetchSiteContent passes the newsletter keys through", () => {
  // The Console merge is allowlisted — a key missing from SNAKE_HOME_KEYS
  // would make the box read empty forever, with no error anywhere.
  assert.match(fetcher, /'newsletterTitle', 'newsletterSub'/, "the keys must be in the allowlist");
});

test("the banner maps every animation value to a class", () => {
  assert.match(layout, /content\.bannerSpark === 'on' \? 'banner-shimmer'/);
  assert.match(layout, /content\.bannerSpark === 'pulse' \? 'banner-pulse'/);
  assert.match(layout, /content\.bannerSpark === 'drift' \? 'banner-drift'/);
  assert.match(layout, /content\.bannerSpark === 'marquee' \? 'banner-marquee'/);
  assert.match(layout, /content\.bannerSpark === 'type' \? 'banner-type'/);
  assert.match(layout, /const bannerSparkOn = \(content\.bannerSpark \?\? ''\) !== ''/, "the accent star shows for ANY animation");
});

test("every animation exists in the scoped style and goes static under reduced motion", () => {
  for (const name of ["banner-pulse", "banner-drift", "banner-marquee", "banner-type"]) {
    assert.match(layout, new RegExp(`\\.${name}\\s*\\{`), `.${name} must have its rule`);
  }
  for (const kf of ["bannerPulse", "bannerDrift", "bannerMarquee", "bannerType"]) {
    assert.match(layout, new RegExp(`@keyframes ${kf}\\s*\\{`), `${kf} keyframes must exist`);
  }
  assert.match(
    layout,
    /\.banner-pulse, \.banner-drift, \.banner-marquee, \.banner-type \{\s*\n\s*animation: none;/,
    "reduced-motion must collapse all four to static text",
  );
});
