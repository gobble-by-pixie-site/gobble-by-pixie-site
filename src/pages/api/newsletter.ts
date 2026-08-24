import type { APIRoute } from "astro";
import { fetchFromConsole } from "../../lib/console-client";

export const prerender = false;

/**
 * Waitlist/newsletter signup — upserts into Console's
 * newsletter_subscribers (Settings → Newsletter campaigns send to this
 * exact list). Replaces the Web3Forms/email-relay era entirely.
 */
export const POST: APIRoute = async ({ request }) => {
  let email = "";
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const res = await fetchFromConsoleRaw("/api/public/newsletter/subscribe", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!res) return json({ error: "Could not subscribe right now." }, 502);
  return json(await res.json().catch(() => ({ ok: true })), res.status);
};

async function fetchFromConsoleRaw(
  path: string,
  init: { method: string; body: string }
): Promise<Response | null> {
  // Direct (non-cached, non-GET) call — kept separate from the GET cache.
  const { consoleUrl, consoleKey } = await import("../../lib/env");
  const base = consoleUrl();
  const key = consoleKey();
  if (!base || !key) return null;
  try {
    return await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: init.method,
      headers: { "Content-Type": "application/json", "X-Storefront-Api-Key": key },
      body: init.body,
    });
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
