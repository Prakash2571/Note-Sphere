/**
 * store/hooks.ts
 *
 * Pre-typed Redux hooks. Always use these instead of plain
 * `useDispatch` / `useSelector` so the types flow through
 * automatically — no manual type annotations needed in components.
 */

import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "@/store";

export const useAppDispatch: () => AppDispatch       = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
