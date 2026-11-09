import type { APIRoute } from "astro";
import { forgotPassword } from "../../../lib/auth-customer";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  const body = await request.json().catch(() => ({}));
  if (!body?.email) return new Response(JSON.stringify({ error: "Email is required." }), { status: 400 });
  const resetUrlBase = `${url.origin}/reset-password`;
  const result = await forgotPassword(String(body.email).trim().toLowerCase(), resetUrlBase);
  if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
