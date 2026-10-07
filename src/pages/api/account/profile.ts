import type { APIRoute } from "astro";
import { getCurrentCustomer, updateProfile } from "../../../lib/auth-customer";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401 });
}

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthorized();
  const result = await getCurrentCustomer(token);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  }
  return new Response(JSON.stringify(result.data), { status: 200 });
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthorized();
  const updates = (await request.json().catch(() => null)) ?? {};
  const result = await updateProfile(token, updates);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), { status: result.status });
  }
  return new Response(JSON.stringify(result.data), { status: 200 });
};
