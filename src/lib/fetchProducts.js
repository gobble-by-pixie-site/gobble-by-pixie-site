/**
 * Console-backed product fetch with Google-Sheet CSV fallback.
 *
 * PRIMARY: Linear Console's public storefront API — CONSOLE_API_URL (or
 * CONSOLE_API_BASE_URL) + CONSOLE_STOREFRONT_API_KEY via the lazy
 * getEnv() in lib/env.ts. NEVER read import.meta.env directly here: it
 * is build-time-only under the Cloudflare adapter and silently served a
 * placeholder catalog to production once already (fixed 2026-08-24).
 */
import { consoleUrl, consoleKey, getEnv } from './env';

const FALLBACK_PRODUCTS = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `gbp-jar-${i + 1}`, name: `Jar Flavour ${i + 1}`, category: 'Jars', subcategory: '',
    price: null, net_weight: '', description: '', dietary: ['GF'], fulfillment: 'weekly-batch', in_stock: true,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `gbp-ball-${i + 1}`, name: `Set Cheese Ball ${i + 1}`, category: 'Set Cheese Balls', subcategory: '',
    price: null, net_weight: '', description: '', dietary: ['GF'], fulfillment: 'weekly-batch', in_stock: true,
  })),
];

function convertImageUrl(url) {
  if (!url) return url;
  url = url.trim();
  let fileId = null;
  const m1 = url.match(/drive\.google\.com\/file\/d\/([^\/\?&]+)/);
  if (m1) fileId = m1[1];
  if (!fileId) {
    const m2 = url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([^&]+)/);
    if (m2) fileId = m2[1];
  }
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600` : url;
}

export { convertImageUrl };

// ── Console shape → legacy site shape (pages consume these keys today) ──
function consoleToStore(p) {
  const attrs = p.attributes || {};
  return {
    id: p.slug,
    name: p.name,
    category: (p.category || 'Uncategorized').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    subcategory: attrs.subcategory || '',
    price: Number(p.price) > 0 ? Number(p.price) : null,
    net_weight: attrs.netWeight || '',
    image_url: p.image || '',
    images: Array.isArray(p.images) && p.images.length ? p.images : p.image ? [p.image] : [],
    description: p.description || '',
    dietary: attrs.dietary || [],
    fulfillment: attrs.fulfillment || 'next-day',
    // Console exposes stockQty, never an inStock boolean — derive it.
    // (!!p.inStock was always false and rendered the whole catalog Sold
    // Out whenever Console data did load.)
    stockQty: Number(p.stockQty) || 0,
    in_stock: Number(p.stockQty) > 0,
    badge: p.badge || null,
  };
}

async function fetchFromConsoleProducts() {
  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/public/products`, {
      headers: { 'X-Storefront-Api-Key': key },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = (data.products ?? []).map(consoleToStore);
    if (!list.length) return null;
    console.log(`[GBP] ✓ ${list.length} products from Linear Console`);
    return list;
  } catch (err) {
    console.error(`[GBP] ✗ Console fetch failed (${err.message}) — falling back to Sheets`);
    return null;
  }
}

function parseCSV(csvText) { /* unchanged */ 
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const values = []; let current = ''; let inQuotes = false;
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
    const images = (row.image_url || '').split(',').map((u) => convertImageUrl(u.trim())).filter(Boolean);
    return {
      id: row.id || '', name: row.name || '',
      category: row.category || 'Uncategorized', subcategory: row.subcategory || '',
      price: row.price && !isNaN(parseFloat(row.price)) ? parseFloat(row.price) : null,
      net_weight: row.net_weight || '',
      image_url: images[0] || '', images,
      description: row.description || '', dietary,
      fulfillment: row.fulfillment === 'weekly-batch' ? 'weekly-batch' : 'next-day',
      in_stock: String(row.in_stock).toLowerCase() === 'true' || row.in_stock === '1' || String(row.in_stock).toLowerCase() === 'yes',
      rating: null, review_count: 0,
    };
  }).filter(p => p.id && p.name);
}

export async function fetchProducts() {
  // Primary: Console. Fallback: original Sheet CSV (pre-cutover parity).
  const viaConsole = await fetchFromConsoleProducts();
  if (viaConsole) return viaConsole;

  const csvUrl = getEnv().GOOGLE_SHEET_CSV_URL;
  if (!csvUrl) {
    console.warn('[GBP] ⚠ No Console config and no Sheet URL — using placeholder catalog.');
    return FALLBACK_PRODUCTS;
  }
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = parseCSV(await response.text());
    if (!products.length) throw new Error('CSV parsed to 0 products');
    console.log(`[GBP] ✓ ${products.length} products from Google Sheets (legacy)`);
    return products;
  } catch (err) {
    console.error(`[GBP] ✗ Failed to fetch products: ${err.message}`);
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

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function fetchProductBySlug(slug) {
  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/public/products/${encodeURIComponent(slug)}`, {
      headers: { 'X-Storefront-Api-Key': key },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.product ? consoleToStore(data.product) : null;
  } catch {
    return null;
  }
}