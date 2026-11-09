import type { APIRoute } from "astro";
import { redeemLoyalty } from "../../../../lib/auth-customer";
import { SESSION_COOKIE } from "../../../../lib/auth-session";

export const prerender = false;

// Points → store credit, self-service. Console mints the credit coupon in
// one guarded transaction; the shopper applies it in the checkout credit
// box. Body: { amount } OR { points } OR {} (full balance).

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return new Response(JSON.stringify({ error: "Please log in to use your points." }), { status: 401 });
  const body = await request.json().catch(() => ({}));
  const payload: Record<string, number> = {};
  if (body?.amount !== undefined && body.amount !== null && body.amount !== "") {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return new Response(JSON.stringify({ error: "Enter a credit amount of at least ₹1." }), { status: 400 });
    payload.amount = amount;
  } else if (body?.points !== undefined && body.points !== null && body.points !== "") {
    const points = Math.floor(Number(body.points) || 0);
    if (points <= 0) return new Response(JSON.stringify({ error: "Enter the points you want to spend." }), { status: 400 });
    payload.points = points;
  }
  const result = await redeemLoyalty(token, payload);
  if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  return new Response(JSON.stringify(result.data), { status: 200, headers: { "Cache-Control": "no-store" } });
};
