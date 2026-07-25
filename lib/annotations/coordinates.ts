/**
 * lib/annotations/coordinates.ts
 *
 * Pure coordinate conversion helpers — the heart of zoom-independence.
 *
 * Annotations are persisted as Normalized_Coordinates: fractions in [0, 1]
 * relative to the *unscaled* page dimensions. Because the stored value is
 * scale-independent, a single stored coordinate renders correctly at every
 * zoom level by multiplying back through `unscaledWidth * scale`.
 *
 * `toNormalized*` and `toPixel*` are exact inverses at a fixed scale (modulo
 * floating-point), which underpins the coordinate-mapping correctness property.
 */

export interface NormPoint {
  x: number; // [0, 1]
  y: number; // [0, 1]
}

export interface NormRect {
  x: number; // [0, 1]
  y: number; // [0, 1]
  w: number; // [0, 1]
  h: number; // [0, 1]
}

export interface PageDims {
  unscaledWidth: number;
  unscaledHeight: number;
  scale: number;
}

/** Clamp a number into the [0, 1] range. */
export function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * pixel (relative to page top-left, at the current scale) -> normalized [0, 1]
 */
export function toNormalizedPoint(
  px: number,
  py: number,
  d: PageDims
): NormPoint {
  const w = d.unscaledWidth * d.scale;
  const h = d.unscaledHeight * d.scale;

  return {
    x: clamp01(w === 0 ? 0 : px / w),
    y: clamp01(h === 0 ? 0 : py / h),
  };
}

/**
 * pixel rect (relative to page top-left, at the current scale) -> normalized [0, 1]
 */
export function toNormalizedRect(
  px: number,
  py: number,
  pw: number,
  ph: number,
  d: PageDims
): NormRect {
  const w = d.unscaledWidth * d.scale;
  const h = d.unscaledHeight * d.scale;

  return {
    x: clamp01(w === 0 ? 0 : px / w),
    y: clamp01(h === 0 ? 0 : py / h),
    w: clamp01(w === 0 ? 0 : pw / w),
    h: clamp01(h === 0 ? 0 : ph / h),
  };
}

/**
 * normalized [0, 1] -> pixel at the current scale (inverse of toNormalizedPoint)
 */
export function toPixelPoint(
  n: NormPoint,
  d: PageDims
): { x: number; y: number } {
  return {
    x: n.x * d.unscaledWidth * d.scale,
    y: n.y * d.unscaledHeight * d.scale,
  };
}

/**
 * normalized [0, 1] -> pixel rect at the current scale (inverse of toNormalizedRect)
 */
export function toPixelRect(
  n: NormRect,
  d: PageDims
): { x: number; y: number; w: number; h: number } {
  return {
    x: n.x * d.unscaledWidth * d.scale,
    y: n.y * d.unscaledHeight * d.scale,
    w: n.w * d.unscaledWidth * d.scale,
    h: n.h * d.unscaledHeight * d.scale,
  };
}
