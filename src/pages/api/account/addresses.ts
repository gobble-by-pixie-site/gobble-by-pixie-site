import type { APIRoute } from "astro";
import { consoleUrl, consoleKey } from "../../../lib/env";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

/**
 * Address book proxy → Console /api/public/customers/me/addresses.
 *
 * Same shape as tcs-store/nanoliss/mane: the session cookie is the ONLY auth,
 * the token never reaches the browser, and every write goes through Console
 * (the customer's `addresses` table) — never a local store. Nanoliss-parity
 * account surface (2026-11-10).
 *
 * GET is tolerant: no session → `[]` (the tab renders an empty state, the
 * page still works). POST/PUT/DELETE are strict 401 — a missing session must
 * not write.
 */
async function consoleFetch(path: string, init: RequestInit, sessionToken: string) {
  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) {
    return { res: null as Response | null, json: {} as Record<string, unknown> };
  }
  const res = await fetch(`${BASE_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Storefront-Api-Key": API_KEY,
      "X-Customer-Session-Token": sessionToken,
    },
    signal: AbortSignal.timeout(10000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, json };
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401 });
}

function backendDown() {
  return new Response(JSON.stringify({ error: "Store backend is not configured." }), { status: 503 });
}

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return new Response(JSON.stringify({ addresses: [] }), { status: 200 });
  const out = await consoleFetch("/api/public/customers/me/addresses", { method: "GET" }, token);
  if (!out.res) return backendDown();
  return new Response(JSON.stringify(out.json), { status: out.res.status });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  const out = await consoleFetch(
    "/api/public/customers/me/addresses",
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
  if (!out.res) return backendDown();
  return new Response(JSON.stringify(out.json), { status: out.res.status });
};
