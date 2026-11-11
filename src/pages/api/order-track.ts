import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../lib/env";

export const prerender = false;

// Public order-status lookup for /order/track — ported from nanoliss.com
// (2026-11-11). The WhatsApp order_shipped_v2 "Track order" button lands
// on /order/track?number=<n>; this proxy forwards to Linear Console's
// /api/public/order-status, which requires the order number PLUS the
// email or phone used at checkout — the number alone never returns data.
// A wrong pair reads as the same generic 404, so nothing about order
// existence leaks.

export const GET: APIRoute = async ({ url }) => {
  const number = (url.searchParams.get("number") ?? "").trim();
  const contact = (url.searchParams.get("contact") ?? "").trim();
  if (!number || !contact) {
    return new Response(
      JSON.stringify({ error: "Enter your order number and the email or phone you used at checkout." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }

  try {
    const res = await fetch(`${base}/api/public/order-status?number=${encodeURIComponent(number)}&contact=${encodeURIComponent(contact)}`, {
      headers: { "X-Storefront-Api-Key": key },
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        res.status === 404 || res.status === 400
          ? "We couldn't find that order — double-check the number and the email or phone you used."
          : "Tracking is briefly unavailable. Please try again in a moment.";
      return new Response(JSON.stringify({ error: message }), {
        status: res.status === 400 || res.status === 404 ? 404 : 502,
      });
    }
    return new Response(JSON.stringify(json), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Tracking is briefly unavailable. Please try again in a moment." }), {
      status: 502,
    });
  }
};
