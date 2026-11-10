import type { APIRoute } from "astro";
import { stockAlert } from "../../lib/auth-customer";

export const prerender = false;

// "Notify me when back" — guest-allowed. Console dedupes per contact +
// product and the cron notifies on restock by email and, where the store can
// send one, by WhatsApp.
//
// **THE `kind` KEY** (not `type`). This route used to post
// `type: "back-in-stock"` while Console's route only ever read `kind` — so
// every ask from this storefront was refused with a 400 and never reached
// the database. Console now also accepts `type` as a legacy alias, but the
// canonical key is `kind` and this storefront sends it.
//
// An email OR a phone is enough. The phone must be a full international
// number ("+919876543210") — a bare number carries no country code, so the
// store would have to guess one.

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = String(body?.phone ?? "").trim();
  const productId = String(body?.productId ?? "").trim();
  const emailOk = email !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // E.164 only: the country code is explicit, never guessed.
  const phoneOk = /^\+[1-9]\d{6,14}$/.test(phone);
  if (!emailOk && !phoneOk)
    return new Response(
      JSON.stringify({ error: "Enter a valid email address or a phone number with a country code." }),
      { status: 400 },
    );
  if (!productId) return new Response(JSON.stringify({ error: "Missing product." }), { status: 400 });
  const result = await stockAlert(emailOk ? email : "", phoneOk ? phone : "", productId);
  if (!result.ok)
    return new Response(JSON.stringify({ error: result.error ?? "Could not save your request." }), {
      status: result.status,
    });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
