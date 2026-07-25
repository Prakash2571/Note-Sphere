/**
 * lib/annotations/serialize.ts
 *
 * Pure serialize/deserialize between the in-memory Annotation domain object and
 * the plain-JSON wire/persisted form. These are exact inverses for all valid
 * annotations (numbers pass through unchanged), backing the round-trip property.
 */

import type { NormPoint, NormRect } from "./coordinates";
import type { PaletteColor } from "./validation";

export type AnnotationType = "highlight" | "scribble";

/** In-memory domain object. */
export interface Annotation {
  type: AnnotationType;
  pageNumber: number;
  color: PaletteColor;
  rects: NormRect[];
  points: NormPoint[];
  strokeWidth?: number;
}

/** Body accepted by POST /api/notes/:id/annotations. */
export interface CreateAnnotationInput {
  type: AnnotationType;
  pageNumber: number;
  color: string;
  rects?: NormRect[];
  points?: NormPoint[];
  strokeWidth?: number;
}

/** Wire / persisted shape returned by the service (create input + server fields). */
export interface AnnotationDTO extends CreateAnnotationInput {
  _id: string;
  noteId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Domain object -> plain JSON create form. Preserves the count and order of
 * every coordinate point and passes numbers through unchanged.
 */
export function serializeAnnotation(a: Annotation): CreateAnnotationInput {
  const out: CreateAnnotationInput = {
    type: a.type,
    pageNumber: a.pageNumber,
    color: a.color,
  };

  if (a.type === "highlight") {
    out.rects = a.rects.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
  } else {
    out.points = a.points.map((p) => ({ x: p.x, y: p.y }));
    if (a.strokeWidth !== undefined) out.strokeWidth = a.strokeWidth;
  }

  return out;
}

/**
 * Plain JSON create/persisted form -> domain object. Exact inverse of
 * serializeAnnotation for valid annotations.
 */
export function deserializeAnnotation(dto: CreateAnnotationInput): Annotation {
  const a: Annotation = {
    type: dto.type,
    pageNumber: dto.pageNumber,
    color: dto.color as PaletteColor,
    rects: (dto.rects ?? []).map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h })),
    points: (dto.points ?? []).map((p) => ({ x: p.x, y: p.y })),
  };

  if (dto.strokeWidth !== undefined) a.strokeWidth = dto.strokeWidth;

  return a;
}
