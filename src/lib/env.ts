/**
 * Runtime env for Cloudflare Workers (Astro 7 / @astrojs/cloudflare v14+).
 * Ported verbatim from nanoliss.com's proven pattern — that site silently
 * served seed data for a day because `import.meta.env.*` is BUILD-time
 * only under the Cloudflare adapter, and this site's live menu was doing
 * the same (placeholder catalog in production, found 2026-08-24).
 *
 * Precedence: captured worker runtime env > process.env > build-time
 * import.meta.env. Both historical Console var names are accepted
 * everywhere via consoleUrl()/consoleKey() helpers.
 */
type Env = Record<string, string | undefined>;

let runtimeEnvCache: Env | null = null;
let warned = false;

/** Called by middleware before the first render of each isolate. */
export async function captureRuntimeEnv(): Promise<void> {
  if (runtimeEnvCache) return;
  try {
    const mod = (await import("cloudflare:workers")) as { env?: Env };
    const captured = { ...(mod.env as unknown as Env) };
    if (Object.keys(captured).length > 0) {
      runtimeEnvCache = captured;
    } else if (!warned) {
      warned = true;
      console.warn("[env] cloudflare:workers env resolved but empty — falling back to process.env/import.meta.env");
    }
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn("[env] cloudflare:workers import failed:", err);
    }
  }
  if (!runtimeEnvCache || !consoleUrlFrom(runtimeEnvCache)) {
    const fromProcess = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => typeof v === "string"),
    ) as Env;
    runtimeEnvCache = { ...fromProcess, ...(runtimeEnvCache ?? {}) };
  }
}

/** Merged env: build-time import.meta.env overlaid with captured runtime env. */
export function getEnv(): Env {
  return { ...(import.meta.env as Env), ...(runtimeEnvCache ?? {}) };
}

function consoleUrlFrom(env: Env): string | undefined {
  return env.CONSOLE_API_BASE_URL || env.CONSOLE_API_URL || undefined;
}

/** Console base URL under either historical variable name. */
export function consoleUrl(): string | undefined {
  return consoleUrlFrom(getEnv());
}

/** Storefront API key (same value under either naming scheme). */
export function consoleKey(): string | undefined {
  const env = getEnv();
  return env.CONSOLE_STOREFRONT_API_KEY || undefined;
}
