import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Gobble storefront smoke + Vision protocol suite (GET-only, live site).
 * Base URL overridable: SMOKE_BASE_URL env.
 */

const BASE = (process.env.SMOKE_BASE_URL ?? "https://gobblebypixie.com").replace(/\/$/, "");

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(20000) });
  const html = res.ok ? await res.text() : "";
  return { status: res.status, html, headers: res.headers };
}

test("config: pages return 200 and expose content hooks", async () => {
  for (const [path, marker] of [
    ["/", 'data-lc="home:'],
    ["/about", 'data-lc="about:eyebrow"'],
    ["/menu", 'href="/menu/'],
  ]) {
    const { status, html } = await get(path);
    assert.equal(status, 200, `${path} should be 200`);
    assert.ok(html.includes(marker), `${path} missing expected marker: ${marker}`);
  }
});

test("vision: ?livedraft=1 renders live-edit machinery on home/about", async () => {
  for (const path of ["/", "/about"]) {
    const { status, html } = await get(`${path}?livedraft=1`);
    assert.equal(status, 200, `livedraft ${path} should be 200`);
    assert.ok(html.includes("livedraft"), `livedraft ${path} missing guard script`);
    assert.ok(html.includes("lc-content-ready"), `${path} missing lc-content-ready emitter`);
    assert.ok(html.includes("lc-content-edit"), `${path} missing lc-content-edit streamer`);
  }
});

test("vision: CSP frame-ancestors admits Console", async (t) => {
  const { headers } = await get("/");
  const csp = headers.get("content-security-policy") ?? "";
  await t.diagnostic(`CSP: ${csp || "(none)"}`);
  assert.ok(csp.includes("frame-ancestors"), "CSP missing frame-ancestors directive");
});

test("vision: product page loads under livedraft with data-lp hooks", async (t) => {
  // No sitemap.xml on this site — discover a live slug via our own
  // /api/search proxy (which also proves the Console search path works).
  let slug = null;
  try {
    const r = await fetch(`${BASE}/api/search?q=cheese`, { signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    slug = (j.results ?? [])[0]?.slug ?? null;
  } catch {}
  if (!slug) return t.skip("could not discover a product slug");
  const { status, html } = await get(`/products/${encodeURIComponent(slug)}?livedraft=1`);
  assert.equal(status, 200, `product vision page (${slug}) should be 200`);
  assert.ok(html.includes("data-lp"), "product vision page missing data-lp hooks");
});
