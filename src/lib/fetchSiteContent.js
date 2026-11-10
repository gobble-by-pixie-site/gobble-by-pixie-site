/**
 * fetchSiteContent.js
 * Fetches editable site copy from Linear Console (Settings → Content) at
 * REQUEST time — SSR: every page that calls this reads Console per request,
 * so Console edits go live without a rebuild (the 2026-08 cutover).
 *
 * PRIMARY: Console site-content home+about merged over FALLBACK_CONTENT.
 * LEGACY: a Google Sheet CSV overlay (GOOGLE_SITE_CONTENT_CSV_URL) — a
 * retired path kept working, not the pipeline.
 *
 * FALLBACK_CONTENT holds only evergreen copy (tagline, hero, compliance).
 * Console-driven surfaces (the banner lines, the newsletter keys) are
 * deliberately NOT defaulted: empty on Console renders NOTHING — no
 * hardcoded fallback (owner rule).
 */

const FALLBACK_CONTENT = {
  tagline: 'Handmade Flavoured Cream Cheese',
  hero_eyebrow: "Delhi NCR's Artisanal Cheese House",
  hero_sub: 'Small-batch cream cheeses and handcrafted grazing boards — 100% vegetarian, gluten-free, keto-friendly. Zero preservatives, always fresh.',
  hero_trust: 'Loved by 1,700+ fellow food lovers on Instagram',
  about_intro: 'Gobble by Pixie began with a simple belief: cheese should be honest — real ingredients, small batches, zero artificial preservatives. Every jar and every grazing board is handcrafted, never mass-produced on an industrial line.',
  // fulfillment_platters / fulfillment_jars deliberately NOT defaulted here:
  // the site-top banner is her announcements (owner 2026-11-05, same contract
  // as Mane/Nanoliss — empty on Console = nothing renders). The seeded values
  // live in Console's home row, so the banner stays Console-driven even when
  // this fetch falls back.
  grazing_table_price: 'Starting at ₹25,000',
  fssai_number: '23323002000839',
  gstin: '07CHAPS2957P2ZL',
};

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return {};

  const rows = lines.slice(1).map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim());
    return values;
  });

  const content = {};
  rows.forEach(([key, value]) => {
    if (key && value) content[key.trim()] = value.trim();
  });
  return content;
}

export async function fetchSiteContent() {
  // PRIMARY: Console site-content about+home keys merged over fallbacks
  // (editable in Console -> Content). FALLBACK: legacy Sheet CSV.
  const { consoleUrl, consoleKey } = await import('./env');
  const base = consoleUrl();
  const key = consoleKey();
  let merged = { ...FALLBACK_CONTENT };
  if (base && key) {
    try {
      const headers = { 'X-Storefront-Api-Key': key };
      const [homeRes, aboutRes] = await Promise.all([
        fetch(base.replace(/\/$/, '') + '/api/public/site-content/home', { headers }),
        fetch(base.replace(/\/$/, '') + '/api/public/site-content/about', { headers }),
      ]);
      const home = homeRes.ok ? await homeRes.json().catch(() => null) : null;
      const about = aboutRes.ok ? await aboutRes.json().catch(() => null) : null;
      // Food-vertical home fields are stored snake_case and copied 1:1.
      // Copy EVERY key the console returns, including explicit "" for a
      // field the owner cleared — so a blank field renders empty instead
      // of falling back to the built-in copy. Missing keys (never
      // configured) keep the fallback via the initial spread.
      const SNAKE_HOME_KEYS = [
        'hero_eyebrow', 'hero_title', 'hero_sub', 'hero_trust',
        'byop_eyebrow', 'byop_title', 'byop_sub',
        'best_eyebrow', 'best_title',
        'tagline', 'fulfillment_platters', 'fulfillment_jars',
        // Announcement sparkle ("" | "on" | "pulse" | "drift" | "marquee" |
        // "type") — Console owns the animation choice, the storefront owns
        // the look. Same shape as Mane/Nanoliss bannerSpark.
        'bannerSpark',
        // The estate newsletter keys (2026-11-10): the footer "First Bites"
        // box reads THESE — empty on Console = the box renders nothing, no
        // fallback copy.
        'newsletterTitle', 'newsletterSub',
        'grazing_table_price', 'fssai_number', 'gstin',
      ];
      if (home) {
        for (const k of SNAKE_HOME_KEYS) {
          if (k in home) merged[k] = home[k];
        }
      }
      if (about && Array.isArray(about.storyParagraphs) && about.storyParagraphs[0]) {
        merged.about_intro = about.storyParagraphs[0];
      }
      console.log('[GBP] OK site copy from Linear Console');
    } catch (err) {
      console.error('[GBP] Console site content failed (' + err.message + ') - using fallbacks');
    }
  }

  const csvUrl = (await import('./env')).getEnv().GOOGLE_SITE_CONTENT_CSV_URL;
  if (!csvUrl) return merged;

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const fromSheet = parseCSV(await response.text());
    merged = { ...merged, ...fromSheet };
    console.log('[GBP] Loaded ' + Object.keys(fromSheet).length + ' site-content fields from Google Sheets');
    return merged;
  } catch (err) {
    console.error('[GBP] Failed to fetch site content: ' + err.message);
    return merged;
  }
}