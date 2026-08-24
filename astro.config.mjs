// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  server: { port: 3005 },
  // SSR: every menu page fetches Linear Console per request (60s in-memory
  // cache) so Console edits go live without a rebuild — the whole point of
  // the 2026-08 cutover. Pages that need no server data opt into
  // prerender individually.
  output: 'server',
  site: 'https://gobblebypixie.com',
  compressHTML: true,
  adapter: cloudflare(),
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'never',
  },
});
