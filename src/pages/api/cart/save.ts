import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../lib/env";

export const prerender = false;

/**
 * POST /api/cart/save — server-side proxy for abandoned-cart capture.
 * Console's pending_carts + check-abandoned-carts cron (+ drain-email-queue)
 * can only recover carts they know about; the storefront must POST once it
 * has the customer's email (COD form). Body:
 * { email, name?, items: [{slug,name,price,qty,image}], total }.
 * Best-effort by design: failures return 200 with saved:false so checkout
 * never blocks on marketing infrastructure. Ported from Nanoliss's
 * src/pages/api/cart/save.ts, the reference implementation.
 */
export const POST: APIRoute = async ({ request }) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) return json({ saved: false });

  let payload: { email?: unknown; name?: unknown; items?: unknown; total?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ saved: false });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 255) : undefined;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const total = Number(payload.total);

  if (!email || !email.includes("@") || items.length === 0 || !Number.isFinite(total) || total <= 0) {
    return json({ saved: false });
  }

  try {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/api/public/cart/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Storefront-Api-Key": API_KEY },
      body: JSON.stringify({ email, name, cart: items, total }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return json({ saved: false });
    return json({ saved: true });
  } catch {
    return json({ saved: false });
  }
};
