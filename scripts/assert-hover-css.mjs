// GUARD: no TAILWIND hover utility may be gated behind `@media (hover: hover)`.
//
// WHY (owner report 2026-11-10: "hover not working")
//
// Tailwind v4 compiles every `hover:` / `group-hover:` utility inside
// `@media (hover: hover)`. On the owner's own machine Chrome reports a
// touch-primary pointer — measured over CDP on 2026-11-10:
//     matchMedia("(hover: hover)").matches  -> false
//     matchMedia("(pointer: fine)").matches -> false
//     navigator.maxTouchPoints               -> 10
// so the media query never matches and every hover effect on the site is
// dead: the nav dropdowns, the link/button hovers, the card zoom.
//
// The fix is Tailwind's own documented escape hatch, in the CSS entry:
//     @custom-variant hover (&:hover);
//
// WHAT THIS GUARD CHECKS — and why it is precise
//
// A hand-written rule may legitimately be wrapped in a hover media query.
// The real example: a product card's quick-add button is HIDDEN by default
// and REVEALED on hover, so the author wraps the reveal in
// `@media (hover:hover) and (pointer:fine)` — and gives the button a
// visible default for devices that cannot hover. That is CORRECT, and this
// guard must not flag it.
//
// The defect is specifically a TAILWIND UTILITY being gated. Tailwind
// escapes the colon in a utility class name (`hover\:underline`,
// `group-hover\:block`), so a gated Tailwind rule always carries a
// backslash-escaped `:` or `/` inside the media block. A hand-written rule
// never does. So the guard looks INSIDE each hover media block for an
// escaped utility name, and only then fails.
//
// This script checks the BUILT ARTIFACT, not the source, because the source
// can look perfect while the build still emits the guard (the override
// lives in one file; a second Tailwind entry would re-introduce it). It
// runs as part of `npm run build`, so a regression cannot ship.
//
// usage: node scripts/assert-hover-css.mjs [distDir]   (default: dist)
import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.argv[2] ?? "dist";

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (extname(e.name) === ".css") out.push(full);
  }
  return out;
}

const files = walk(root);
if (files.length === 0) {
  console.error(`FAIL  no CSS found under ${root} - the build produced no stylesheet, so this guard would pass vacuously.`);
  process.exit(1);
}

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

// A Tailwind utility class name in a selector carries an escaped colon
// (`hover\:underline`) or an escaped slash (`group-hover\/item`).
const TAILWIND_UTILITY = /\\[:\/]/;

let gated = [];
let handWritten = 0;
let hoverRules = 0;

for (const f of files) {
  const css = readFileSync(f, "utf8");
  hoverRules += (css.match(/group-hover|\\:hover|:hover/g) || []).length;
  for (const body of hoverMediaBlocks(css)) {
    if (TAILWIND_UTILITY.test(body)) {
      gated.push(`${f}\n      ${body.slice(0, 220).replace(/\s+/g, " ")}...`);
    } else {
      handWritten++;
    }
  }
}

if (gated.length > 0) {
  console.error("FAIL  a Tailwind hover utility is gated behind `@media (hover: hover)`.");
  console.error("      On a touch-primary pointer (Chrome reports hover:none) every hover effect dies:");
  console.error("      nav dropdowns, link/button hovers, card zoom. This was the owner's 2026-11-10 report.");
  for (const g of gated) console.error(`      ${g}`);
  console.error("      Fix: if this site uses Tailwind v4, add `@custom-variant hover (&:hover);` to the CSS");
  console.error("           entry that imports tailwindcss. If the rule is hand-written, drop the media");
  console.error("           wrapper from it.");
  process.exit(1);
}

if (hoverRules === 0) {
  console.error("FAIL  no hover rules at all in the built CSS - the guard cannot tell 'no hover styles' from 'hover styles that never apply'.");
  process.exit(1);
}

const note = handWritten > 0 ? `, ${handWritten} hand-written hover-media rule(s) left alone (allowed)` : "";
console.log(`ok    ${files.length} CSS file(s), ${hoverRules} hover rule(s), no gated Tailwind hover utility${note}.`);
