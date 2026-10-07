import { fetchProducts } from "../lib/fetchProducts.js";
import { fetchFromConsole } from "../lib/console-client";

const SITE = "https://gobblebypixie.com";

/**
 * Custom sitemap (replaces the @astrojs/sitemap build-time output, which
 * missed every product URL and included account/login/preview-sections).
 * Static pages are curated; product URLs come live from Console so new
 * jars appear without a deploy.
 */
export async function GET() {
  // No /contact here: Gobble has no contact page (verified — there is no
  // contact.astro, and "contact" is a RESERVED_SLUG in the Console so the
  // [...slug] catch-all can never serve one either). This entry advertised a
  // permanent 404: measured live, /contact/ returned 404 while /about/ returned
  // 200, and it was the only non-200 of the 45 URLs this sitemap advertises.
  // Enquiries go through the WhatsApp/order flow instead.
  const staticPaths = [
    { path: "/", priority: 1.0, changefreq: "weekly" },
    { path: "/menu/", priority: 0.9, changefreq: "daily" },
    { path: "/menu/grazing-tables/", priority: 0.8, changefreq: "weekly" },
    { path: "/byop/", priority: 0.8, changefreq: "weekly" },
    { path: "/events/", priority: 0.7, changefreq: "monthly" },
    { path: "/about/", priority: 0.6, changefreq: "monthly" },
    { path: "/faq/", priority: 0.6, changefreq: "monthly" },
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

  // Custom pages (Item 4) — owner-authored pages composed in Console and
  // served by the [...slug] catch-all. Published only; the endpoint never
  // returns a draft. Same graceful-degradation rule as products above: a
  // failed fetch adds nothing and changes nothing.
  let pageUrls = [];
  try {
    const custom = await fetchFromConsole("/api/public/pages");
    pageUrls = (custom?.pages ?? []).map((p) => ({
      path: `/${p.slug}`,
      priority: 0.6,
      changefreq: "monthly",
      lastmod: new Date(p.updatedAt || Date.now()).toISOString().split("T")[0],
    }));
  } catch {
    // Console unreachable — ship the static + product set unchanged.
  }

  const all = [...staticPaths, ...productUrls, ...pageUrls]
    .map(
      (p) => `  <url>
    <loc>${SITE}${p.path}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""}
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
