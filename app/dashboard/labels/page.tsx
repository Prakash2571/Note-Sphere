/**
 * app/dashboard/labels/page.tsx
 */

"use client";

import { useEffect, useState } from "react";

import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import {
  LABEL_COLORS,
  randomLabelColor,
} from "@/lib/utils";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  fetchLabels,
  createLabel,
  updateLabel,
  deleteLabel,
} from "@/store/slices/labelsSlice";

export default function LabelsPage() {
  const dispatch = useAppDispatch();

  const labels = useAppSelector(
    (state) => state.labels.items
  );

  const isReduxLoading =
    useAppSelector(
      (state) => state.labels.isLoading
    );

  const [newName, setNewName] =
    useState("");

  /* HYDRATION SAFE */
  const [newColor, setNewColor] =
    useState<string>(
      LABEL_COLORS[0]
    );

  const [isCreating, setIsCreating] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editColor, setEditColor] =
    useState<string>("");

  const [error, setError] =
    useState("");

  /* Load labels */
  useEffect(() => {
    dispatch(fetchLabels());
  }, [dispatch]);

  /* Create */
  async function handleCreate(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!newName.trim()) return;

    setIsCreating(true);
    setError("");

    try {
      await dispatch(
        createLabel({
          name: newName.trim(),
          color: newColor,
        })
      ).unwrap();

      setNewName("");

      setNewColor(
        randomLabelColor()
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create label."
      );
    } finally {
      setIsCreating(false);
    }
  }

  /* Save edit */
  async function handleSaveEdit(
    labelId: string
  ) {
    try {
      await dispatch(
        updateLabel({
          id: labelId,
          name: editName.trim(),
          color: editColor,
        })
      ).unwrap();

      setEditingId(null);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update label."
      );
    }
  }

  /* Delete */
  async function handleDelete(
    labelId: string,
    noteCount: number
  ) {
    const message =
      noteCount > 0
        ? `Delete this label? It will be removed from ${noteCount} note${
            noteCount > 1
              ? "s"
              : ""
          }.`
        : "Delete this label?";

    if (!confirm(message)) {
      return;
    }

    try {
      await dispatch(
        deleteLabel(labelId)
      ).unwrap();
    } catch {
      alert(
        "Failed to delete label."
      );
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Labels
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Organize your notes with
          color-coded labels.
        </p>
      </div>

      {/* Create */}
      <div className="mb-6 rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
        <h2 className="mb-5 text-sm font-semibold text-slate-300">
          Create Label
        </h2>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="space-y-5"
        >
          {/* Colors */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Color
            </label>

            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      setNewColor(color)
                    }
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      newColor === color
                        ? "scale-110 border-white"
                        : "border-transparent"
                    }`}
                    style={{
                      backgroundColor:
                        color,
                    }}
                  />
                )
              )}
            </div>
          </div>

          {/* Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Label name
            </label>

            <input
              type="text"
              value={newName}
              onChange={(e) =>
                setNewName(
                  e.target.value
                )
              }
              placeholder="e.g. Research, Physics..."
              className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isCreating ||
              !newName.trim()
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50 sm:w-auto"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Label
              </>
            )}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827]">
        {/* Header */}
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-300">
            Your Labels{" "}
            <span className="font-normal text-slate-500">
              ({labels.length})
            </span>
          </h2>
        </div>

        {/* Loading */}
        {isReduxLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : labels.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/3">
              <Tag className="h-7 w-7 text-slate-600" />
            </div>

            <p className="text-sm text-slate-500">
              No labels yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {labels.map((label) => (
              <div
                key={label._id}
                className="px-5 py-4 sm:px-6"
              >
                {editingId ===
                label._id ? (
                  <div className="space-y-4">
                    {/* Colors */}
                    <div className="flex flex-wrap gap-2">
                      {LABEL_COLORS.map(
                        (color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() =>
                              setEditColor(
                                color
                              )
                            }
                            className={`h-5 w-5 rounded-full border-2 transition ${
                              editColor ===
                              color
                                ? "border-white scale-110"
                                : "border-transparent"
                            }`}
                            style={{
                              backgroundColor:
                                color,
                            }}
                          />
                        )
                      )}
                    </div>

                    {/* Input + Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) =>
                          setEditName(
                            e.target.value
                          )
                        }
                        autoFocus
                        className="flex-1 rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-400/40"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleSaveEdit(
                              label._id
                            )
                          }
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400 transition hover:bg-green-500/20"
                        >
                          <Check className="h-4 w-4" />
                          Save
                        </button>

                        <button
                          onClick={() =>
                            setEditingId(
                              null
                            )
                          }
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Dot */}
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          label.color,
                      }}
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {label.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {label.noteCount}{" "}
                        note
                        {label.noteCount !==
                        1
                          ? "s"
                          : ""}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => {
                          setEditingId(
                            label._id
                          );

                          setEditName(
                            label.name
                          );

                          setEditColor(
                            label.color
                          );
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            label._id,
                            label.noteCount
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}