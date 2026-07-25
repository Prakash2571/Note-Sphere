/**
 * lib/annotations/validation.ts
 *
 * Pure validation helpers for annotation create requests. Runs on the server
 * before persistence and names the offending field. The Mongoose schema provides
 * a defense-in-depth second layer.
 */

// >= 6 distinct, individually distinguishable predefined colors (Req 6.1)
export const PALETTE = [
  "#fde047", // yellow
  "#86efac", // green
  "#93c5fd", // blue
  "#f9a8d4", // pink
  "#fdba74", // orange
  "#d8b4fe", // purple
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** A finite number in the closed range [0, 1]. */
export function isNormalized(n: unknown): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
}

/** A whole number within [1, pageCount]. When pageCount is not a positive
 * integer (e.g. unknown page count), only the lower bound (>= 1) is enforced. */
export function isValidPage(p: unknown, pageCount: number): boolean {
  if (typeof p !== "number" || !Number.isInteger(p) || p < 1) return false;
  if (Number.isInteger(pageCount) && pageCount >= 1) {
    return p <= pageCount;
  }
  return true;
}

/** True when the value is exactly one of the predefined palette colors. */
export function isPaletteColor(c: unknown): c is PaletteColor {
  return typeof c === "string" && (PALETTE as readonly string[]).includes(c);
}

interface RawRect {
  x: unknown;
  y: unknown;
  w: unknown;
  h: unknown;
}

interface RawPoint {
  x: unknown;
  y: unknown;
}

/**
 * Validate a create request against Req 6.4/6.5 and 7.2-7.6.
 *
 * Accepts only when the type, page number, color, and every coordinate are
 * valid. Rejects (with a descriptive error) on any absent / non-numeric /
 * out-of-range coordinate, a non-integer or out-of-range page number, or a
 * non-palette color.
 */
export function validateAnnotationInput(
  input: unknown,
  pageCount: number
): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Request body must be an object" };
  }

  const a = input as Record<string, unknown>;

  // Type
  if (a.type !== "highlight" && a.type !== "scribble") {
    return { ok: false, error: "type must be 'highlight' or 'scribble'" };
  }

  // Page number (Req 7.4, 7.6)
  if (typeof a.pageNumber !== "number" || !Number.isInteger(a.pageNumber)) {
    return { ok: false, error: "pageNumber must be a whole number" };
  }
  if (!isValidPage(a.pageNumber, pageCount)) {
    return {
      ok: false,
      error: `pageNumber must be within 1..${
        Number.isInteger(pageCount) && pageCount >= 1 ? pageCount : "pageCount"
      }`,
    };
  }

  // Color (Req 6.4, 6.5)
  if (!isPaletteColor(a.color)) {
    return { ok: false, error: "color must be one of the predefined palette values" };
  }

  if (a.type === "highlight") {
    const rects = a.rects;
    if (!Array.isArray(rects) || rects.length < 1) {
      return { ok: false, error: "highlight requires at least one rect" };
    }
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i] as RawRect;
      if (typeof r !== "object" || r === null) {
        return { ok: false, error: `rect[${i}] must be an object` };
      }
      for (const key of ["x", "y", "w", "h"] as const) {
        if (!isNormalized(r[key])) {
          return {
            ok: false,
            error: `rect[${i}].${key} must be a number in [0, 1]`,
          };
        }
      }
    }
    return { ok: true };
  }

  // scribble
  const points = a.points;
  if (!Array.isArray(points) || points.length < 2) {
    return { ok: false, error: "scribble requires at least 2 points" };
  }
  if (points.length > 10000) {
    return { ok: false, error: "scribble cannot exceed 10000 points" };
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as RawPoint;
    if (typeof p !== "object" || p === null) {
      return { ok: false, error: `point[${i}] must be an object` };
    }
    for (const key of ["x", "y"] as const) {
      if (!isNormalized(p[key])) {
        return {
          ok: false,
          error: `point[${i}].${key} must be a number in [0, 1]`,
        };
      }
    }
  }

  // strokeWidth (Req 4.1): 1..20 px
  if (
    typeof a.strokeWidth !== "number" ||
    !Number.isFinite(a.strokeWidth) ||
    a.strokeWidth < 1 ||
    a.strokeWidth > 20
  ) {
    return { ok: false, error: "strokeWidth must be a number between 1 and 20" };
  }

  return { ok: true };
}
