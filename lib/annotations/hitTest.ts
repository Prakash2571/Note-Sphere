/**
 * lib/annotations/hitTest.ts
 *
 * Pure geometry helpers shared by text-intersection highlighting and the
 * eraser tool. Everything here operates on the same numeric shapes as
 * `coordinates.ts` (`NormRect` / `NormPoint`) and performs no I/O, which makes
 * it directly property-testable (Properties 11 and 12).
 *
 * Conventions:
 *  - Rectangles are axis-aligned and described by a top-left corner (x, y) plus
 *    width/height (w, h). Widths/heights are assumed non-negative.
 *  - "Intersection" means positive overlapping area: rectangles that merely
 *    touch along an edge (zero-area overlap) are NOT considered intersecting.
 */

import type { NormPoint, NormRect } from "./coordinates";
import type { AnnotationDTO } from "./serialize";

/**
 * True when two rectangles overlap with positive area. Rectangles that only
 * share an edge or corner (zero-area overlap) return false.
 */
export function rectsIntersect(a: NormRect, b: NormRect): boolean {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);

  return right > left && bottom > top;
}

/**
 * Geometric intersection of two rectangles. Returns a zero-area rect
 * (`w === 0 || h === 0`) when the rectangles are disjoint (Property 12).
 */
export function intersectRect(a: NormRect, b: NormRect): NormRect {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);

  const w = right - left;
  const h = bottom - top;

  if (w <= 0 || h <= 0) {
    return { x: left, y: top, w: 0, h: 0 };
  }

  return { x: left, y: top, w, h };
}

/**
 * True when point `p` lies within rect `r`, inclusive of the rectangle edges.
 */
export function pointInRect(p: NormPoint, r: NormRect): boolean {
  return (
    p.x >= r.x &&
    p.x <= r.x + r.w &&
    p.y >= r.y &&
    p.y <= r.y + r.h
  );
}

/**
 * True when point `p` lies within `tolerance` of the segment `a → b`.
 *
 * Computes the distance from the point to the finite line segment (projection
 * clamped to the segment endpoints) and compares it to `tolerance`. When the
 * segment is degenerate (`a === b`) this reduces to the distance from `p` to
 * that single point.
 */
export function pointNearSegment(
  p: NormPoint,
  a: NormPoint,
  b: NormPoint,
  tolerance: number
): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    // Projection parameter of p onto the segment, clamped to [0, 1].
    t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }

  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;
  const distSq =
    (p.x - closestX) * (p.x - closestX) + (p.y - closestY) * (p.y - closestY);

  return distSq <= tolerance * tolerance;
}

/**
 * Tool-level hit test used by the eraser.
 *
 *  - highlight: true when `point` is inside ANY of the annotation's rects.
 *  - scribble:  true when `point` is within slack of ANY consecutive segment of
 *               the annotation's points, where slack = `tolerance` plus a
 *               half-stroke-width term (`strokeWidth / 2`, normalized-ish) so
 *               thicker strokes are easier to hit.
 *
 * `tolerance` is treated as the base hit radius for both types. Annotations
 * with fewer than two points are matched as single points (each point is
 * treated as a degenerate segment).
 */
export function annotationHitByPoint(
  annotation: AnnotationDTO,
  point: NormPoint,
  tolerance: number
): boolean {
  if (annotation.type === "highlight") {
    const rects = annotation.rects ?? [];
    for (const r of rects) {
      if (pointInRect(point, r)) return true;
    }
    return false;
  }

  // Scribble: widen the base tolerance by half the stroke width so that thicker
  // strokes present a larger hit target. strokeWidth is a small pixel-ish
  // number; normalizing it precisely requires page dims we don't have here, so
  // we scale it down to a conservative normalized-space slack.
  const points = annotation.points ?? [];
  if (points.length === 0) return false;

  const strokeWidth = annotation.strokeWidth ?? 0;
  const slack = tolerance + strokeWidth / 2 / 1000;

  if (points.length === 1) {
    return pointNearSegment(point, points[0], points[0], slack);
  }

  for (let i = 0; i < points.length - 1; i++) {
    if (pointNearSegment(point, points[i], points[i + 1], slack)) {
      return true;
    }
  }

  return false;
}
