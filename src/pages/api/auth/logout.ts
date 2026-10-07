import type { APIRoute } from "astro";
import { logout } from "../../../lib/auth-customer";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await logout(token).catch(() => undefined);
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
