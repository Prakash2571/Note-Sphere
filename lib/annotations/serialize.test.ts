import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  serializeAnnotation,
  deserializeAnnotation,
  type Annotation,
} from "./serialize";
import { PALETTE } from "./validation";

const normArb = fc.double({ min: 0, max: 1, noNaN: true });
const colorArb = fc.constantFrom(...PALETTE);

const highlightArb: fc.Arbitrary<Annotation> = fc.record({
  type: fc.constant("highlight" as const),
  pageNumber: fc.integer({ min: 1, max: 500 }),
  color: colorArb,
  rects: fc.array(
    fc.record({ x: normArb, y: normArb, w: normArb, h: normArb }),
    { minLength: 1, maxLength: 20 }
  ),
  points: fc.constant([]),
});

const scribbleArb: fc.Arbitrary<Annotation> = fc.record({
  type: fc.constant("scribble" as const),
  pageNumber: fc.integer({ min: 1, max: 500 }),
  color: colorArb,
  rects: fc.constant([]),
  points: fc.array(fc.record({ x: normArb, y: normArb }), {
    minLength: 2,
    maxLength: 200,
  }),
  strokeWidth: fc.integer({ min: 1, max: 20 }),
});

describe("serialize round-trip", () => {
  // Feature: pdf-annotations, Property 1: Serialization round-trip preserves annotations
  it("deserialize(serialize(a)) preserves type, page, color, and coordinates", () => {
    fc.assert(
      fc.property(fc.oneof(highlightArb, scribbleArb), (a) => {
        const round = deserializeAnnotation(serializeAnnotation(a));

        expect(round.type).toBe(a.type);
        expect(round.pageNumber).toBe(a.pageNumber);
        expect(round.color).toBe(a.color);

        expect(round.rects.length).toBe(a.rects.length);
        a.rects.forEach((r, i) => {
          expect(Math.abs(round.rects[i].x - r.x)).toBeLessThanOrEqual(1e-6);
          expect(Math.abs(round.rects[i].y - r.y)).toBeLessThanOrEqual(1e-6);
          expect(Math.abs(round.rects[i].w - r.w)).toBeLessThanOrEqual(1e-6);
          expect(Math.abs(round.rects[i].h - r.h)).toBeLessThanOrEqual(1e-6);
        });

        expect(round.points.length).toBe(a.points.length);
        a.points.forEach((p, i) => {
          expect(Math.abs(round.points[i].x - p.x)).toBeLessThanOrEqual(1e-6);
          expect(Math.abs(round.points[i].y - p.y)).toBeLessThanOrEqual(1e-6);
        });

        if (a.type === "scribble") {
          expect(round.strokeWidth).toBe(a.strokeWidth);
        }
      }),
      { numRuns: 100 }
    );
  });
});
