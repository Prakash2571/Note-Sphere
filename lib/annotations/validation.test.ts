import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateAnnotationInput,
  PALETTE,
  isNormalized,
  isValidPage,
  isPaletteColor,
} from "./validation";

const normArb = fc.double({ min: 0, max: 1, noNaN: true });
const rectArb = fc.record({
  x: normArb,
  y: normArb,
  w: normArb,
  h: normArb,
});
const pointArb = fc.record({ x: normArb, y: normArb });
const colorArb = fc.constantFrom(...PALETTE);

const PAGE_COUNT = 50;

const validHighlightArb = fc.record({
  type: fc.constant("highlight" as const),
  pageNumber: fc.integer({ min: 1, max: PAGE_COUNT }),
  color: colorArb,
  rects: fc.array(rectArb, { minLength: 1, maxLength: 10 }),
});

const validScribbleArb = fc.record({
  type: fc.constant("scribble" as const),
  pageNumber: fc.integer({ min: 1, max: PAGE_COUNT }),
  color: colorArb,
  points: fc.array(pointArb, { minLength: 2, maxLength: 50 }),
  strokeWidth: fc.integer({ min: 1, max: 20 }),
});

describe("validateAnnotationInput", () => {
  // Feature: pdf-annotations, Property 4: Input validation soundness
  it("accepts valid inputs", () => {
    fc.assert(
      fc.property(fc.oneof(validHighlightArb, validScribbleArb), (input) => {
        expect(validateAnnotationInput(input, PAGE_COUNT).ok).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: pdf-annotations, Property 4: Input validation soundness
  it("rejects out-of-range / non-numeric coordinates", () => {
    fc.assert(
      fc.property(
        validHighlightArb,
        fc.oneof(
          fc.double({ min: 1.0001, max: 100, noNaN: true }),
          fc.double({ min: -100, max: -0.0001, noNaN: true }),
          fc.constant(Number.NaN),
          fc.constant(undefined as unknown as number)
        ),
        (input, badCoord) => {
          const mutated = {
            ...input,
            rects: [{ ...input.rects[0], x: badCoord }, ...input.rects.slice(1)],
          };
          expect(validateAnnotationInput(mutated, PAGE_COUNT).ok).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: pdf-annotations, Property 4: Input validation soundness
  it("rejects non-integer / out-of-range page numbers", () => {
    fc.assert(
      fc.property(
        validScribbleArb,
        fc.oneof(
          fc.double({ min: 0.01, max: 0.99, noNaN: true }),
          fc.integer({ min: PAGE_COUNT + 1, max: PAGE_COUNT + 1000 }),
          fc.integer({ min: -100, max: 0 })
        ),
        (input, badPage) => {
          const mutated = { ...input, pageNumber: badPage };
          expect(validateAnnotationInput(mutated, PAGE_COUNT).ok).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: pdf-annotations, Property 4: Input validation soundness
  it("rejects non-palette colors", () => {
    fc.assert(
      fc.property(
        validHighlightArb,
        fc
          .string()
          .filter((s) => !(PALETTE as readonly string[]).includes(s)),
        (input, badColor) => {
          const mutated = { ...input, color: badColor };
          expect(validateAnnotationInput(mutated, PAGE_COUNT).ok).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("predicates behave correctly on edge values", () => {
    expect(isNormalized(0)).toBe(true);
    expect(isNormalized(1)).toBe(true);
    expect(isNormalized(1.5)).toBe(false);
    expect(isNormalized(Number.NaN)).toBe(false);
    expect(isNormalized("0.5")).toBe(false);
    expect(isValidPage(1, 10)).toBe(true);
    expect(isValidPage(11, 10)).toBe(false);
    expect(isValidPage(1.5, 10)).toBe(false);
    expect(isPaletteColor(PALETTE[0])).toBe(true);
    expect(isPaletteColor("#000000")).toBe(false);
  });

  it("palette has at least 6 distinct colors", () => {
    expect(new Set(PALETTE).size).toBeGreaterThanOrEqual(6);
  });
});
