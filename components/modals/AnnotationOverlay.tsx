/**
 * components/modals/AnnotationOverlay.tsx
 *
 * Absolutely-positioned SVG layer rendered as a sibling of the react-pdf
 * <Page>, sized to the rendered page box (unscaledWidth * scale ×
 * unscaledHeight * scale). It renders the current page's annotations and
 * captures highlight/scribble/eraser input.
 *
 * Input is unified on Pointer Events so mouse, touch, and stylus behave
 * identically (Req 8.4). Any tool other than "none" is treated as an
 * interactive tool: the overlay captures the pointer stream and suppresses the
 * browser's default pan/pinch gestures (Req 8.1, 8.2). Highlighting is driven
 * by a pointer drag rather than native text selection (Req 8.3, 8.5, 1.1), and
 * the eraser removes individual annotations by hit-testing the pointer against
 * the current page's annotations (Req 9.1-9.4).
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  toPixelPoint,
  toPixelRect,
  toNormalizedPoint,
  toNormalizedRect,
  type NormPoint,
  type NormRect,
  type PageDims,
} from "@/lib/annotations/coordinates";
import {
  rectsIntersect,
  intersectRect,
  annotationHitByPoint,
} from "@/lib/annotations/hitTest";
import type { PaletteColor } from "@/lib/annotations/validation";
import type { Tool } from "@/lib/annotations/colorState";
import type { AnnotationDTO } from "@/lib/annotations/serialize";

export interface AnnotationOverlayProps {
  annotations: AnnotationDTO[]; // already filtered to currentPage
  pageNumber: number;
  scale: number;
  unscaledWidth: number; // from page.getViewport({ scale: 1 })
  unscaledHeight: number;
  tool: Tool;
  activeColor: PaletteColor;
  strokeWidth: number;
  onCreateHighlight: (rects: NormRect[]) => void;
  onCreateScribble: (points: NormPoint[]) => void;
  onErase?: (annotationId: string) => void;
}

const HIGHLIGHT_OPACITY = 0.4;
const HIGHLIGHT_PREVIEW_OPACITY = 0.2;
/** Base hit radius (in normalized units) for the eraser (Req 9.1, 9.3). */
const ERASER_TOLERANCE = 0.01;

