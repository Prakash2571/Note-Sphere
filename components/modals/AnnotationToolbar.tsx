/**
 * components/modals/AnnotationToolbar.tsx
 *
 * Annotation controls rendered in the PDFPreviewModal: tool switch
 * (none/highlight/scribble), per-tool color palette, stroke-width control,
 * jump-to-page input, and a revert-all button gated behind a confirmation.
 */

"use client";

import { useState } from "react";
import {
  Highlighter,
  Pencil,
  Eraser,
  MousePointer2,
  RotateCcw,
} from "lucide-react";
import { PALETTE, type PaletteColor } from "@/lib/annotations/validation";
import type { Tool } from "@/lib/annotations/colorState";
import { parseJumpInput } from "@/lib/annotations/pageInput";

export interface AnnotationToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  highlightColor: PaletteColor; // active color for highlight tool
  scribbleColor: PaletteColor; // active color for scribble tool (independent)
  onColorChange: (tool: "highlight" | "scribble", color: PaletteColor) => void;
  strokeWidth: number; // 1..20
  onStrokeWidthChange: (w: number) => void;
  onRevert: () => void; // opens confirmation
  totalPages: number;
  onJumpToPage: (page: number) => void; // validated
}

export function AnnotationToolbar({
  tool,
  onToolChange,
  highlightColor,
  scribbleColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onRevert,
  totalPages,
  onJumpToPage,
}: AnnotationToolbarProps) {
  const [pageInput, setPageInput] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [confirmRevert, setConfirmRevert] = useState(false);

  const activeColor: PaletteColor =
    tool === "scribble" ? scribbleColor : highlightColor;

  function handleJumpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = parseJumpInput(pageInput, totalPages);
    if (!result.ok) {
      setPageError(
        result.reason === "out-of-range"
          ? `Enter a page between 1 and ${totalPages}.`
          : "Enter a whole number."
      );
      return; // leave the current page unchanged (Req 5.2/5.3)
    }
    setPageError(null);
    onJumpToPage(result.page);
    setPageInput("");
  }

  function handleColorSelect(color: PaletteColor) {
    // Palette applies to the active drawing tool; when no drawing tool is
    // active it updates the highlight tool's color by default.
    const target = tool === "scribble" ? "scribble" : "highlight";
    onColorChange(target, color);
  }

  function handleRevertClick() {
    setConfirmRevert(true);
  }

  function handleConfirmRevert() {
    setConfirmRevert(false);
    onRevert();
  }

  function handleCancelRevert() {
    // Cancel is a no-op — nothing deleted (Req 3.6).
    setConfirmRevert(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Tool switch */}
      <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
        <button
          type="button"
          aria-label="Select tool"
          aria-pressed={tool === "none"}
          onClick={() => onToolChange("none")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            tool === "none"
              ? "bg-blue-500 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <MousePointer2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Highlight tool"
          aria-pressed={tool === "highlight"}
          onClick={() => onToolChange("highlight")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            tool === "highlight"
              ? "bg-blue-500 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Highlighter className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Scribble tool"
          aria-pressed={tool === "scribble"}
          onClick={() => onToolChange("scribble")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            tool === "scribble"
              ? "bg-blue-500 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Eraser tool"
          aria-pressed={tool === "eraser"}
          onClick={() => onToolChange("eraser")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            tool === "eraser"
              ? "bg-blue-500 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      {/* Color palette */}
      <div className="flex items-center gap-1">
        {PALETTE.map((color) => (
          <button
            type="button"
            key={color}
            aria-label={`Color ${color}`}
            aria-pressed={activeColor === color}
            onClick={() => handleColorSelect(color)}
            className={`h-6 w-6 rounded-full border transition ${
              activeColor === color
                ? "border-white ring-2 ring-white/70"
                : "border-white/20 hover:border-white/50"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Stroke width (scribble) */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400" htmlFor="stroke-width">
          Width
        </label>
        <input
          id="stroke-width"
          type="range"
          min={1}
          max={20}
          step={1}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="h-1 w-20 accent-blue-500"
        />
        <span className="w-5 text-center text-xs text-slate-400">
          {strokeWidth}
        </span>
      </div>

      {/* Jump to page */}
      <form onSubmit={handleJumpSubmit} className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={pageInput}
          onChange={(e) => {
            setPageInput(e.target.value);
            if (pageError) setPageError(null);
          }}
          placeholder="Page"
          aria-label="Jump to page"
          className="h-8 w-16 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="h-8 rounded-lg bg-white/5 px-3 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          Go
        </button>
      </form>

      {pageError && (
        <span role="alert" className="text-xs text-red-400">
          {pageError}
        </span>
      )}

      {/* Revert-all */}
      {!confirmRevert ? (
        <button
          type="button"
          onClick={handleRevertClick}
          className="flex h-8 items-center gap-1 rounded-lg bg-white/5 px-3 text-xs text-slate-300 transition hover:bg-red-500/20 hover:text-red-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Revert
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-300">Clear all?</span>
          <button
            type="button"
            onClick={handleConfirmRevert}
            className="h-8 rounded-lg bg-red-500 px-3 text-xs text-white transition hover:bg-red-600"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={handleCancelRevert}
            className="h-8 rounded-lg bg-white/5 px-3 text-xs text-slate-300 transition hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
