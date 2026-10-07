/**
 * Shopper session: Console's session token in our own httpOnly cookie.
 *
 * The Apps Script era kept the token in localStorage (`gbp_auth`), readable
 * by any script on the page. The token now lives where client JS cannot reach
 * it; the browser sends it automatically and the `/api/account/*` proxies
 * forward it as `X-Customer-Session-Token`.
 */
import { getCurrentCustomer } from "./auth-customer";

export const SESSION_COOKIE = "gbp_session";

// 30 days, matching Linear Console's stated session-token expiry.
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function getSessionCustomer(cookies: {
  get(name: string): { value?: string } | undefined;
}) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await getCurrentCustomer(token);
  if (!result.ok) return null;
  return result.data.customer;
}
