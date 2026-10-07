import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../lib/env";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

/**
 * Cash-on-Delivery checkout proxy → Console POST /api/public/orders/create-cod.
 *
 * The drawer cart speaks SLUGS (`gbp-jar-8`); Console prices by UUID. The
 * mapping happens HERE, server-side, because the storefront key must never
 * reach the browser and the catalog is the live one (a hidden or pre-launch
 * product simply has no row to resolve to, so it 400s instead of selling).
 *
 * Custom BYOP platters (`custom-*` ids) and unpriced items cannot be COD:
 * priceOrder recomputes every line server-side from real product rows, so
 * there is nothing to price them from. They stay WhatsApp-only, stated
 * plainly in the error. Signed-in shoppers ride the `gbp_session` cookie;
 * everyone else checks out as guest with an email (Console links repeat
 * emails to the same customer row).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const customer = body?.customer ?? {};
  const couponCode =
    typeof body?.couponCode === "string" && body.couponCode.trim() ? body.couponCode.trim() : undefined;

  if (!rawItems.length) {
    return new Response(JSON.stringify({ error: "Cart is empty." }), { status: 400 });
  }

  const name = String(customer.name ?? "").trim();
  const email = String(customer.email ?? "").trim().toLowerCase();
  const phone = String(customer.phone ?? "").trim();
  const address = String(customer.address ?? "").trim();
  const pincode = String(customer.pincode ?? "").trim();
  // Console itself does not validate email shape (non-empty is enough there),
  // so the proxy does: a garbage address would mint a garbage customer row
  // that can never receive its confirmation.
  if (!name) return new Response(JSON.stringify({ error: "Name is required." }), { status: 400 });
  if (!/.+@.+\..+/.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: "Enter a valid email address." }), { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return new Response(JSON.stringify({ error: "Enter a valid phone number." }), { status: 400 });
  }
  if (!address) return new Response(JSON.stringify({ error: "Delivery address is required." }), { status: 400 });

  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Storefront-Api-Key": API_KEY,
  };
  const sessionToken = cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) headers["X-Customer-Session-Token"] = sessionToken;

  const against = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { ...headers, ...((init?.headers as Record<string, string>) ?? {}) },
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json().catch(() => ({}));
    return { res, json: json as Record<string, unknown> };
  };

  // 1. Resolve slugs → UUIDs against the LIVE catalog.
  let catalog: Array<{ id: string; slug: string; name: string; price: number }>;
  try {
    const { res, json } = await against("/api/public/products");
    if (!res.ok || !Array.isArray(json.products)) {
      return new Response(JSON.stringify({ error: "Could not load the catalog." }), { status: 502 });
    }
    catalog = json.products as Array<{ id: string; slug: string; name: string; price: number }>;
  } catch {
    return new Response(JSON.stringify({ error: "Could not reach the store backend." }), { status: 502 });
  }
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));

  const orderItems: Array<{ productId: string; qty: number }> = [];
  for (const it of rawItems) {
    const slug = String(it?.slug ?? "");
    const qty = Math.floor(Number(it?.qty));
    if (!slug || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return new Response(JSON.stringify({ error: "Invalid cart item." }), { status: 400 });
    }
    // Made-to-order platters have no product row to price from (their ids are
    // timestamp-based, e.g. `byop-<ms>`), so priceOrder could never price them.
    if (slug.startsWith("byop-") || slug.startsWith("custom-")) {
      return new Response(
        JSON.stringify({
          error: "Custom platters are made to order — please confirm them on WhatsApp first.",
        }),
        { status: 400 },
      );
    }
    const product = bySlug.get(slug);
    if (!product) {
      return new Response(
        JSON.stringify({ error: "Something in your cart is no longer available. Please refresh the menu." }),
        { status: 400 },
      );
    }
    // Mirrors the drawer's own rule ("price on request" never enters COD),
    // enforced where it cannot be bypassed: a row price of 0 means the price
    // is not final, and a COD order would charge a number nobody confirmed.
    if (!product.price) {
      return new Response(
        JSON.stringify({
          error: `"${product.name}" is priced on request — please confirm it on WhatsApp first.`,
        }),
        { status: 400 },
      );
    }
    orderItems.push({ productId: product.id, qty });
  }

  // 2. Create the COD order. Console reprices everything server-side
  // (priceOrder) — the drawer total is a preview, never the charge.
  try {
    const { res, json } = await against("/api/public/orders/create-cod", {
      method: "POST",
      body: JSON.stringify({
        items: orderItems,
        couponCode,
        customerEmail: email,
        shippingAddress: { name, phone, address, pincode },
      }),
    });
    if (!res.ok) {
      const msg =
        res.status === 501
          ? "Cash on delivery is not available right now."
          : typeof json.error === "string"
            ? json.error
            : "Could not place the order.";
      return new Response(JSON.stringify({ error: msg }), { status: res.status });
    }
    return new Response(
      JSON.stringify({
        success: true,
        orderNumber: json.orderNumber,
        total: json.total,
      }),
      { status: 200 },
    );
  } catch {
    return new Response(JSON.stringify({ error: "Could not reach the store backend." }), { status: 502 });
  }
};
