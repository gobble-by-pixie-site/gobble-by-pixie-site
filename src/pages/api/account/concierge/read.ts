import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../../lib/env";
import { SESSION_COOKIE } from "../../../../lib/auth-session";

export const prerender = false;

// Mark the open conversation read → Console POST /api/public/concierge/read.
// The unread count is derived server-side from the shopper's watermark.

export const POST: APIRoute = async ({ cookies }) => {
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

  try {
    const res = await fetch(`${base}/api/public/concierge/read`, {
      method: "POST",
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
