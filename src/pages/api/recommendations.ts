import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../lib/env";

export const prerender = false;

// Proxies Linear Console's "Goes well with" cart recommendations
// (GET /api/public/products/recommendations?slug=) — ported from nanoliss
// (2026-11-12, owner: "cart suggestions for the rest"). The cart drawer's
// renderCrossSells prefers this live co-occurrence result and falls back
// to the embedded static cross-sell collection when it misses.

export const GET: APIRoute = async ({ url }) => {
  const slug = (url.searchParams.get("slug") ?? "").trim();
  if (!slug) {
    return new Response(JSON.stringify({ error: "slug is required" }), { status: 400 });
  }
  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) {
    return new Response(JSON.stringify({ recommendations: [] }), { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/public/products/recommendations?slug=${encodeURIComponent(slug)}`, {
      headers: { "X-Storefront-Api-Key": key },
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return new Response(JSON.stringify({ recommendations: [] }), { status: 200 });
    }
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ recommendations: [] }), { status: 200 });
  }
};
