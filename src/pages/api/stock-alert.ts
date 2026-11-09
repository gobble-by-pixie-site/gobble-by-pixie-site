import type { APIRoute } from "astro";
import { stockAlert } from "../../lib/auth-customer";

export const prerender = false;

// "Notify me when back" — guest-allowed. Console dedupes per email+product.

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const productId = String(body?.productId ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ error: "Enter a valid email address." }), { status: 400 });
  if (!productId) return new Response(JSON.stringify({ error: "Missing product." }), { status: 400 });
  const result = await stockAlert(email, productId);
  if (!result.ok) return new Response(JSON.stringify({ error: result.error ?? "Could not save your request." }), { status: result.status });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
