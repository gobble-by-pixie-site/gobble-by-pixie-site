/**
 * Minimal Console collections fetch (storefront key stays server-side).
 */
export async function fetchFromConsoleCollections() {
  const base = import.meta.env.CONSOLE_API_URL;
  const key = import.meta.env.CONSOLE_STOREFRONT_API_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/public/collections`, {
      headers: { 'X-Storefront-Api-Key': key },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
