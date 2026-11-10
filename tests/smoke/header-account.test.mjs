import { test } from "node:test";
import assert from 'node:assert/strict';
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The header account menu.
 *
 * Nanoliss has had the signed-in header menu since its header was built, and
 * TCS grew one in 2026-11-10 ("doesn't give My account and signout menu,
 * like nanoliss"). Gobble's header was the remaining storefront where the
 * account icon was a bare link to /account with NO menu - sign-out lived
 * only on the /account page. Same shape here now: the icon is the trigger,
 * a click opens the panel (My Account / Sign Out), a click outside or
 * Escape closes it, and a SIGNED-OUT visitor keeps the plain link, so the
 * panel is never a dead end.
 *
 * The identity probe is /api/account/profile - the SAME endpoint the account
 * page gates on (401 = gate). The session cookie is httpOnly, so Sign Out
 * must POST the real server route; no client-side call can end the session
 * by itself.
 *
 * The assertions are scoped to MARKUP and to the dropdown's own script
 * region - this layout is large and full of prose, so a file-wide regex
 * could pass on a comment mention. No comment-stripping: a stripper on a
 * file this size is how TCS's first version of this guard "proved" a
 * dropdown absent that was there.
 */

const ROOT = process.cwd();
const layout = readFileSync(join(ROOT, "src/layouts/BaseLayout.astro"), "utf8");

// The dropdown's own script region, from its unique comment onward.
const script = layout.slice(layout.indexOf("Account dropdown (signed-in only)"));

test("the header account has a dropdown panel", () => {
  assert.match(layout, /id="acct-dropdown-wrap"/, "the panel needs a positioned wrapper");
  // (?!-) skips the WRAP: "acct-dropdown" is a substring of
  // "acct-dropdown-wrap", and indexOf alone finds the wrapper first.
  const at = layout.search(/id="acct-dropdown"(?!-)/);
  assert.ok(at > 0, "the header needs a dropdown panel");
  // Scoped to the panel's own markup, so prose elsewhere cannot satisfy it.
  const panel = layout.slice(at, at + 700);
  assert.match(panel, />My Account</, "the panel must offer My Account");
  assert.match(panel, />Sign Out</, "the panel must offer Sign Out");
});

test("the panel is hidden until it is opened", () => {
  // Gobble hides the panel in CSS, not with a class on the tag.
  assert.match(layout, /\.acct-dropdown\s*\{[^}]*display:\s*none/, "the panel must start hidden");
  assert.match(layout, /\.acct-dropdown\.open\s*\{[^}]*display:\s*block/, "only .open may show it");
  const at = layout.search(/id="acct-dropdown"(?!-)/);
  const tag = layout.slice(layout.lastIndexOf("<div", at), layout.indexOf(">", at));
  assert.doesNotMatch(tag, /class="[^"]*\bopen\b/, "the panel tag must not carry .open in the static markup");
});

test("the dropdown opens on a click only when signed in", () => {
  assert.match(
    script,
    /getAttribute\('data-logged-in'\) !== 'true'\) return;/,
    "a signed-out visitor must keep the plain link to /account",
  );
  assert.match(script, /dd\.classList\.toggle\(['"]open['"]\)/, "a click must toggle the panel");
  assert.match(script, /!wrap\.contains\(e\.target\)/, "a click outside must close the panel");
  assert.match(script, /e\.key === 'Escape'/, "Escape must close the panel");
});

test("the identity probe flips the trigger to a dropdown", () => {
  assert.match(script, /fetch\('\/api\/account\/profile'/, "the probe is the endpoint the account page gates on");
  assert.match(script, /d\.customer\)/, "gate on the customer, not just a 200");
  assert.match(script, /setAttribute\('data-logged-in', 'true'\)/, "a signed-in probe must arm the trigger");
});

test("Sign Out calls the real logout endpoint", () => {
  assert.match(
    script,
    /fetch\('\/api\/auth\/logout', \{ method: 'POST' \}\)/,
    "the session cookie is httpOnly - only the server can end the session",
  );
});
