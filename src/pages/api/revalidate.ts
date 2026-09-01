import type { APIRoute } from "astro";

interface RevalidatePayload {
  paths: string[];
  timestamp: number;
  signature: string;
}

const SHARED_SECRET = process.env.REVALIDATE_SECRET || import.meta.env.REVALIDATE_SECRET;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || import.meta.env.CF_ACCOUNT_ID;
const CF_ZONE_ID = process.env.CF_ZONE_ID || import.meta.env.CF_ZONE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN || import.meta.env.CF_API_TOKEN;

async function verifySignature(payload: RevalidatePayload): Promise<boolean> {
  if (!SHARED_SECRET) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SHARED_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const data = `${payload.paths.sort().join(",")}|${payload.timestamp}`;
  const sigBuffer = new Uint8Array(Buffer.from(payload.signature, "hex"));
  return crypto.subtle.verify("HMAC", key, sigBuffer, encoder.encode(data));
}

async function purgeCloudflareCache(paths: string[]): Promise<boolean> {
  if (!CF_ACCOUNT_ID || !CF_ZONE_ID || !CF_API_TOKEN) {
    console.error("[revalidate] Missing Cloudflare credentials");
    return false;
  }

  const urls = paths.map((p) => `https://gobblebypixie.com${p.startsWith("/") ? p : "/" + p}`);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      console.error("[revalidate] Cloudflare purge failed:", result.errors);
      return false;
    }
    console.log("[revalidate] Purged:", urls);
    return true;
  } catch (err) {
    console.error("[revalidate] Purge error:", err);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("content-type") !== "application/json") {
    return new Response(JSON.stringify({ error: "Invalid content type" }), { status: 400 });
  }

  let payload: RevalidatePayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (!payload.paths?.length || !payload.timestamp || !payload.signature) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  if (Date.now() - payload.timestamp > 5 * 60 * 1000) {
    return new Response(JSON.stringify({ error: "Request expired" }), { status: 401 });
  }

  const valid = await verifySignature(payload);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  const success = await purgeCloudflareCache(payload.paths);
  if (!success) {
    return new Response(JSON.stringify({ error: "Purge failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, purged: payload.paths }), { status: 200 });
};