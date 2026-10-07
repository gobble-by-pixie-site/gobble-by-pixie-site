import type { APIRoute } from "astro";
import { login } from "../../../lib/auth-customer";
import { SESSION_COOKIE, cookieOptions } from "../../../lib/auth-session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return new Response(
      JSON.stringify({ error: "Email and password are required." }),
      { status: 400 },
    );
  }

  const result = await login(body.email, body.password);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  }

  cookies.set(SESSION_COOKIE, result.data.sessionToken, cookieOptions());
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
