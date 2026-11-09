import type { APIRoute } from "astro";
import { getReferral } from "../../../lib/auth-customer";
import { SESSION_COOKIE } from "../../../lib/auth-session";

export const prerender = false;

// Referral code + stats — zeroed shape on signed-out/failed loads so the
// Rewards tab renders an empty state, never an error.

const ZERO = { referralCode: null, shareUrl: null, rewardsEarned: 0, referredCount: 0 };

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return new Response(JSON.stringify(ZERO), { status: 200 });
  const result = await getReferral(token);
  if (!result.ok) return new Response(JSON.stringify(ZERO), { status: 200 });
  return new Response(JSON.stringify(result.data), { status: 200, headers: { "Cache-Control": "no-store" } });
};
