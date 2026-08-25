// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Sitemap: served by src/pages/sitemap.xml.js (live product URLs from
// Console, junk pages excluded) — @astrojs/sitemap removed because its
// build-time output missed every product and listed account/login/preview
// routes.

export default defineConfig({
  server: { port: 3005 },
  // SSR: every menu page fetches Linear Console per request (60s in-memory
  // cache) so Console edits go live without a rebuild — the whole point of
  // the 2026-08 cutover. Pages that need no server data opt into
  // prerender individually.
  output: 'server',
  site: 'https://gobblebypixie.com',
  session: false,
  compressHTML: true,
  adapter: cloudflare({ imageService: 'passthrough' }),
  build: {
    inlineStylesheets: 'never',
  },
});
