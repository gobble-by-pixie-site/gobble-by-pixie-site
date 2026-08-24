import type { APIRoute } from "astro";
import { fetchFromConsole } from "../../lib/console-client";

export const prerender = false;

/** Live product search proxy — fronts Console GET /api/public/search so
 *  the storefront key stays server-side (nanoliss.com pattern). */
export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return json({ query: q, count: 0, results: [] });
  }

  const data = await fetchFromConsole<{ query: string; count: number; results: unknown[] }>(
    `/api/public/search?q=${encodeURIComponent(q)}&limit=8`
  );

  if (!data) {
    return json({ query: q, count: 0, results: [], error: "Search is unavailable right now." }, 502);
  }
  return json(data);
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
