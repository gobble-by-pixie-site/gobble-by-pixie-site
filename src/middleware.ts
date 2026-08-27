import type { APIContext, MiddlewareNext } from "astro";
import { captureRuntimeEnv } from "./lib/env";

/**
 * Captures the Cloudflare Worker's runtime env on the first request of
 * each isolate so src/lib/env.ts's getEnv() can serve it to every reader.
 *
 * Also applies security headers + cache headers to SSR responses —
 * public/_headers only covers static assets on Pages advanced mode, never
 * worker-generated HTML/API responses. workerd hands back an immutable
 * Response, so the body/status are re-wrapped with merged headers.
 *
 * CACHE STRATEGY: Cache static HTML at Cloudflare edge (300s TTL + SWR).
 * Bots get cached HTML at edge → Workers never invoked → console API
 * never called → Neon DB untouched. Dynamic paths (cart, checkout,
 * account, search, admin, api) are never cached.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Who may iframe this site: itself + Console's Vision panels. Missing
  // this meant ANY third party could embed the storefront (clickjacking).
  // Same directive Nanoliss/TCS already ship.
  "Content-Security-Policy":
    "frame-ancestors 'self' https://linear-console.vercel.app",
};

const isCacheablePath = (pathname: string): boolean => {
  // Don't cache dynamic/user-specific paths
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout") ||
      pathname.startsWith("/account") || pathname.startsWith("/login") ||
      pathname.startsWith("/signup") || pathname.startsWith("/search") ||
      pathname.startsWith("/admin") || pathname.startsWith("/api") ||
      pathname.startsWith("/preview")) {
    return false;
  }
  return true;
};

export const onRequest = async (context: APIContext, next: MiddlewareNext) => {
  await captureRuntimeEnv();

  const upstream = await next();
  const headers = new Headers(upstream.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  // Add cache headers for static content (bots get cached HTML at edge)
  const pathname = new URL(context.request.url).pathname;
  if (isCacheablePath(pathname)) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    headers.set("Vary", "Accept-Encoding");
  } else {
    headers.set("Cache-Control", "private, no-store");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
};
