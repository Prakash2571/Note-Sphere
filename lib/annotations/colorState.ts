/**
 * lib/annotations/colorState.ts
 *
 * Pure per-tool color-state model. Each drawing tool (highlight / scribble)
 * keeps its own active color; selecting a color for one tool never mutates the
 * other's active color (Req 6.2). Deterministic defaults are provided (Req 6.3).
 *
 * This module is pure: no I/O, no mutation of inputs. Every operation returns a
 * new object, which is what makes per-tool color independence (Property 10)
 * easy to reason about and test.
 */

import { PALETTE, PaletteColor } from "./validation";

/** Drawing tools that each carry an independent active color (Req 6.2). */
export type ColorTool = "highlight" | "scribble";

/**
 * Full set of viewer tools. `"none"` is the non-drawing/selection mode used by
 * the viewer chrome; `"eraser"` removes annotations. Neither carries a color of
 * its own.
 */
export type Tool = "none" | "highlight" | "scribble" | "eraser";

export interface ColorState {
  highlight: PaletteColor;
  scribble: PaletteColor;
}

/** Deterministic default active colors, one per tool (Req 6.3). */
export const DEFAULT_COLOR_STATE: ColorState = {
  highlight: PALETTE[0],
  scribble: PALETTE[2],
};

/** Object form of a color selection, retained for existing callers. */
export interface SelectColorAction {
  tool: ColorTool;
  color: PaletteColor;
}

/**
 * Return a new ColorState where only the given tool's active color is updated.
 * Every other tool's active color is left unchanged (Req 6.2).
 *
 * Supports both the positional form `selectColor(state, tool, color)` and the
 * action-object form `selectColor(state, { tool, color })`.
 */
export function selectColor(
  state: ColorState,
  tool: ColorTool,
  color: PaletteColor
): ColorState;
export function selectColor(
  state: ColorState,
  action: SelectColorAction
): ColorState;
export function selectColor(
  state: ColorState,
  toolOrAction: ColorTool | SelectColorAction,
  maybeColor?: PaletteColor
): ColorState {
  const tool =
    typeof toolOrAction === "object" ? toolOrAction.tool : toolOrAction;
  const color =
    typeof toolOrAction === "object"
      ? toolOrAction.color
      : (maybeColor as PaletteColor);

  return {
    ...state,
    [tool]: color,
  };
}

/** Resolve the current active color for a given drawing tool. */
export function activeColor(state: ColorState, tool: ColorTool): PaletteColor {
  return state[tool];
}

/**
 * Resolve the active color for any viewer tool. The non-drawing `"none"` mode
 * and the `"eraser"` tool have no color of their own, so they fall back to the
 * highlight tool's color.
 */
export function activeColorFor(state: ColorState, tool: Tool): PaletteColor {
  if (tool === "scribble") return state.scribble;
  return state.highlight;
}
