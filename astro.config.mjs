import { defineConfig } from 'astro/config';

export default defineConfig({
  server: { port: 3005 },
  output: 'static',
  site: 'https://gobblebypixie.com',
  compressHTML: true,
  build: {
    inlineStylesheets: 'never',
  },
});
