// Per-tenant storefront settings from Linear Console's public store-config API
// (`/api/public/store-config`) — the estate standard (Mane/TCS shape).
// WhatsApp is Business-only with no hardcoded fallback (owner 2026-11-09):
// blank/malformed resolves to null and every guard hides its link.
import { fetchFromConsole } from './console-client.js';

/** Group digits the way Indian phone numbers are read ("+91 86905 46755"). */
export function formatWhatsappDisplay(digits) {
  if (/^91\d{10}$/.test(digits)) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}

/**
 * Pure resolution: store-config payload → Business WhatsApp values.
 * Never throws. No fallback: blank/malformed resolves to null.
 */
export function resolveStoreConfig(cfg) {
  const raw = typeof cfg?.whatsappNumber === 'string' ? cfg.whatsappNumber.trim() : '';
  const digits = /^\d{10,15}$/.test(raw) ? raw : null;
  return {
    whatsappDigits: digits,
    whatsappHref: digits ? `https://wa.me/${digits}` : null,
    whatsappDisplay: digits ? formatWhatsappDisplay(digits) : null,
    /**
     * Free-shipping threshold (Console Settings → Business), null when
     * unset. Drives the cart drawer's "₹X away from free shipping" nudge
     * (added 2026-11-10, the estate pattern — nanoliss progress bar, mane
     * message).
     */
    freeShippingThreshold:
      typeof cfg?.freeShippingThreshold === 'number' && cfg.freeShippingThreshold > 0
        ? cfg.freeShippingThreshold
        : null,
  };
}

export async function getStoreConfig() {
  const cfg = await fetchFromConsole('/api/public/store-config');
  return resolveStoreConfig(cfg);
}
