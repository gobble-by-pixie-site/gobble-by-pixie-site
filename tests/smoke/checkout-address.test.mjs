import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stateFromPincode, STATES, PIN_PREFIXES } from "../../src/lib/pin-state.ts";

/**
 * PIN → state, and the checkout payload shape.
 *
 * ## Why the state matters at all
 *
 * Console splits GST intra/inter-state from the SHIPPING state:
 * `interState = !!tenant?.homeState && !!shipToState && homeState !== shipToState`.
 * With an empty state that check can never be true, so an out-of-state Gobble
 * customer is invoiced CGST+SGST where IGST was owed — a wrong tax invoice,
 * and the kind of thing an auditor picks up years later. Deriving the state
 * from the PIN is what makes it right without asking a customer to pick a
 * state from a dropdown they have no reason to know.
 *
 * ## The trap this table most easily falls into
 *
 * Prefix matching must test LONGEST first. Goa is `403`, and `40` is
 * Maharashtra; Karnataka is `56`/`57` while `5` is Telangana. A lookup that
 * returns the first row it matches — rather than the most specific — silently
 * invoices a Goa customer as Maharashtra. Every boundary case below exists to
 * pin that down.
 */

test("resolves the state for a PIN in every zone", () => {
  const cases = [
    ["400049", "Maharashtra"], // Mumbai
    ["560001", "Karnataka"], // Bengaluru
    ["403001", "Goa"], // NOT Maharashtra
    ["110001", "Delhi"],
    ["700001", "West Bengal"], // Kolkata
    ["600001", "Tamil Nadu"], // Chennai
    ["380001", "Gujarat"], // Ahmedabad
    ["500001", "Telangana"], // Hyderabad
    ["122002", "Haryana"], // Gurugram
    ["141001", "Punjab"],
    ["682001", "Kerala"], // Kochi
    ["781001", "Assam"], // Guwahati
    ["160001", "Chandigarh"],
    ["201001", "Uttar Pradesh"], // Delhi NCR
    ["462001", "Madhya Pradesh"], // Indore
    ["751001", "Odisha"], // Bhubaneswar
    ["831001", "Jharkhand"],
    ["682001", "Kerala"],
  ];
  for (const [pin, want] of cases) {
    const got = stateFromPincode(pin);
    assert.ok(got, `${pin} should resolve`);
    assert.equal(got.state, want, `${pin} -> ${got.state}, expected ${want}`);
  }
});

test("longest prefix wins, so border states are not swallowed", () => {
  // 403 is Goa; 40 is Maharashtra. 57 is Karnataka; 56 too; 5 is Telangana.
  assert.equal(stateFromPincode("403001")?.state, "Goa");
  assert.equal(stateFromPincode("400049")?.state, "Maharashtra");
  assert.equal(stateFromPincode("560034")?.state, "Karnataka");
  assert.equal(stateFromPincode("500001")?.state, "Telangana");
  // Puducherry 605 must not be read as Tamil Nadu's 605 either — same prefix
  // length collision, so whichever entry survives dedup must be Puducherry.
  assert.equal(stateFromPincode("605001")?.state, "Puducherry");
});

test("returns a GST state code alongside the name", () => {
  assert.equal(stateFromPincode("400049")?.stateCode, "27");
  assert.equal(stateFromPincode("110001")?.stateCode, "07");
  assert.equal(stateFromPincode("380001")?.stateCode, "24");
});

test("malformed input returns null rather than throwing", () => {
  // This runs inside checkout. A thrown error here is a failed order, so every
  // miss is a null and the caller decides what to do.
  //
  // Note "123456" is deliberately NOT in this list: it is a well-formed PIN
  // that simply falls in a real zone (Haryana), so it correctly resolves.
  // Well-formed-but-unknown is what must return null, not well-formed.
  for (const bad of ["", "12345", "abcdef", "999999", "  ", "40a049", "abcdefghij"]) {
    assert.equal(stateFromPincode(bad), null, `${JSON.stringify(bad)} should be null`);
  }
  // A 7+ digit run is not a PIN; taking its first 6 would invent a location.
  assert.equal(stateFromPincode("1234567"), null);
});

test("tolerates the formatting people actually type", () => {
  assert.equal(stateFromPincode("400 049")?.state, "Maharashtra");
  assert.equal(stateFromPincode("400-049")?.state, "Maharashtra");
  assert.equal(stateFromPincode("4000 49")?.state, "Maharashtra");
  // Someone pasting a phone number that contains the PIN must still resolve —
  // concatenating all digits gave 13 and lost the state entirely.
  assert.equal(stateFromPincode("+91 400049 1234")?.state, "Maharashtra");
});

test("the state list is complete enough to correct a wrong derivation", () => {
  // The form shows the derived state in a SELECT precisely because a handful
  // of PIN codes sit near a border. If that list were thin the customer would
  // have no way to fix a bad derivation.
  assert.ok(STATES.length >= 30, `only ${STATES.length} states offered`);
  for (const want of ["Maharashtra", "Goa", "Karnataka", "Delhi", "Gujarat", "Tamil Nadu", "West Bengal"]) {
    assert.ok(STATES.some((s) => s.state === want), `${want} missing from the select`);
  }
  // Every entry needs a code, since that is what Console compares against.
  for (const s of STATES) assert.match(s.code, /^\d{2}$/, `${s.state} has no GST state code`);
});

