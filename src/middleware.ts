import type { APIContext, MiddlewareNext } from "astro";
import { captureRuntimeEnv } from "./lib/env";

/**
 * Captures the Cloudflare Worker's runtime env on the first request of
 * each isolate so src/lib/env.ts's getEnv() can serve it to every reader.
 */
export const onRequest = async (context: APIContext, next: MiddlewareNext) => {
  await captureRuntimeEnv();
  return next();
};
