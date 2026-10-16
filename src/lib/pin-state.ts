/**
 * Indian PIN code → state / state code.
 *
 * ## Why this exists
 *
 * Console decides intra- vs inter-state GST from the SHIPPING state:
 * `interState = !!tenant?.homeState && !!shipToState && homeState !== shipToState`
 * (`src/lib/orders.ts`). With no state, that check can never be true, so every
 * order is invoiced intra-state — CGST+SGST where IGST was owed. That is a
 * wrong tax invoice, not a cosmetic difference, and it is the only way to get
 * the state right without asking every customer for a dropdown they cannot be
 * expected to know.
 *
 * ## Why a table and not an API
 *
 * An API call at checkout adds an external dependency to the one flow that must
 * never fail, and a slow or rate-limited response would block a paying
 * customer. The table is static, offline, and deterministic. It is keyed on the
 * PIN's leading 3 digits, which is exactly how India allocates PIN zones — the
 * first digit is the zone, and the first three identify the circle/division
 * that maps 1:1 to a state.
 *
 * ## Coverage and the honest gap
 *
 * The 79x zone is shared by six states, so it is listed per-prefix: 790-792
 * Arunachal Pradesh, 793-794 Meghalaya, 795 Manipur, 796 Mizoram, 797-798
 * Nagaland, 799 Tripura. Where a prefix cannot isolate a state at 3 digits —
 * Lakshadweep's 682xxx sits inside Kerala's 682 block — the lookup resolves
 * to the larger state rather than inventing one.
 *
 * The remaining limitation is real and worth stating rather than hiding: a
 * customer always gets to CORRECT the derived state before submitting, because
 * a handful of PIN codes sit near a state border. The form shows the derived
 * value in a select, not a readonly label.
 */

