import type { APIRoute } from "astro";
import { getLoyalty } from "../../../lib/auth-customer";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401 });
  }
  const result = await getLoyalty(token);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  }
  return new Response(JSON.stringify(result.data), { status: 200 });
};
