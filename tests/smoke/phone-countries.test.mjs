import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PHONE_COUNTRIES, PHONE_COUNTRIES_BY_DIAL, phoneCountryOf } from '../../src/lib/phone-countries.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The phone country list is a MIRROR of the Console's table
 * (linear-console/src/lib/phone-countries.ts). Console derives the
 * customer's country from the dial prefix of the stored E.164 number, so
 * the two sides MUST agree on the calling codes — a storefront that offers
 * a dial code Console cannot resolve means that customer's country
 * silently reads "unknown".
 *
 * The list is generated (see the generator in the Console repo), never
 * hand-typed. These tests are the local half of that contract; the
 * Console's tests/static/phone-countries-parity.test.ts compares the two
 * files row for row.
 */

test('the dial list covers the whole plan', () => {
  assert.equal(PHONE_COUNTRIES.length, 206, 'expected 206 calling codes');
  const dials = PHONE_COUNTRIES.map((c) => c.dial);
  assert.equal(new Set(dials).size, dials.length, 'calling codes must be unique');
});

test('every country is in exactly one group', () => {
  const all = PHONE_COUNTRIES.flatMap((c) => c.codes);
  assert.equal(new Set(all).size, all.length, 'a country must not appear twice');
  assert.equal(all.length, 245, 'expected 245 ISO countries');
});

test('no calling code is a prefix of another (longest-prefix is unambiguous)', () => {
  const dials = PHONE_COUNTRIES.map((c) => c.dial);
  for (const a of dials) {
    for (const b of dials) {
      if (a !== b) assert.ok(!b.startsWith(a), `${b} starts with ${a}`);
    }
  }
});

test('the by-dial view is longest-first', () => {
  const lengths = PHONE_COUNTRIES_BY_DIAL.map((c) => c.dial.length);
  assert.deepEqual(lengths, [...lengths].sort((a, b) => b - a));
});

test('every row carries the flag of its lead country', () => {
  const flagOf = (iso) =>
    [...iso.toUpperCase()].map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('');
  for (const c of PHONE_COUNTRIES) {
    assert.equal(c.flag, flagOf(c.codes[0]), `wrong flag for +${c.dial}`);
    assert.ok(c.name.length > 0);
    assert.ok(c.shortName.length > 0);
  }
});

test('the country is read from an E.164 number only', () => {
  assert.equal(phoneCountryOf('+919876543210')?.code, 'IN');
  assert.equal(phoneCountryOf('+97150123456')?.code, 'AE');
  assert.equal(phoneCountryOf('+97312345678')?.code, 'BH');
  assert.equal(phoneCountryOf('+12025550123')?.code, 'US/CA');
  // A bare number carries no country code, so it must not be guessed.
  assert.equal(phoneCountryOf('9871907801'), null);
  assert.equal(phoneCountryOf('97150123456'), null);
  assert.equal(phoneCountryOf(''), null);
  assert.equal(phoneCountryOf(null), null);
});

test('the account page renders the selector from the list, not a hand-typed one', () => {
  const page = readFileSync(join(ROOT, 'src', 'pages', 'account.astro'), 'utf8');
  assert.match(page, /PHONE_COUNTRIES\.map\(/, 'the selector must be rendered from the list');
  assert.match(page, /from '\.\.\/lib\/phone-countries\.js'/, 'the list must be imported');
  assert.ok(
    !/<option value="\d+"/.test(page),
    'the page must not carry a hand-typed <option> list — that is how the list drifts',
  );
});

test('the phone input holds the NATIONAL number, never the whole E.164 one', () => {
  const page = readFileSync(join(ROOT, 'src', 'pages', 'account.astro'), 'utf8');
  // The save handler assembles '+' + dial + digits, so filling the input
  // with the stored E.164 string doubled the country code on every save.
  assert.ok(
    !/getElementById\('p-phone'\)\.value = customer\.phone/.test(page),
    'the input must be filled by splitting the stored number, not by dumping it',
  );
  assert.match(page, /function fillPhone\(/, 'the split helper must exist');
  assert.match(page, /raw\.indexOf\('\+'\) !== 0/, 'a bare number must not be split');
});
