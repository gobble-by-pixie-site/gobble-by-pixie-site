import { fetchProducts } from "../lib/fetchProducts.js";

const SITE = "https://gobblebypixie.com";

/**
 * Custom sitemap (replaces the @astrojs/sitemap build-time output, which
 * missed every product URL and included account/login/preview-sections).
 * Static pages are curated; product URLs come live from Console so new
 * jars appear without a deploy.
 */
export async function GET() {
  const staticPaths = [
    { path: "/", priority: 1.0, changefreq: "weekly" },
    { path: "/menu/", priority: 0.9, changefreq: "daily" },
    { path: "/menu/grazing-tables/", priority: 0.8, changefreq: "weekly" },
    { path: "/byop/", priority: 0.8, changefreq: "weekly" },
    { path: "/events/", priority: 0.7, changefreq: "monthly" },
    { path: "/about/", priority: 0.6, changefreq: "monthly" },
    { path: "/faq/", priority: 0.6, changefreq: "monthly" },
    { path: "/contact/", priority: 0.5, changefreq: "yearly" },
  ];

  let productUrls = [];
  try {
    const products = await fetchProducts();
    productUrls = products.map((p) => ({
      path: `/products/${p.id}/`,
      priority: 0.8,
      changefreq: "weekly",
    }));
  } catch {
    // Console unreachable — ship the static set rather than a broken sitemap
  }

  const all = [...staticPaths, ...productUrls]
    .map(
      (p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
