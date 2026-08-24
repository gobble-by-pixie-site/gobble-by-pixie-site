/**
 * fetchSiteContent.js
 * Fetches editable site copy from the SiteContent tab of the backend Sheet
 * (published as CSV) at build time — same pattern as fetchProducts.js.
 *
 * SHEET COLUMNS: key | value | where_it_appears
 * Any key left blank in the Sheet falls back to the hardcoded default below,
 * so a partially-filled Sheet never breaks the site.
 *
 * Publish: File → Share → Publish to web → CSV → paste URL into
 * GOOGLE_SITE_CONTENT_CSV_URL env var.
 */

const FALLBACK_CONTENT = {
  tagline: 'Handmade Flavoured Cream Cheese',
  hero_eyebrow: "Delhi NCR's Artisanal Cheese House",
  hero_sub: 'Small-batch cream cheeses and handcrafted grazing boards — 100% vegetarian, gluten-free, keto-friendly. Zero preservatives, always fresh.',
  hero_trust: 'Loved by 1,700+ fellow food lovers on Instagram',
  about_intro: 'Gobble by Pixie began with a simple belief: cheese should be honest — real ingredients, small batches, zero artificial preservatives. Every jar and every grazing board is handcrafted, never mass-produced on an industrial line.',
  fulfillment_platters: 'Cheese Platters: Next-Day Dispatch',
  fulfillment_jars: 'Cream Cheese Jars: Order by Thu Midnight, Shipped Sat',
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
      if (home && (home.tagline || home.heroEyebrow)) {
        if (home.tagline) merged.tagline = home.tagline;
        if (home.heroEyebrow) merged.hero_eyebrow = home.heroEyebrow;
        if (home.fibreBody) merged.about_intro = home.fibreBody;
      }
      // Food-vertical home fields are stored snake_case and copied 1:1.
      ['hero_title', 'hero_sub', 'hero_trust', 'byop_eyebrow', 'byop_title', 'byop_sub', 'best_eyebrow', 'best_title'].forEach((k) => {
        if (home && home[k]) merged[k] = home[k];
      });
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