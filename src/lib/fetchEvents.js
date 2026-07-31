/**
 * fetchEvents.js
 * Fetches the Events tab from the backend Sheet (published as CSV) at build
 * time — same pattern as fetchProducts.js / fetchSiteContent.js.
 *
 * SHEET COLUMNS: id | title | event_date | description | image_url | published
 *
 * image_url: paste one or more Google Drive share links, comma-separated —
 * same convention as the Products sheet, converted to direct thumbnail URLs.
 *
 * published: leave blank or FALSE to keep a draft event off the live site
 * while she's still writing it up.
 *
 * Publish: File → Share → Publish to web → CSV → paste URL into
 * GOOGLE_EVENTS_CSV_URL env var.
 */
import { convertImageUrl } from './fetchProducts.js';

const FALLBACK_EVENTS = [];

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());

  return lines.slice(1).map((line) => {
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

    const images = (row.image_url || '')
      .split(',')
      .map((u) => convertImageUrl(u.trim()))
      .filter(Boolean);

    return {
      id: row.id || '',
      title: row.title || '',
      date: row.event_date || '',
      description: row.description || '',
      image: images[0] || '',
      images,
      published: row.published?.toLowerCase() === 'true' || row.published === '1' || row.published?.toLowerCase() === 'yes',
    };
  }).filter((e) => e.id && e.title && e.published);
}

export async function fetchEvents() {
  const csvUrl = import.meta.env.GOOGLE_EVENTS_CSV_URL;

  if (!csvUrl) {
    console.warn('[GBP] ⚠️  GOOGLE_EVENTS_CSV_URL not set — Events page will show no events.');
    return FALLBACK_EVENTS;
  }

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    const events = parseCSV(csvText);
    console.log(`[GBP] ✅ Loaded ${events.length} published events from Google Sheets`);
    // Most recent first — event_date is a free-text field on the Sheet, so this
    // falls back to Sheet row order if it isn't a parseable date.
    return events.sort((a, b) => (new Date(b.date) - new Date(a.date)) || 0);
  } catch (err) {
    console.error(`[GBP] ❌ Failed to fetch events: ${err.message}`);
    return FALLBACK_EVENTS;
  }
}
