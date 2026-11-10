import { test } from "node:test";
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Hover must work on the owner's machine.
 *
 * MEASURED over CDP in real Chrome on the owner's box (2026-11-10):
 *   matchMedia("(hover: hover)").matches  -> false
 *   matchMedia("(pointer: fine)").matches -> false
 *   navigator.maxTouchPoints               -> 10
 *
 * Chrome reports a touch-primary pointer there. Tailwind v4 compiles every
 * `hover:` / `group-hover:` utility inside `@media (hover: hover)` - the v4
 * upgrade guide says so outright - so on such a device EVERY hover effect
 * on a Tailwind site dies. This site is currently plain CSS (its `:hover`
 * rules are unconditional, so it is NOT affected today), but that is a
 * property of the CSS it happens to have, not a guarantee.
 *
 * So this repo carries the SAME build guard as the two Tailwind v4 sites:
 * if Tailwind is ever adopted here, or a hand-written rule is wrapped in
 * the media query, the build fails instead of the site quietly losing its
 * hover.
 *
 * `scripts/assert-hover-css.mjs` checks the BUILT artifact and is wired
 * into `npm run build`.
 */

const ROOT = process.cwd();

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (extname(e.name) === ".css") out.push(full);
  }
  return out;
}

test('no stylesheet gates hover behind the media query', () => {
  for (const f of walk(join(ROOT, 'src'))) {
    const css = readFileSync(f, 'utf8');
    // Strip comments first: prose that quotes the media query is not a rule.
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(
      !/@media\s*\(\s*hover\s*:\s*hover\s*\)/.test(code),
      `${f} gates hover behind @media (hover: hover) - hover dies on a touch-primary pointer`,
    );
  }
});

test('the build guard exists and is wired into the build script', () => {
  const script = readFileSync(join(ROOT, 'scripts', 'assert-hover-css.mjs'), 'utf8');
  assert.match(script, /hover\s*:\s*hover/, 'the guard must look for the media guard');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.match(
    pkg.scripts.build,
    /assert-hover-css/,
    'the guard must run as part of the build, or a regression can ship',
  );
});
