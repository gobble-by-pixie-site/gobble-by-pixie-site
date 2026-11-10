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
 * Chrome reports a touch-primary pointer there, and Tailwind v4 compiles
 * every `hover:` / `group-hover:` utility inside `@media (hover: hover)` -
 * so on a Tailwind site EVERY hover effect dies: the nav dropdowns, the
 * link/button hovers, the card zoom. That was the owner's report.
 *
 * PROVEN CAUSAL (same browser, two runs, a real mouse move): injecting the
 * identical rule WITHOUT the media guard opened the nav panel.
 *
 * The fix is Tailwind's own documented escape hatch, in the CSS entry:
 *   @custom-variant hover (&:hover);
 *
 * `scripts/assert-hover-css.mjs` checks the BUILT artifact and is wired
 * into `npm run build`, so the regression cannot ship. These tests are the
 * fast source-level half.
 *
 * NOTE the precision: a HAND-WRITTEN rule may legitimately sit inside a
 * hover media query - e.g. a product card's quick-add button is hidden by
 * default and revealed on hover, so the author wraps the reveal in
 * `@media (hover:hover) and (pointer:fine)` and gives the button a visible
 * default for devices that cannot hover. That is CORRECT and is not flagged.
 * The defect is specifically a TAILWIND UTILITY being gated, and Tailwind
 * escapes the colon in a utility class name (`hover\:underline`), so a gated
 * Tailwind rule always carries a backslash-escaped `:` or `/`.
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

// A Tailwind utility class name in a selector carries an escaped colon
// (`hover\:underline`) or an escaped slash (`group-hover\/item`).
const TAILWIND_UTILITY = /\\[:\/]/;

// Every `@media (...hover: hover...)` block, with its body, brace-matched.
function hoverMediaBlocks(css) {
  const blocks = [];
  const re = /@media\s*\([^)]*hover\s*:\s*hover[^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    blocks.push(css.slice(start, i - 1));
  }
  return blocks;
}

test('the tailwind CSS entry restores hover', () => {
  const cssFiles = walk(join(ROOT, 'src'));
  const entries = cssFiles.filter((f) => /@import\s+["']tailwindcss["']/.test(readFileSync(f, 'utf8')));
  if (entries.length === 0) {
    // No Tailwind here (plain CSS): hover works by construction, and the
    // build guard keeps it that way if Tailwind is ever adopted.
    return;
  }
  assert.equal(entries.length, 1, `expected one tailwind CSS entry, found ${entries.length}: ${entries.join(', ')}`);
  const src = readFileSync(entries[0], 'utf8');
  assert.match(
    src,
    /@custom-variant hover \(&:hover\);/,
    "the tailwind entry must restore the v3 hover behaviour - Tailwind v4 gates it behind @media (hover: hover), which never matches on the owner's touch-primary pointer",
  );
});

test('no stylesheet gates a Tailwind hover utility behind the media query', () => {
  for (const f of walk(join(ROOT, 'src'))) {
    const css = readFileSync(f, 'utf8');
    // Strip comments first: prose that quotes the media query is not a rule.
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const body of hoverMediaBlocks(code)) {
      assert.ok(
        !TAILWIND_UTILITY.test(body),
        `${f} gates a Tailwind hover utility behind @media (hover: hover) - hover dies on a touch-primary pointer`,
      );
    }
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
