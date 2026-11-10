import { test } from "node:test";
import assert from 'node:assert/strict';
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The "Notify me" ask must REACH Console, and it may carry a phone.
 *
 * TWO DEFECTS, both measured (owner, 2026-11-10):
 *
 *  1. THE ASK NEVER REACHED CONSOLE. This storefront posted
 *     `{ type: "back-in-stock" }` while Console's route only ever read
 *     `kind` - so every notify click was refused with a 400 and the ask was
 *     dropped. Measured on the live table: the only back-in-stock rows were
 *     nanoliss's, the one storefront that sent `kind`. Console now also
 *     accepts `type` as a legacy alias, but the canonical key is `kind`.
 *
 *  2. THE ASK COULD NOT BE MADE AT ALL. Gobble's product page showed
 *     "Sold Out" and nothing else - there was no notify form, and the
 *     `/api/stock-alert` route was orphaned code nothing called.
 *
 * The owner asked: "Notify me has email only, and it ships asks to console,
 * should we let people type their numbers also? give them an option?" So the
 * form takes an email OR a phone, and the phone is served over WhatsApp
 * where the store can send one.
 *
 * The phone must be E.164 ("+919876543210") - the same rule the customer
 * country system uses: a bare number carries no country code, so accepting
 * one would mean guessing a country.
 */

const ROOT = process.cwd();

/**
 * Strip comments so an explanatory JSDoc (which quotes the old `type:`
 * payload on purpose) cannot satisfy - or break - a structural assertion.
 */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("the helper sends kind (the key Console reads), not type", () => {
  const src = code(readFileSync(join(ROOT, "src/lib/auth-customer.ts"), "utf8"));
  assert.match(src, /kind:\s*"back-in-stock"/, "the helper must send the canonical `kind` key");
  assert.ok(
    !/type:\s*"back-in-stock"/.test(src),
    "`type` is the legacy alias that never reached Console - do not send it",
  );
});

test("the helper forwards the phone in the context", () => {
  const src = code(readFileSync(join(ROOT, "src/lib/auth-customer.ts"), "utf8"));
  assert.match(src, /context:\s*phone\s*\?\s*\{\s*productId,\s*phone\s*\}\s*:\s*\{\s*productId\s*\}/);
});

test("the route accepts an email OR a phone, and validates the phone as E.164", () => {
  const src = readFileSync(join(ROOT, "src/pages/api/stock-alert.ts"), "utf8");
  assert.match(src, /if \(!emailOk && !phoneOk\)/, "a request with neither contact must be refused");
  assert.match(src, /\^\\\+\[1-9\]\\d\{6,14\}\$/, "the phone must be validated as E.164");
});

test("the product page has a notify form with a country select", () => {
  const page = readFileSync(join(ROOT, "src/pages/products/[slug].astro"), "utf8");
  assert.match(page, /class="notify-form"/, "the sold-out state needs a notify form");
  assert.match(page, /id="nf-dial"/, "the form needs a country select");
  assert.match(page, /PHONE_COUNTRIES\.map\(/, "the select must be rendered from the generated list");
  assert.match(page, /id="nf-phone"/, "the form needs a phone input");
  assert.ok(!/<option value="\d+"/.test(page), "the form must not carry a hand-typed option list");
});

test("the form assembles +<dial><national> and never doubles a pasted number", () => {
  const page = readFileSync(join(ROOT, "src/pages/products/[slug].astro"), "utf8");
  assert.match(
    page,
    /rawPhone\.charAt\(0\) === ['"]\+['"]/,
    "a value that already starts with + must be used as it is",
  );
  assert.match(
    page,
    /dg \? ['"]\+['"] \+ dial \+ dg : ['"]['"]/,
    "the number must be assembled from dial + digits",
  );
});

test("the form refuses an empty pair rather than pretending it worked", () => {
  const page = readFileSync(join(ROOT, "src/pages/products/[slug].astro"), "utf8");
  assert.match(page, /if \(!email && !phone\)/, "an empty pair must be refused with a message");
});
