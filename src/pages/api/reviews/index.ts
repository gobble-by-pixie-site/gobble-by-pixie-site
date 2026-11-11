import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../lib/env";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

// Proxies a logged-in customer's review submission to Linear Console's
// `POST /api/public/reviews` — ported from nanoliss.com (2026-11-11,
// owner: "fix all storefront's review system"). Reviewing is gated on a
// customer session (guests can read but not write). The gbp_session
// cookie is forwarded as Console's X-Customer-Session-Token — Console
// resolves the verified identity (real name/email) itself; this proxy
// NEVER trusts customerName/customerEmail from the request body, so
// authorship cannot be spoofed. Reviews land PENDING and appear only
// after the tenant approves them in the Console.

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "Please log in to leave a review." }), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  const rating = Number(body?.rating);
  const title = typeof body?.title === "string" ? body.title.trim() : undefined;
  const reviewBody = typeof body?.body === "string" ? body.body.trim() : "";

  if (!productId) {
    return new Response(JSON.stringify({ error: "Product is required." }), { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: "Please select a rating (1-5)." }), { status: 400 });
  }
  if (reviewBody.length < 20) {
    return new Response(JSON.stringify({ error: "Review must be at least 20 characters." }), { status: 400 });
  }

  const url = consoleUrl();
  const key = consoleKey();
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }

  try {
    const res = await fetch(`${url}/api/public/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Storefront-Api-Key": key,
        "X-Customer-Session-Token": token,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ productId, rating, title: title || undefined, body: reviewBody }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: json.error ?? "Something went wrong." }), { status: res.status });
    }
    return new Response(JSON.stringify({ success: true, message: json.message ?? "Review submitted." }), {
      status: 200,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Could not reach the store backend." }), { status: 503 });
  }
};
