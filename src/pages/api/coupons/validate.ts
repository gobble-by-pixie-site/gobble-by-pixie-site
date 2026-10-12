import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../lib/env";

export const prerender = false;

/**
 * Thin proxy to Console POST /api/public/coupons/validate. The drawer never
 * holds the storefront key, so all verdicts go through here — including the
 * `kind: "credit"` answer the credit box needs to tell a promo code from
 * store credit before the order is ever submitted.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const cartTotal = Number(body?.cartTotal);
  const customerEmail =
    typeof body?.customerEmail === "string" && body.customerEmail.trim()
      ? body.customerEmail.trim().toLowerCase()
      : undefined;
  if (!code) return new Response(JSON.stringify({ valid: false, error: "Enter a code." }), { status: 400 });
  if (!Number.isFinite(cartTotal) || cartTotal <= 0) {
    return new Response(JSON.stringify({ valid: false, error: "Your cart is empty." }), { status: 400 });
  }

  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) {
    return new Response(JSON.stringify({ valid: false, error: "Store backend is not configured." }), { status: 503 });
  }

  try {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/api/public/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Storefront-Api-Key": API_KEY },
      body: JSON.stringify({ code, cartTotal, customerEmail }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({ valid: false, error: "Invalid response from store backend." }));
    return new Response(JSON.stringify(json), { status: res.status });
  } catch {
    return new Response(JSON.stringify({ valid: false, error: "Could not reach the store backend." }), { status: 503 });
  }
};