test("checkout sends the address keys Console actually reads", () => {
  // THE regression this suite exists for. Console's addressLines() reads
  // line1/line2/city/state/pincode/country and nothing else — there is no
  // aliasing anywhere in the codebase. Sending {name, phone, address, pincode}
  // therefore printed the PINCODE ALONE on the invoice and the delivery label,
  // because pincode is the only name both sides agree on. The customer's data
  // was never lost; it was filed under labels nobody reads.
  const cod = readFileSync(new URL("../../src/pages/api/checkout/cod.ts", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.ok(
    cod.includes("line1: address"),
    "cod.ts must map the street to line1 (Console reads line1, never `address`)",
  );
  assert.ok(
    /shippingAddress:\s*\{[^}]*\bstate\b[^}]*\}/.test(cod),
    "cod.ts must send a state inside shippingAddress — it drives intra/inter-state GST",
  );
  assert.ok(cod.includes('country: "IN"'), 'cod.ts must send the ISO code "IN", not "India"');
  assert.ok(
    !/shippingAddress:\s*\{\s*name,/.test(cod),
    "the old {name, phone, address, pincode} shape must be gone",
  );
  // name/phone belong at the top level too, not buried in the address object.
  assert.ok(cod.includes("customerName"), "send customerName — Console's guest find-or-create drops it otherwise");
  assert.ok(cod.includes("customerPhone"), "send customerPhone");
  assert.ok(layout.includes("codCity"), "the COD form needs a city field");
  assert.ok(layout.includes("codState"), "the COD form needs a state field");
});

test("the embedded state table matches the module, so the two cannot drift", () => {
  // BaseLayout.astro's script is a plain module script and cannot import, so
  // the PIN table has to be inlined. A hand-kept second copy of a 262-row table
  // is exactly how a state quietly vanishes from one and not the other — and
  // the failure is invisible, the customer is just asked to pick their own
  // state. This parses the inline block out of the layout and compares it to
  // what the module exports, so editing ZONES without regenerating fails here
  // rather than shipping.
  const layout = readFileSync(new URL("../../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  const statesMatch = layout.match(/const COD_STATES:[^=]*=\s*(\[[\s\S]*?\]);/);
  assert.ok(statesMatch, "COD_STATES block not found in BaseLayout.astro");
  assert.deepEqual(
    JSON.parse(statesMatch[1]),
    STATES,
    "inline COD_STATES differs from src/lib/pin-state.ts — regenerate the embedded block",
  );

  const prefixMatch = layout.match(/const COD_PIN_PREFIX:[^=]*=\s*(\[[\s\S]*?\]);/);
  assert.ok(prefixMatch, "COD_PIN_PREFIX block not found in BaseLayout.astro");
  const inlinePrefixes = JSON.parse(prefixMatch[1]);
  assert.equal(
    inlinePrefixes.length,
    PIN_PREFIXES.length,
    "inline COD_PIN_PREFIX has a different number of prefixes than the module",
  );
  // Compare by prefix -> state name, ignoring key order, so a cosmetic
  // reordering does not fail but a real mapping change does.
  const norm = (rows) =>
    Object.fromEntries(rows.map(([p, v]) => [p, typeof v === "string" ? v : v.state]));
  assert.deepEqual(norm(inlinePrefixes), norm(PIN_PREFIXES), "inline prefix map differs from the module");

  // The sort is load-bearing (403 Goa before 40 Maharashtra), so assert it is
  // present rather than trusting that someone remembered it.
  assert.ok(
    /COD_PIN_PREFIX\.sort\(\(a, b\) => b\[0\]\.length - a\[0\]\.length\)/.test(layout),
    "COD_PIN_PREFIX must be sorted longest-prefix-first",
  );
});

test("the food-specific notes reach Console", () => {
  // A cheese/charcoal-grill store lives or dies on allergy and preparation
  // instructions. Both paths must survive checkout: per-item (the cart line's
  // own note) and order-level.
  const cod = readFileSync(new URL("../../src/pages/api/checkout/cod.ts", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  // Anchor on the PLACEHOLDER, not the word. A first version asserted
  // /Allerg/i over the whole layout and mutation-checked clean even after the
  // placeholder said nothing about allergies — four other lines legitimately
  // mention them, so the check was satisfied by prose rather than by copy the
  // customer actually reads. Same trap as the `if (false)` wrapper: a guard
  // that matches something adjacent is not a guard.
  assert.ok(
    /id="codNote"[\s\S]{0,400}placeholder="[^"]*Allerg/i.test(layout),
    "the note field's PLACEHOLDER must lead with allergies — that is the food case",
  );
  // And the per-item path: `lineNotes` also appears in a type annotation, so
  // assert the value is actually attached to the pushed item.
  assert.ok(
    /orderItems\.push\(\{[^}]*lineNotes: lineNote/.test(cod),
    "the per-item note must be attached to the item that is pushed",
  );
  assert.ok(cod.includes("customerNote"), "order-level note must reach Console as customerNote");
  assert.ok(layout.includes("codNote"), "the COD form needs an order-level note field");
});