/**
 * lib/annotations/pageInput.ts
 *
 * Pure parser for the jump-to-page input. Classifies every possible input
 * string totally and correctly (Req 5.1-5.3).
 */

export type JumpResult =
  | { ok: true; page: number }
  | { ok: false; reason: "not-integer" | "out-of-range" };

/**
 * Accept only whole numbers within [1, totalPages]; classify failures.
 *
 * - Whole number in range           -> { ok: true, page }
 * - Whole number outside range      -> { ok: false, reason: "out-of-range" }
 * - Decimal / non-numeric / empty / whitespace -> { ok: false, reason: "not-integer" }
 */
export function parseJumpInput(raw: string, totalPages: number): JumpResult {
  const trimmed = raw.trim();

  // Empty or whitespace-only.
  if (trimmed === "") {
    return { ok: false, reason: "not-integer" };
  }

  // Only an optional leading sign followed by digits is a whole number.
  // This rejects decimals ("1.5"), exponents ("1e2"), and any non-numeric text.
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return { ok: false, reason: "not-integer" };
  }

  const page = Number(trimmed);

  if (!Number.isInteger(page)) {
    return { ok: false, reason: "not-integer" };
  }

  if (page < 1 || page > totalPages) {
    return { ok: false, reason: "out-of-range" };
  }

  return { ok: true, page };
}
