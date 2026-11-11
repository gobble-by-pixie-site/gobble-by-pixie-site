import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../../lib/env";
import { SESSION_COOKIE } from "../../../../lib/auth-session";

export const prerender = false;

// Rate a closed conversation → Console POST /api/public/concierge/
// [threadId]/csat (0128). One rating per thread; Console verifies the
// thread belongs to the caller.

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  const threadId = typeof body?.threadId === "string" ? body.threadId.trim() : "";
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" && body.comment.trim() ? body.comment.trim() : undefined;
  if (!threadId) {
    return new Response(JSON.stringify({ error: "Conversation is required." }), { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: "Rating must be 1-5." }), { status: 400 });
  }

  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) {
    return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
  }

  try {
    const res = await fetch(`${base}/api/public/concierge/${encodeURIComponent(threadId)}/csat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Storefront-Api-Key": key,
        "X-Customer-Session-Token": token,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ rating, comment: comment || undefined }),
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
