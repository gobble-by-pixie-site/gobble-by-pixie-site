import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../lib/env";

export const prerender = false;

/**
 * Thin proxy to Console GET /api/public/coupons/best — the server-side
 * offers picker. Renders nothing when the tenant has no live promos (Gobble
 * has none today), which is correct for a store that doesn't discount.
 * Failures always answer empty, never an error the drawer must handle.
 */
export const GET: APIRoute = async ({ request }) => {
  const empty = (status = 200) =>
    new Response(JSON.stringify({ coupon: null, offers: [] }), { status });
  const url = new URL(request.url);
  const cartTotal = Number(url.searchParams.get("cartTotal"));
  const customerEmail = url.searchParams.get("customerEmail") || undefined;
  if (!Number.isFinite(cartTotal) || cartTotal <= 0) return empty(400);

  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) return empty(503);

  const params = new URLSearchParams({ cartTotal: String(cartTotal) });
  if (customerEmail) params.set("customerEmail", customerEmail);
  try {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/api/public/coupons/best?${params.toString()}`, {
      headers: { "X-Storefront-Api-Key": API_KEY },
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({ coupon: null, offers: [] }));
    return new Response(JSON.stringify(json), { status: res.status });
  } catch {
    return empty(503);
  }
};
