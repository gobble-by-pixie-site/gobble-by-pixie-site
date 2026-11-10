import { test } from "node:test";
import assert from 'node:assert/strict';
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PHONE_COUNTRIES, phoneCountryOf } from '../../src/lib/phone-countries.js';

/**
 * The SIGNUP form carries the same phone system as the account page, and a
 * pasted full number is never doubled.
 *
 * Before this, the signup phone was a free-text field with the placeholder
 * "+91 98765 43210" — the shopper had to KNOW to type the country code, and
 * a bare foreign local number ("0501234568" in the UAE) was stored by
 * Console's normaliser as an INDIAN number: the exact class of mislabel the
 * country system exists to remove.
 *
 * And a shopper who PASTED a full number into the account's phone field
 * ("+91 98765 43210" into a field that holds the national number) got the
 * country code DOUBLED: "+91" + "919876543210". The rule — the Console's
 * own — is: "a value that already starts with + IS the number; otherwise
 * the picker + the digits make it".
 */

const ROOT = process.cwd();

test('the mirror is the whole calling-code plan', () => {
  assert.equal(PHONE_COUNTRIES.length, 206, 'expected 206 calling codes');
  const all = PHONE_COUNTRIES.flatMap((c) => c.codes);
  assert.equal(new Set(all).size, 245, 'expected 245 ISO countries');
  const byDial = new Map();
  for (const c of PHONE_COUNTRIES) byDial.set(c.dial, (byDial.get(c.dial) ?? 0) + 1);
  assert.equal(byDial.size, PHONE_COUNTRIES.length, 'one row per calling code');
});

test('the signup form carries the same country system', () => {
  const page = readFileSync(join(ROOT, 'src', 'pages', 'signup.astro'), 'utf8');
  assert.match(page, /id="su-phone-country"/, 'the signup must have a country select');
  assert.match(page, /PHONE_COUNTRIES\.map\(/, 'the select must be rendered from the list');
  assert.match(page, /from '\.\.\/lib\/phone-countries\.js'/, 'the list must be imported');
  assert.ok(
    !/<option value="\d+"/.test(page),
    'the signup must not carry a hand-typed option list',
  );
});

test('the signup assembles +<dial><national> and never doubles a pasted number', () => {
  const page = readFileSync(join(ROOT, 'src', 'pages', 'signup.astro'), 'utf8');
  assert.match(page, /su-phone-country'\)\?\.value/, 'the dial must be read from the select');
  assert.match(page, /digits \? '\+' \+ dial \+ digits : ''/, 'the number must be assembled from dial + digits');
  assert.match(
    page,
    /rawPhone\.charAt\(0\) === '\+'/,
    'a value that already starts with + must be used as it is',
  );
});

test('the account save uses a pasted full number as it is', () => {
  const page = readFileSync(join(ROOT, 'src', 'pages', 'account.astro'), 'utf8');
  assert.match(
    page,
    /rawPhone\.charAt\(0\) === '\+'/,
    'a pasted full E.164 number must be used as it is, not have the country code added again',
  );
});

test('the country is read from an E.164 number only', () => {
  assert.equal(phoneCountryOf('9876543210'), null);
  assert.equal(phoneCountryOf('+919876543210')?.code, 'IN');
  assert.equal(phoneCountryOf('+97150123456')?.code, 'AE');
});
