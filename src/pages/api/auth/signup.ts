import type { APIRoute } from "astro";
import { signup } from "../../../lib/auth-customer";
import { SESSION_COOKIE, cookieOptions } from "../../../lib/auth-session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password || !body?.name) {
    return new Response(
      JSON.stringify({ error: "Name, email, and password are required." }),
      { status: 400 },
    );
  }

  const result = await signup(body.email, body.password, body.name, body.phone ?? "");
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  }

  cookies.set(SESSION_COOKIE, result.data.sessionToken, cookieOptions());
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
