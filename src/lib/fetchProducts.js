/**
 * fetchProducts.js
 * Fetches product data from a Google Sheet published as CSV at build time.
 *
 * SHEET COLUMNS: id | name | category | subcategory | price | net_weight | image_url | description | dietary | fulfillment | in_stock | rating | review_count
 *
 * CATEGORY VALUES: Jars, Set Cheese Balls, Platters, Butter Candles, Cheese Art, Graze & Gift Boxes, Grazing Tables
 * SUBCATEGORY (Platters only): Picnic Platters, Boat Platters, Box Platters, Party Platters, Wooden Platters
 * SUBCATEGORY (Cheese Art only): Sizes, Add-ons, Platter
 * FULFILLMENT VALUES: next-day | weekly-batch
 *
 * price: leave BLANK in the Sheet until real pricing exists — the site shows
 * "Price on request" rather than a fabricated number. Same for rating/review_count
 * (optional, blank until there are real reviews) and image_url (blank shows a
 * "Photo coming soon" placeholder instead of an unrelated stock photo).
 *
 * image_url: paste one or more Google Drive share links, comma-separated, for
 * multiple photos of the same product (e.g. "https://drive.google.com/file/d/AAA/view,
 * https://drive.google.com/file/d/BBB/view"). Each is auto-converted to a direct
 * thumbnail URL — same pattern as theclosetstory.com/tcs-store, no CDN/R2 needed.
 * She just shares the Drive file(s) as "Anyone with the link can view" and pastes
 * the link(s) in — nothing else changes about her existing Drive workflow.
 *
 * Publish: File → Share → Publish to web → CSV → paste URL into GOOGLE_SHEET_CSV_URL env var.
 */

// Placeholder catalog structure only — names are generic slots ("Flavour 1", etc.)
// pending the client's real flavour list, pricing, and photos. Replace via the Sheet.
const FALLBACK_PRODUCTS = [
  // ── Jars (cream cheese tubs) — 8 flavour slots ──
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `gbp-jar-${i + 1}`, name: `Jar Flavour ${i + 1}`, category: 'Jars', subcategory: '',
    price: null, net_weight: '', description: '', dietary: ['GF'], fulfillment: 'weekly-batch', in_stock: true,
  })),

  // ── Set Cheese Balls — 6 flavour slots ──
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `gbp-ball-${i + 1}`, name: `Set Cheese Ball ${i + 1}`, category: 'Set Cheese Balls', subcategory: '',
    price: null, net_weight: '', description: '', dietary: ['GF'], fulfillment: 'weekly-batch', in_stock: true,
  })),

  // ── Platters — subcategories, sizes where noted ──
  { id: 'gbp-plat-picnic', name: 'Picnic Platter', category: 'Platters', subcategory: 'Picnic Platters', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-plat-boat-s', name: 'Boat Platter — Small', category: 'Platters', subcategory: 'Boat Platters', price: null, net_weight: 'S', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-plat-boat-m', name: 'Boat Platter — Medium', category: 'Platters', subcategory: 'Boat Platters', price: null, net_weight: 'M', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-plat-boat-l', name: 'Boat Platter — Large', category: 'Platters', subcategory: 'Boat Platters', price: null, net_weight: 'L', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-plat-box', name: 'Box Platter', category: 'Platters', subcategory: 'Box Platters', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-plat-party', name: 'Party Platter', category: 'Platters', subcategory: 'Party Platters', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-plat-wooden', name: 'Wooden Platter', category: 'Platters', subcategory: 'Wooden Platters', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },

  // ── Butter Candles — 4 flavour slots (+ Customize Your Own is a dedicated UI section, not a row) ──
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `gbp-butter-${i + 1}`, name: `Butter Candle Flavour ${i + 1}`, category: 'Butter Candles', subcategory: '',
    price: null, net_weight: '', description: '', dietary: ['Veg'], fulfillment: 'next-day', in_stock: true,
  })),

  // ── Cheese Art — 4 sizes, add-ons, platter option ──
  { id: 'gbp-art-s', name: 'Cheese Art — Size 1', category: 'Cheese Art', subcategory: 'Sizes', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-art-m', name: 'Cheese Art — Size 2', category: 'Cheese Art', subcategory: 'Sizes', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-art-l', name: 'Cheese Art — Size 3', category: 'Cheese Art', subcategory: 'Sizes', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-art-xl', name: 'Cheese Art — Size 4', category: 'Cheese Art', subcategory: 'Sizes', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-art-addon-crackers', name: 'Add-on: Crackers / Sticks', category: 'Cheese Art', subcategory: 'Add-ons', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },
  { id: 'gbp-art-platter', name: 'Cheese Art Platter', category: 'Cheese Art', subcategory: 'Platter', price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true },

  // ── Graze & Gift Boxes — 6 variants ──
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `gbp-gift-${i + 1}`, name: `Graze & Gift Box ${i + 1}`, category: 'Graze & Gift Boxes', subcategory: '',
    price: null, net_weight: '', description: '', dietary: [], fulfillment: 'next-day', in_stock: true,
  })),
];

