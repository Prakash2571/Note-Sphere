import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  toNormalizedPoint,
  toNormalizedRect,
  toPixelPoint,
  clamp01,
  type PageDims,
} from "./coordinates";

const scaleArb = fc.double({ min: 0.6, max: 2.5, noNaN: true });
const dimArb = fc.double({ min: 50, max: 2000, noNaN: true });

describe("coordinates", () => {
  // Feature: pdf-annotations, Property 2: Coordinate mapping is an exact, scale-independent inverse
  it("normalize->pixel reproduces the location scaled by the scale ratio (within 1px)", () => {
    fc.assert(
      fc.property(
        dimArb,
        dimArb,
        scaleArb,
        scaleArb,
        (uw, uh, scaleA, scaleB) => {
          // A pixel coordinate captured at scaleA within page bounds.
          const px = uw * scaleA * 0.37;
          const py = uh * scaleA * 0.62;

          const dimsA: PageDims = {
            unscaledWidth: uw,
            unscaledHeight: uh,
            scale: scaleA,
          };
          const dimsB: PageDims = {
            unscaledWidth: uw,
            unscaledHeight: uh,
            scale: scaleB,
          };

          const norm = toNormalizedPoint(px, py, dimsA);
          const back = toPixelPoint(norm, dimsB);

          // Re-rendered at scaleB it should be px * (scaleB/scaleA).
          const ratio = scaleB / scaleA;
          expect(Math.abs(back.x - px * ratio)).toBeLessThanOrEqual(1);
          expect(Math.abs(back.y - py * ratio)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: pdf-annotations, Property 3: Normalization always yields in-range coordinates
  it("normalizing an in-bounds pixel coordinate yields components in [0,1]", () => {
    fc.assert(
      fc.property(
        dimArb,
        dimArb,
        scaleArb,
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (uw, uh, scale, fx, fy) => {
          const dims: PageDims = {
            unscaledWidth: uw,
            unscaledHeight: uh,
            scale,
          };
          const px = uw * scale * fx;
          const py = uh * scale * fy;
          const n = toNormalizedPoint(px, py, dims);
          expect(n.x).toBeGreaterThanOrEqual(0);
          expect(n.x).toBeLessThanOrEqual(1);
          expect(n.y).toBeGreaterThanOrEqual(0);
          expect(n.y).toBeLessThanOrEqual(1);

          const r = toNormalizedRect(px, py, 0, 0, dims);
          for (const v of [r.x, r.y, r.w, r.h]) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("clamp01 always returns a value in [0,1]", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (n) => {
        const c = clamp01(n);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});