/** A rectangle in page-pixel space, matching the {x,y,w,h} shape used by hitTest. */
interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function pointsEqual(a: NormPoint, b: NormPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

export function AnnotationOverlay({
  annotations,
  scale,
  unscaledWidth,
  unscaledHeight,
  tool,
  activeColor,
  strokeWidth,
  onCreateHighlight,
  onCreateScribble,
  onErase,
}: AnnotationOverlayProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Scribble gesture state.
  const drawingRef = useRef(false);
  const [livePoints, setLivePoints] = useState<NormPoint[]>([]);

  // Highlight drag gesture state. `dragStartRef` holds the gesture's origin in
  // page-pixel space; `highlightPreview` drives the live preview <rect>.
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [highlightPreview, setHighlightPreview] = useState<PixelRect | null>(
    null
  );

  // Eraser gesture state.
  const erasingRef = useRef(false);
  const erasedThisDrag = useRef<Set<string>>(new Set());

  const dims: PageDims = useMemo(() => ({
    unscaledWidth,
    unscaledHeight,
    scale,
  }), [unscaledWidth, unscaledHeight, scale]);

  const pixelWidth = unscaledWidth * scale;
  const pixelHeight = unscaledHeight * scale;

  const interactive = tool !== "none";

  // ── Coordinate helpers ──────────────────────────────────────────────────
  const pixelFromEvent = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } => {
      const box = svgRef.current?.getBoundingClientRect();
      return {
        x: box ? e.clientX - box.left : 0,
        y: box ? e.clientY - box.top : 0,
      };
    },
    []
  );

  const pointFromEvent = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): NormPoint => {
      const { x, y } = pixelFromEvent(e);
      return toNormalizedPoint(x, y, dims);
    },
    [pixelFromEvent, dims]
  );

  // ── Eraser (Req 9.1-9.4) ────────────────────────────────────────────────
  const eraseAt = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!onErase) return;
      const np = pointFromEvent(e);
      for (const a of annotations) {
        if (a._id.startsWith("temp-")) continue; // skip optimistic records
        if (erasedThisDrag.current.has(a._id)) continue; // dedupe per drag
        if (annotationHitByPoint(a, np, ERASER_TOLERANCE)) {
          erasedThisDrag.current.add(a._id);
          onErase(a._id);
        }
      }
      // No hit -> no-op (Req 9.4).
    },
    [annotations, onErase, pointFromEvent]
  );

  // ── Scribble commit (Req 4.6) ───────────────────────────────────────────
  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    setLivePoints((prev) => {
      // Reduce to distinct points; commit only when >= 2 distinct (Req 4.6).
      const distinct: NormPoint[] = [];
      for (const p of prev) {
        if (
          distinct.length === 0 ||
          !pointsEqual(distinct[distinct.length - 1], p)
        ) {
          distinct.push(p);
        }
      }
      const trulyDistinct = distinct.filter(
        (p, i, arr) => arr.findIndex((q) => pointsEqual(p, q)) === i
      );
      if (trulyDistinct.length >= 2) {
        onCreateScribble(distinct);
      }
      return [];
    });
  }, [onCreateScribble]);

  // ── Highlight commit via pointer drag (Req 8.3, 8.5, 1.1) ────────────────
  const finishHighlight = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const start = dragStartRef.current;
      dragStartRef.current = null;
      setHighlightPreview(null);
      if (!start) return;

      const end = pixelFromEvent(e);
      const dragX = Math.min(start.x, end.x);
      const dragY = Math.min(start.y, end.y);
      const dragW = Math.abs(end.x - start.x);
      const dragH = Math.abs(end.y - start.y);

      // Zero-area drag -> no-op (Req 8.5).
      if (dragW === 0 || dragH === 0) return;

      const dragRect: PixelRect = { x: dragX, y: dragY, w: dragW, h: dragH };

      const rects: NormRect[] = [];
      const pageBox = svgRef.current?.getBoundingClientRect();
      const spans = svgRef.current?.parentElement?.querySelectorAll(
        ".react-pdf__Page__textContent span"
      );

      if (pageBox && spans) {
        spans.forEach((span) => {
          const r = span.getBoundingClientRect();
          const spanRect: PixelRect = {
            x: r.left - pageBox.left,
            y: r.top - pageBox.top,
            w: r.width,
            h: r.height,
          };
          // rectsIntersect/intersectRect are pure arithmetic on {x,y,w,h}, so we
          // can run them directly in pixel space, then normalize the result.
          if (rectsIntersect(spanRect, dragRect)) {
            const clipped = intersectRect(spanRect, dragRect);
            if (clipped.w > 0 && clipped.h > 0) {
              rects.push(
                toNormalizedRect(clipped.x, clipped.y, clipped.w, clipped.h, dims)
              );
            }
          }
        });
      }

      if (rects.length > 0) {
        // Text-aware highlight: cover the selectable text within the drag.
        onCreateHighlight(rects);
      } else {
        // Fallback: no selectable text intersected -> highlight the region itself.
        onCreateHighlight([
          toNormalizedRect(dragX, dragY, dragW, dragH, dims),
        ]);
      }
    },
    [pixelFromEvent, dims, onCreateHighlight]
  );

  // ── Unified pointer handlers ────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;
      // Suppress default gestures and bind the pointer stream (Req 8.1, 8.4).
      e.preventDefault();
      svgRef.current?.setPointerCapture(e.pointerId);

      if (tool === "scribble") {
        drawingRef.current = true;
        setLivePoints([pointFromEvent(e)]);
        return;
      }

      if (tool === "highlight") {
        dragStartRef.current = pixelFromEvent(e);
        setHighlightPreview({ ...dragStartRef.current, w: 0, h: 0 });
        return;
      }

      if (tool === "eraser") {
        erasingRef.current = true;
        erasedThisDrag.current = new Set();
        eraseAt(e);
        return;
      }
    },
    [interactive, tool, pointFromEvent, pixelFromEvent, eraseAt]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;

      if (tool === "scribble") {
        if (!drawingRef.current) return;
        const next = pointFromEvent(e);
        setLivePoints((prev) => [...prev, next]);
        return;
      }

      if (tool === "highlight") {
        const start = dragStartRef.current;
        if (!start) return;
        const cur = pixelFromEvent(e);
        setHighlightPreview({
          x: Math.min(start.x, cur.x),
          y: Math.min(start.y, cur.y),
          w: Math.abs(cur.x - start.x),
          h: Math.abs(cur.y - start.y),
        });
        return;
      }

      if (tool === "eraser") {
        if (!erasingRef.current) return;
        eraseAt(e);
        return;
      }
    },
    [interactive, tool, pointFromEvent, pixelFromEvent, eraseAt]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;
      svgRef.current?.releasePointerCapture(e.pointerId);

      if (tool === "scribble") {
        finishStroke();
        return;
      }

      if (tool === "highlight") {
        finishHighlight(e);
        return;
      }

      if (tool === "eraser") {
        erasingRef.current = false;
        erasedThisDrag.current = new Set();
        return;
      }
    },
    [interactive, tool, finishStroke, finishHighlight]
  );

  // ── Rendering helpers ───────────────────────────────────────────────────
  function normPolyline(points: NormPoint[]): string {
    return points
      .map((p) => {
        const { x, y } = toPixelPoint(p, dims);
        return `${x},${y}`;
      })
      .join(" ");
  }

  let cursor = "default";
  if (tool === "scribble" || tool === "highlight") cursor = "crosshair";
  else if (tool === "eraser") cursor = "cell";

  return (
    <svg
      ref={svgRef}
      width={pixelWidth}
      height={pixelHeight}
      viewBox={`0 0 ${pixelWidth} ${pixelHeight}`}
      className="absolute left-0 top-0"
      style={{
        width: pixelWidth,
        height: pixelHeight,
        pointerEvents: interactive ? "auto" : "none",
        touchAction: interactive ? "none" : "auto",
        cursor,
        zIndex: 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {annotations.map((a) => {
        if (a.type === "highlight") {
          return (a.rects ?? []).map((r, i) => {
            const px = toPixelRect(r, dims);
            return (
              <rect
                key={`${a._id}-r${i}`}
                x={px.x}
                y={px.y}
                width={px.w}
                height={px.h}
                fill={a.color}
                opacity={HIGHLIGHT_OPACITY}
              />
            );
          });
        }
        // scribble
        return (
          <polyline
            key={a._id}
            points={normPolyline(a.points ?? [])}
            fill="none"
            stroke={a.color}
            strokeWidth={a.strokeWidth ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Live highlight-drag preview */}
      {highlightPreview && highlightPreview.w > 0 && highlightPreview.h > 0 && (
        <rect
          x={highlightPreview.x}
          y={highlightPreview.y}
          width={highlightPreview.w}
          height={highlightPreview.h}
          fill={activeColor}
          opacity={HIGHLIGHT_PREVIEW_OPACITY}
        />
      )}

      {/* Live scribble preview */}
      {livePoints.length >= 2 && (
        <polyline
          points={normPolyline(livePoints)}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