export function convertImageUrl(url) {
  if (!url) return url;
  url = url.trim();
  let fileId = null;
  const m1 = url.match(/drive\.google\.com\/file\/d\/([^\/\?&]+)/);
  if (m1) fileId = m1[1];
  if (!fileId) {
    const m2 = url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([^&]+)/);
    if (m2) fileId = m2[1];
  }
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  return url;
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

  return lines.slice(1).map(line => {
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

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    const dietaryRaw = row.dietary || '';
    const dietary = dietaryRaw.split(',').map(d => d.trim()).filter(Boolean);

    // Paste one or more Drive share links in the same cell, comma-separated, for
    // multiple photos — first one becomes the card's primary image.
    const images = (row.image_url || '')
      .split(',')
      .map((u) => convertImageUrl(u.trim()))
      .filter(Boolean);

    return {
      id: row.id || '',
      name: row.name || '',
      category: row.category || 'Uncategorized',
      subcategory: row.subcategory || '',
      price: row.price && !isNaN(parseFloat(row.price)) ? parseFloat(row.price) : null,
      net_weight: row.net_weight || '',
      image_url: images[0] || '',
      images,
      description: row.description || '',
      dietary,
      fulfillment: row.fulfillment === 'weekly-batch' ? 'weekly-batch' : 'next-day',
      in_stock: row.in_stock?.toLowerCase() === 'true' || row.in_stock === '1' || row.in_stock?.toLowerCase() === 'yes',
      rating: row.rating && !isNaN(parseFloat(row.rating)) ? parseFloat(row.rating) : null,
      review_count: row.review_count && !isNaN(parseInt(row.review_count)) ? parseInt(row.review_count) : 0,
    };
  }).filter(p => p.id && p.name);
}

export async function fetchProducts() {
  const csvUrl = import.meta.env.GOOGLE_SHEET_CSV_URL;

  if (!csvUrl) {
    console.warn('[GBP] ⚠️  GOOGLE_SHEET_CSV_URL not set — using placeholder catalog structure.');
    return FALLBACK_PRODUCTS;
  }

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    const products = parseCSV(csvText);
    if (products.length === 0) throw new Error('CSV parsed to 0 products');
    console.log(`[GBP] ✅ Loaded ${products.length} products from Google Sheets`);
    return products;
  } catch (err) {
    console.error(`[GBP] ❌ Failed to fetch products: ${err.message}`);
    console.warn('[GBP] Falling back to placeholder catalog structure.');
    return FALLBACK_PRODUCTS;
  }
}

export function getCategories(products) {
  return [...new Set(products.map(p => p.category))];
}

export function formatPrice(amount) {
  if (amount === null || amount === undefined || amount === 0) return 'Price on request';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

// Shared category-name -> URL-slug conversion, used by BaseLayout's Menu
// dropdown and every /menu/* page so links always agree on the same slug.
export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}
