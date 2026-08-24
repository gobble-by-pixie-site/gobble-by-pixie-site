import type { APIContext, MiddlewareNext } from "astro";
import { captureRuntimeEnv } from "./lib/env";

/**
 * Captures the Cloudflare Worker's runtime env on the first request of
 * each isolate so src/lib/env.ts's getEnv() can serve it to every reader.
 *
 * Also applies security headers to SSR responses — public/_headers only
 * covers static assets on Pages advanced mode, never worker-generated
 * HTML/API responses. workerd hands back an immutable Response, so the
 * body/status are re-wrapped with merged headers.
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

export const onRequest = async (context: APIContext, next: MiddlewareNext) => {
  await captureRuntimeEnv();

  const upstream = await next();
  const headers = new Headers(upstream.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
};
