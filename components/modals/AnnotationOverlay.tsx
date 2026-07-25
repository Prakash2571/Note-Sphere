/**
 * components/modals/AnnotationOverlay.tsx
 *
 * Absolutely-positioned SVG layer rendered as a sibling of the react-pdf
 * <Page>, sized to the rendered page box (unscaledWidth * scale ×
 * unscaledHeight * scale). It renders the current page's annotations and
 * captures highlight text-selections and freehand scribble strokes.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import {
  toPixelPoint,
  toPixelRect,
  toNormalizedPoint,
  toNormalizedRect,
  type NormPoint,
  type NormRect,
  type PageDims,
} from "@/lib/annotations/coordinates";
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
}

const HIGHLIGHT_OPACITY = 0.4;

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
}: AnnotationOverlayProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const [livePoints, setLivePoints] = useState<NormPoint[]>([]);

  const dims: PageDims = {
    unscaledWidth,
    unscaledHeight,
    scale,
  };

  const pixelWidth = unscaledWidth * scale;
  const pixelHeight = unscaledHeight * scale;

  // ── Highlight capture (text selection) ──────────────────────────────────
  const handleMouseUp = useCallback(() => {
    if (tool !== "highlight") return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return; // empty / collapsed selection -> no-op (Req 1.5)
    }

    const text = selection.toString();
    if (!text || text.trim() === "") return; // whitespace-only -> no-op (Req 1.5)

    const container = svgRef.current;
    if (!container) return;
    const pageBox = container.getBoundingClientRect();

    const rects: NormRect[] = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      const clientRects = range.getClientRects();
      for (let j = 0; j < clientRects.length; j++) {
        const r = clientRects[j];
        if (r.width <= 0 || r.height <= 0) continue;
        const px = r.left - pageBox.left;
        const py = r.top - pageBox.top;
        rects.push(toNormalizedRect(px, py, r.width, r.height, dims));
      }
    }

    if (rects.length === 0) return; // nothing usable -> no-op (Req 1.5)

    selection.removeAllRanges();
    onCreateHighlight(rects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, dims, onCreateHighlight]);

  // ── Scribble capture (pointer events) ───────────────────────────────────
  const pointFromEvent = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): NormPoint => {
      const container = svgRef.current;
      const box = container?.getBoundingClientRect();
      const px = box ? e.clientX - box.left : 0;
      const py = box ? e.clientY - box.top : 0;
      return toNormalizedPoint(px, py, dims);
    },
    [dims]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tool !== "scribble") return;
      e.preventDefault();
      drawingRef.current = true;
      svgRef.current?.setPointerCapture(e.pointerId);
      setLivePoints([pointFromEvent(e)]);
    },
    [tool, pointFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tool !== "scribble" || !drawingRef.current) return;
      const next = pointFromEvent(e);
      setLivePoints((prev) => [...prev, next]);
    },
    [tool, pointFromEvent]
  );

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    setLivePoints((prev) => {
      // Reduce to distinct points; commit only when >= 2 distinct (Req 4.6).
      const distinct: NormPoint[] = [];
      for (const p of prev) {
        if (distinct.length === 0 || !pointsEqual(distinct[distinct.length - 1], p)) {
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

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tool !== "scribble") return;
      svgRef.current?.releasePointerCapture(e.pointerId);
      finishStroke();
    },
    [tool, finishStroke]
  );

  function normPolyline(points: NormPoint[]): string {
    return points
      .map((p) => {
        const { x, y } = toPixelPoint(p, dims);
        return `${x},${y}`;
      })
      .join(" ");
  }

  const interactive = tool === "highlight" || tool === "scribble";

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
        cursor: tool === "scribble" ? "crosshair" : "default",
        touchAction: tool === "scribble" ? "none" : "auto",
        zIndex: 10,
      }}
      onMouseUp={handleMouseUp}
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

      {/* Live stroke preview */}
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
