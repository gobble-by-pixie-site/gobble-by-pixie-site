import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../../lib/env";
import { SESSION_COOKIE } from "../../../../lib/auth-session";

export const prerender = false;

// The shopper's concierge page — GET /api/account/concierge → Linear
// Console's GET /api/public/concierge, with the gbp_session cookie
// forwarded as X-Customer-Session-Token. Returns the open thread (if any),
// the closed history, and the messages of the thread on screen. Ported
// from TCS's concierge proxies (2026-11-12, owner: "Gobble Concierge —
// let's do it").

export const GET: APIRoute = async ({ cookies, url }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }

  const q = url.searchParams.toString();
  try {
    const res = await fetch(`${base}/api/public/concierge${q ? `?${q}` : ""}`, {
      headers: {
        "X-Storefront-Api-Key": key,
        "X-Customer-Session-Token": token,
      },
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(json), {
      status: res.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Could not reach the store backend." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};
