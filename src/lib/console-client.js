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

/**
 * Homepage sections composed in Console (Settings → Content → Homepage
 * sections). Visible rows only; empty array = storefront keeps its
 * built-in layout.
 */
export async function fetchSiteSections() {
  const base = import.meta.env.CONSOLE_API_URL;
  const key = import.meta.env.CONSOLE_STOREFRONT_API_KEY;
  if (!base || !key) return [];
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/public/site-sections`, {
      headers: { 'X-Storefront-Api-Key': key },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sections ?? [];
  } catch {
    return [];
  }
}
