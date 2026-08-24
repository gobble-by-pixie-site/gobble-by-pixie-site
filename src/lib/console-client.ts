/**
 * Console public-API client — lazy env reads (never import.meta.env at
 * module scope; see lib/env.ts for the production incident that rule
 * exists), both historical var names accepted, 60s TTL cache on GETs so
 * SSR bursts don't hammer the per-IP rate limit. Only successes are
 * cached; failures fall through so a transient blip doesn't pin stale
 * data for a full minute.
 */
import { consoleUrl, consoleKey } from "./env";

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

export async function fetchFromConsole<T>(path: string): Promise<T | null> {
  const BASE_URL = consoleUrl();
  const API_KEY = consoleKey();
  if (!BASE_URL || !API_KEY) return null;

  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data as T;

  try {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}${path}`, {
      headers: { "X-Storefront-Api-Key": API_KEY },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    cache.set(path, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

/** Legacy alias used by BaseLayout/menu pages. */
export function fetchFromConsoleCollections() {
  return fetchFromConsole<{ collections: unknown[] }>("/api/public/collections");
}

/** Analytics IDs + logo (per-tenant, set in Console → Business). */
export function fetchStoreConfig() {
  return fetchFromConsole<{
    ga4MeasurementId: string | null;
    gtmContainerId: string | null;
    metaPixelId: string | null;
    logoUrl: string | null;
  }>("/api/public/store-config");
}

/**
 * Homepage sections composed in Console (Settings → Content → Homepage
 * sections). Visible rows only; empty array = storefront keeps its
 * built-in layout.
 */
export async function fetchSiteSections(): Promise<unknown[]> {
  const data = await fetchFromConsole<{ sections?: unknown[] }>("/api/public/site-sections");
  return data?.sections ?? [];
}
