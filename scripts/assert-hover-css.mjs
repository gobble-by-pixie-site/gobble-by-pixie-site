// GUARD: the built CSS must not gate hover behind `@media (hover: hover)`.
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
// This script checks the BUILT ARTIFACT, not the source, because the source
// can look perfect while the build still emits the guard (the override
// lives in one file; a second Tailwind entry would re-introduce it). It
// runs as part of `npm run build`, so a regression cannot ship.
//
// usage: node scripts/assert-hover-css.mjs [distDir]   (default: dist)
import { readdirSync, readFileSync, statSync } from "node:fs";
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

const HOVER_GUARD = /@media\s*\(\s*hover\s*:\s*hover\s*\)/;
let guarded = [];
let hoverRules = 0;

for (const f of files) {
  const css = readFileSync(f, "utf8");
  if (HOVER_GUARD.test(css)) {
    const at = css.search(HOVER_GUARD);
    guarded.push(`${f}\n      ...${css.slice(Math.max(0, at - 90), at + 90).replace(/\s+/g, " ")}...`);
  }
  hoverRules += (css.match(/group-hover|\\:hover|:hover/g) || []).length;
}

if (guarded.length > 0) {
  console.error("FAIL  the built CSS gates hover behind `@media (hover: hover)`.");
  console.error("      On a touch-primary pointer (Chrome reports hover:none) every hover effect dies:");
  console.error("      nav dropdowns, link/button hovers, card zoom. This was the owner's 2026-11-10 report.");
  for (const g of guarded) console.error(`      ${g}`);
  console.error("      Fix: if this site uses Tailwind v4, add `@custom-variant hover (&:hover);` to the CSS");
  console.error("           entry that imports tailwindcss. If the rule is hand-written, drop the media");
  console.error("           wrapper from it.");
  process.exit(1);
}

if (hoverRules === 0) {
  console.error("FAIL  no hover rules at all in the built CSS - the guard cannot tell 'no hover styles' from 'hover styles that never apply'.");
  process.exit(1);
}

console.log(`ok    ${files.length} CSS file(s), ${hoverRules} hover rule(s), no @media (hover: hover) guard.`);
