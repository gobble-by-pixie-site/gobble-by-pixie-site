import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../lib/env";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

/**
 * Wishlist proxy → Console /api/public/customers/me/wishlist(*).
 *
 * Slug in, UUID out: cards and hearts speak slugs (`gbp-jar-8`); Console
 * speaks UUIDs (its DELETE even 400s a non-UUID). The resolution happens
 * here against the LIVE catalog, same as /api/checkout/cod — a slug with no
 * live row 404s instead of writing a dangling save.
 *
 * Auth is the session cookie; a missing/invalid one surfaces as 401, which
 * is the guest signal, not an error — hearts fall back to localStorage and
 * the account tab pushes leftovers upstream (same model as TCS/Nanoliss).
 */
async function consoleFetch(path: string, init: RequestInit, sessionToken?: string) {
  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) return null;
  const res = await fetch(`${BASE_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Storefront-Api-Key": API_KEY,
      ...(sessionToken ? { "X-Customer-Session-Token": sessionToken } : {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json: json as Record<string, unknown> };
}

async function resolveUuid(slug: string): Promise<string | null> {
  const out = await consoleFetch("/api/public/products", {});
  if (!out || !out.res.ok || !Array.isArray(out.json.products)) return null;
  const hit = (out.json.products as Array<{ id: string; slug: string }>).find((p) => p.slug === slug);
  return hit ? hit.id : null;
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401 });
}

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthorized();
  const out = await consoleFetch("/api/public/customers/me/wishlist", { method: "GET" }, token);
  if (!out) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }
  return new Response(JSON.stringify(out.json), { status: out.res.status });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthorized();
  const body = await request.json().catch(() => null);
  const slug = String(body?.slug ?? "").trim();
  if (!slug) return new Response(JSON.stringify({ error: "slug is required." }), { status: 400 });
  const productId = await resolveUuid(slug);
  if (!productId) {
    return new Response(JSON.stringify({ error: "That product is no longer available." }), { status: 404 });
  }
  const out = await consoleFetch(
    "/api/public/customers/me/wishlist",
    { method: "POST", body: JSON.stringify({ productId, productSlug: slug }) },
    token,
  );
  if (!out) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }
  return new Response(JSON.stringify(out.json), { status: out.res.status });
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthorized();
  const slug = (url.searchParams.get("slug") ?? "").trim();
  if (!slug) return new Response(JSON.stringify({ error: "slug is required." }), { status: 400 });
  const productId = await resolveUuid(slug);
  if (!productId) return new Response(JSON.stringify({ success: true }), { status: 200 });
  const out = await consoleFetch(
    `/api/public/customers/me/wishlist/${productId}`,
    { method: "DELETE" },
    token,
  );
  if (!out) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }
  return new Response(JSON.stringify(out.json), { status: out.res.status });
};