/** state name -> (GST state code, PIN prefixes). */
const ZONES: Array<{ state: string; code: string; prefixes: string[] }> = [
  { state: "Andaman and Nicobar Islands", code: "35", prefixes: ["744"] },
  { state: "Andhra Pradesh", code: "37", prefixes: ["515", "516", "517", "518", "519", "521", "522", "523", "524"] },
  { state: "Arunachal Pradesh", code: "12", prefixes: ["790", "791", "792"] },
  { state: "Assam", code: "18", prefixes: ["78"] },
  { state: "Bihar", code: "10", prefixes: ["80", "81", "82", "83", "84", "85"] },
  { state: "Chandigarh", code: "04", prefixes: ["160"] },
  { state: "Chhattisgarh", code: "22", prefixes: ["49", "493", "494", "495", "496", "497"] },
  { state: "Dadra and Nagar Haveli and Daman and Diu", code: "26", prefixes: ["396"] },
  { state: "Delhi", code: "07", prefixes: ["110"] },
  { state: "Goa", code: "30", prefixes: ["403"] },
  { state: "Gujarat", code: "24", prefixes: ["360", "361", "362", "363", "364", "365", "366", "367", "368", "369", "370", "371", "372", "373", "374", "375", "376", "377", "378", "379", "380", "381", "382", "383", "384", "385", "386", "387", "388", "389", "390", "391", "392", "393", "394", "395"] },
  { state: "Haryana", code: "06", prefixes: ["121", "122", "123", "124", "125", "126", "127", "128", "129", "130", "131", "132", "133", "134", "135"] },
  { state: "Himachal Pradesh", code: "02", prefixes: ["171", "172", "173", "174", "175", "176", "177", "178", "179"] },
  { state: "Jammu and Kashmir", code: "01", prefixes: ["180", "181", "182", "183", "184", "185", "186", "187", "188", "189", "190", "191", "192", "193"] },
  { state: "Jharkhand", code: "20", prefixes: ["825", "826", "827", "828", "829", "830", "831", "832", "833", "834", "835"] },
  { state: "Karnataka", code: "29", prefixes: ["56", "57"] },
  { state: "Kerala", code: "32", prefixes: ["67", "68", "69", "691", "692", "693", "694", "695", "696", "697", "698", "699"] },
  { state: "Ladakh", code: "38", prefixes: ["194"] },
  { state: "Madhya Pradesh", code: "23", prefixes: ["45", "452", "453", "454", "455", "456", "457", "458", "459", "460", "461", "462", "463", "464", "465", "466", "467", "468", "469", "470", "471", "472", "473", "474", "475", "476", "477", "478", "479", "480", "481", "482", "483", "484", "485", "486", "487", "488"] },
  { state: "Maharashtra", code: "27", prefixes: ["40", "41", "42", "43", "44"] },
  { state: "Manipur", code: "14", prefixes: ["795"] },
  { state: "Meghalaya", code: "17", prefixes: ["793", "794"] },
  { state: "Mizoram", code: "15", prefixes: ["796"] },
  { state: "Nagaland", code: "13", prefixes: ["797", "798"] },
  { state: "Sikkim", code: "11", prefixes: ["737"] },
  { state: "Odisha", code: "21", prefixes: ["751", "752", "753", "754", "755", "756", "757", "758", "759"] },
  { state: "Puducherry", code: "34", prefixes: ["605", "609"] },
  { state: "Punjab", code: "03", prefixes: ["140", "141", "142", "143", "144", "145", "146", "147", "148"] },
  { state: "Rajasthan", code: "08", prefixes: ["30", "31", "32", "33", "34"] },
  { state: "Tamil Nadu", code: "33", prefixes: ["600", "601", "602", "603", "604", "606", "607", "608", "610", "611", "612", "613", "614", "615", "616", "617", "618", "619", "620", "621", "622", "623", "624", "625", "626", "627", "628", "629"] },
  { state: "Telangana", code: "36", prefixes: ["500", "501", "502", "503", "504", "505", "506", "507", "508", "509"] },
  { state: "Tripura", code: "16", prefixes: ["799"] },
  { state: "Uttar Pradesh", code: "09", prefixes: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29"] },
  { state: "Uttarakhand", code: "05", prefixes: ["246", "247", "248", "249"] },
  { state: "West Bengal", code: "19", prefixes: ["70", "71", "72", "73", "74"] },
];

/**
 * Deduplicated, longest-prefix-first.
 *
 * Order matters: a 3-digit key can be a prefix of a 2-digit one ("40" and
 * "403"), so a naive loop that returns the first hit could map a Goa PIN to
 * Maharashtra. Sorting by descending key length guarantees "403" is tested
 * before "40", which is what makes the Goa/Karnataka/Maharashtra boundaries
 * come out right.
 */
const LOOKUP: Array<[string, { state: string; code: string }]> = (() => {
  const seen = new Set<string>();
  const rows: Array<[string, { state: string; code: string }]> = [];
  for (const z of ZONES) {
    for (const p of z.prefixes) {
      if (seen.has(p)) continue;
      seen.add(p);
      rows.push([p, { state: z.state, code: z.code }]);
    }
  }
  return rows.sort((a, b) => b[0].length - a[0].length);
})();

/**
 * The same table, exported so the inline copy in BaseLayout.astro can be
 * GENERATED from it rather than hand-maintained.
 *
 * That layout's script is a plain module script and cannot import, so the data
 * has to be embedded. Two hand-kept copies of a 130-row table is exactly how a
 * state silently drops out of one and not the other, and the failure is
 * invisible — a customer is just asked to pick their own state. The test
 * asserts the embedded block still matches this export, so editing ZONES
 * without regenerating fails the build rather than shipping quietly.
 */
export const PIN_PREFIXES: ReadonlyArray<readonly [string, { state: string; code: string }]> = LOOKUP;

/** For the "select, don't guess" rule: what the customer is offered. */
export const STATES: Array<{ state: string; code: string }> = (() => {
  const m = new Map<string, { state: string; code: string }>();
  for (const [, v] of LOOKUP) if (!m.has(v.state)) m.set(v.state, v);
  return [...m.values()].sort((a, b) => a.state.localeCompare(b.state));
})();

export type PinState = { state: string; stateCode: string };

/**
 * Resolve a 6-digit PIN to its state.
 *
 * Returns null for anything malformed or unknown rather than throwing, because
 * this runs inside checkout and a thrown error there is a failed order. The
 * caller decides what to do about an unresolved PIN — the form falls back to
 * asking, it never blocks the sale on a lookup miss.
 */
export function stateFromPincode(raw: string): PinState | null {
  // Find the PIN inside whatever the customer typed.
  //
  // Rules, in the order they matter:
  //  1. A bare 6-digit group is the PIN.            "400049"
  //  2. Groups of 2-5 digits that JOIN to six.      "400-049", "4000 49"
  //  3. A single long run is a phone number — take its LAST six, because that
  //     is where an Indian PIN sits.                 "+91 400049"
  //
  // Rule 3 is deliberately the last resort and takes the tail, not the head:
  // taking the FIRST six of a long run would invent a location, so "1234567"
  // would resolve to Haryana and the customer would be invoiced in the wrong
  // state. An unrelated 7-digit number is not a PIN and must not guess.
  const groups = String(raw ?? "")
    .replace(/[^\d]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let pin: string | undefined = groups.find((g) => g.length === 6);

  if (!pin) {
    const parts = groups.filter((g) => g.length >= 2 && g.length <= 5);
    if (parts.length > 1 && parts.join("").length === 6) {
      pin = parts.join("");
    } else if (parts.length === 1 && parts[0].length > 6) {
      pin = parts[0].slice(-6);
    }
  }
  if (!pin) return null;

  const hit = LOOKUP.find(([p]) => pin!.startsWith(p));
  if (!hit) return null;
  return { state: hit[1].state, stateCode: hit[1].code };
}