import { test } from "node:test";
import assert from 'node:assert/strict';
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The cart drawer's free-shipping nudge (estate pattern, 2026-11-10 —
 * nanoliss runs a progress bar, mane a message; Gobble joins with the
 * message form). The drawer reads `freeShippingThreshold` from Console
 * store-config (baked onto #cartDrawer as data-ship-threshold) and tells
 * the shopper how far the live total is from free shipping. Unset
 * threshold = no nudge, never a guessed number.
 *
 * Gobble's cart logic lives in the STATIC public/cart.js (no server data),
 * so the threshold must be baked into the SSR drawer markup and read from
 * the dataset — the static file cannot fetch it itself.
 */

const ROOT = process.cwd();
const layout = readFileSync(join(ROOT, "src/layouts/BaseLayout.astro"), "utf8");
const storeConfig = readFileSync(join(ROOT, "src/lib/store-config.js"), "utf8");

test("the drawer carries the Console free-shipping threshold", () => {
  assert.match(layout, /id="cartDrawer" data-ship-threshold=/, "the threshold must be baked onto the drawer");
  assert.match(
    storeConfig,
    /freeShippingThreshold[\s\S]{0,200}cfg\.freeShippingThreshold > 0/,
    "store-config must resolve the threshold (positive numbers only, else null)",
  );
});

test("the drawer has a nudge slot and the render path fills it", () => {
  assert.match(layout, /id="cartShipNudge"/, "the nudge element must exist");
  assert.match(layout, /away from free shipping\./, "the away-message wording");
  assert.match(layout, /Your order ships free\./, "the unlocked wording");
  // The fill must sit in the priced-cart branch — an unpriced cart has no
  // total to measure against.
  const at = layout.indexOf("away from free shipping");
  const region = layout.slice(layout.lastIndexOf("gstBreakdown()", at), at);
  assert.ok(region.length > 0 && region.length < 3000, "the fill must live with the gst-total render");
  assert.match(region, /gst\.total >= shipThreshold/, "the comparison must use the live total");
});
