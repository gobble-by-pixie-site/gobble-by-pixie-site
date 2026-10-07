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
      // A hung Console must never hang SSR to the platform timeout. Matches
      // Nanoliss (src/lib/api/console-client.ts); TCS gets this in Item 7a,
      // which is still unmerged. Timeout only — nothing else about the client
      // changed (it already had the 60s success cache).
      signal: AbortSignal.timeout(10000),
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
 * sections). Empty array = storefront keeps its built-in layout.
 *
 * DEFAULT IS VISIBLE-ONLY, and that default is load-bearing: the live
 * homepage (index.astro) calls this with no options, and the Console's
 * endpoint filters to `visible = true` AND an open scheduling window
 * (migration 0087, judged in SQL against Postgres `now()`).
 *
 * `{ all: true }` adds `?all=1`, which drops both filters. The Console's own
 * doc comment says that flag "is used exclusively by each storefront's
 * /preview-sections page so editors see the FULL picture" — so pass it there
 * and ONLY there. Nanoliss and TCS both send it on the preview page; this
 * helper did not, which is why Gobble's preview silently omitted hidden and
 * scheduled sections while its page comment claimed it showed them.
 */
export async function fetchSiteSections(opts?: { all?: boolean }): Promise<unknown[]> {
  const data = await fetchFromConsole<{ sections?: unknown[] }>(
    `/api/public/site-sections${opts?.all ? "?all=1" : ""}`
  );
  return data?.sections ?? [];
}
