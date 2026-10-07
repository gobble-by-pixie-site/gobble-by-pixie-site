/**
 * Console customer-auth client — the ONLY server-side path for accounts.
 *
 * Replaces the Google Apps Sheet backend (`code.gs`, untracked 2026-10-07):
 * signup/signin/profile/orders used to POST to a deployed Apps Script web app
 * (`APPS_SCRIPT_URL`), keeping customers, passwords, tokens and points in a
 * Sheet outside every Console backup, RLS policy and restore drill. Console
 * serves the same surface on `/api/public/customers/*` with the tenant's own
 * storefront key, so the Sheet is no longer in the loop for anything.
 *
 * Deliberately NOT `fetchFromConsole` (console-client.ts): that helper is
 * GET-only, caches 60s, and collapses every failure to null. Auth needs POST
 * with a body, per-call session headers, real statuses, and no cache — a
 * cached login response would hand one shopper another's session.
 */
import { consoleUrl, consoleKey } from "./env";

export type ConsoleResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

async function callConsole<T>(
  path: string,
  init: { method: string; body?: unknown; sessionToken?: string },
): Promise<ConsoleResult<T>> {
  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) {
    return { ok: false, status: 503, error: "Store backend is not configured." };
  }

  try {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        "X-Storefront-Api-Key": API_KEY,
        ...(init.sessionToken ? { "X-Customer-Session-Token": init.sessionToken } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: (json as { error?: string }).error ?? "Something went wrong.",
      };
    }
    return { ok: true, status: res.status, data: json };
  } catch {
    return { ok: false, status: 502, error: "Could not reach the store backend." };
  }
}

export function signup(email: string, password: string, name: string, phone: string) {
  return callConsole<{ customer: unknown; sessionToken: string }>("/api/public/customers/signup", {
    method: "POST",
    body: { email, password, name, phone },
  });
}

export function login(email: string, password: string) {
  return callConsole<{ customer: unknown; sessionToken: string }>("/api/public/customers/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logout(sessionToken: string) {
  return callConsole<{ success: boolean }>("/api/public/customers/logout", {
    method: "POST",
    sessionToken,
  });
}

export function getCurrentCustomer(sessionToken: string) {
  return callConsole<{ customer: Record<string, unknown> }>("/api/public/customers/me", {
    method: "GET",
    sessionToken,
  });
}

export function updateProfile(sessionToken: string, updates: Record<string, unknown>) {
  return callConsole<{ customer: Record<string, unknown> }>("/api/public/customers/me", {
    method: "PATCH",
    body: updates,
    sessionToken,
  });
}

export function getOrders(sessionToken: string) {
  return callConsole<{ orders: unknown[] }>("/api/public/customers/orders", {
    method: "GET",
    sessionToken,
  });
}

export function getLoyalty(sessionToken: string) {
  return callConsole<{ points: number; tier: string | null; history: unknown[] }>(
    "/api/public/customers/me/loyalty",
    { method: "GET", sessionToken },
  );
}
