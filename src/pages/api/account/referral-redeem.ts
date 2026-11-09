import type { APIRoute } from "astro";
import { redeemReferral } from "../../../lib/auth-customer";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

// Referral redemption (nanoliss contract) — logged-in customer applies an
// invite code from the account page.

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return new Response(JSON.stringify({ error: "Please log in first." }), { status: 401 });
  const body = await request.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!code) return new Response(JSON.stringify({ error: "Missing invite code." }), { status: 400 });
  const result = await redeemReferral(token, code);
  if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  return new Response(JSON.stringify(result.data), { status: 200, headers: { "Cache-Control": "no-store" } });
};
