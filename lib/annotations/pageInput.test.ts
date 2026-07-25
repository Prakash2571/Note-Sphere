import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseJumpInput } from "./pageInput";

describe("parseJumpInput", () => {
  // Feature: pdf-annotations, Property 8: Jump-to-page input is classified totally and correctly
  it("accepts whole numbers within [1, totalPages]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (total, page) => {
          const clampedPage = ((page - 1) % total) + 1; // guarantee in-range
          const res = parseJumpInput(String(clampedPage), total);
          expect(res).toEqual({ ok: true, page: clampedPage });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: pdf-annotations, Property 8: Jump-to-page input is classified totally and correctly
  it("classifies whole numbers outside range as out-of-range", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1001, max: 100000 }),
        (total, page) => {
          const res = parseJumpInput(String(page), total);
          expect(res).toEqual({ ok: false, reason: "out-of-range" });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: pdf-annotations, Property 8: Jump-to-page input is classified totally and correctly
  it("classifies decimals / non-numeric / empty as not-integer", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.oneof(
          fc.constant(""),
          fc.constant("   "),
          fc.constant("1.5"),
          fc.constant("abc"),
          fc.constant("1e2"),
          fc.constant("1.0"),
          fc.constant("--3")
        ),
        (total, raw) => {
          const res = parseJumpInput(raw, total);
          expect(res).toEqual({ ok: false, reason: "not-integer" });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("handles surrounding whitespace on valid integers", () => {
    expect(parseJumpInput("  5  ", 10)).toEqual({ ok: true, page: 5 });
  });
});
