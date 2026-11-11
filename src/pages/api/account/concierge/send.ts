import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../../lib/env";
import { SESSION_COOKIE } from "../../../../lib/auth-session";

export const prerender = false;

// Send a concierge message → Console POST /api/public/concierge. Text only
// (attachments are a TCS-panel feature; gobble v1 is text) — the next
// message opens a thread when there is no open one.

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return new Response(JSON.stringify({ error: "Write a message first." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }

  try {
    const res = await fetch(`${base}/api/public/concierge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Storefront-Api-Key": key,
        "X-Customer-Session-Token": token,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ text }),
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
