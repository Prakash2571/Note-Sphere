/**
 * components/modals/SummarizePanel.tsx
 */

"use client";

import { useEffect, useState } from "react";

import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

interface Note {
  _id: string;
  title: string;
  s3Key: string;
  summary?: string;
  isSummarized: boolean;
}

interface SummarizePanelProps {
  note: Note;

  onClose: () => void;

  onUpdate: (
    updated: Partial<Note> & {
      _id: string;
    }
  ) => void;
}

export function SummarizePanel({
  note,
  onClose,
  onUpdate,
}: SummarizePanelProps) {
  const [summary, setSummary] =
    useState(note.summary || "");

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isCopied, setIsCopied] =
    useState(false);

  const [step, setStep] = useState<
    "idle" | "extracting" | "summarizing"
  >("idle");

  const [pdfjs, setPdfjs] =
    useState<any>(null);

  /* Setup pdfjs only in browser */
  useEffect(() => {
    async function setupPdfWorker() {
      const pdfModule =
        await import("pdfjs-dist");

      pdfModule.GlobalWorkerOptions.workerSrc =
        `//unpkg.com/pdfjs-dist@${pdfModule.version}/build/pdf.worker.min.mjs`;

      setPdfjs(pdfModule);
    }

    setupPdfWorker();
  }, []);

  /* Existing summary */
  useEffect(() => {
    if (
      note.isSummarized &&
      note.summary
    ) {
      setSummary(note.summary);
    }
  }, [note]);

  /* Extract text from PDF */
  async function extractTextFromPdf(
    pdfUrl: string
  ): Promise<string> {
    if (!pdfjs) {
      throw new Error(
        "PDF engine not ready yet."
      );
    }

    const loadingTask =
      pdfjs.getDocument(pdfUrl);

    const pdf =
      await loadingTask.promise;

    let fullText = "";

    const maxPages = Math.min(
      pdf.numPages,
      30
    );

    for (
      let pageNum = 1;
      pageNum <= maxPages;
      pageNum++
    ) {
      const page =
        await pdf.getPage(pageNum);

      const textContent =
        await page.getTextContent();

      const pageText =
        textContent.items
          .map((item: any) =>
            "str" in item
              ? item.str
              : ""
          )
          .join(" ");

      fullText +=
        pageText + "\n";
    }

    return fullText.trim();
  }

  /* Summarize */
  async function handleSummarize() {
    setIsLoading(true);

    setError("");

    setSummary("");

    try {
      setStep("extracting");

      const noteRes =
        await fetch(
          `/api/notes/${note._id}`
        );

      const noteData =
        await noteRes.json();

      if (!noteRes.ok) {
        throw new Error(
          noteData.error
        );
      }

      const extractedText =
        await extractTextFromPdf(
          noteData.presignedUrl
        );

      if (!extractedText) {
        throw new Error(
          "No readable text found in this PDF."
        );
      }

      setStep("summarizing");

      const res = await fetch(
        `/api/notes/${note._id}/summarize`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            extractedText,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error
        );
      }

      setSummary(data.summary);

      onUpdate({
        _id: note._id,
        summary: data.summary,
        isSummarized: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to summarize document."
      );
    } finally {
      setIsLoading(false);

      setStep("idle");
    }
  }

  /* Copy summary */
  async function handleCopy() {
    await navigator.clipboard.writeText(
      summary
    );

    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  const stepLabel = {
    idle: "",
    extracting:
      "Extracting text from PDF...",
    summarizing:
      "Generating AI summary...",
  }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* Panel */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                AI Summary
              </h2>

              <p className="truncate text-xs text-slate-500">
                {note.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{error}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10">
                <Sparkles className="h-8 w-8 animate-pulse text-purple-400" />
              </div>

              <p className="text-sm font-medium text-slate-300">
                {stepLabel}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                This may take a few seconds
              </p>

              <Loader2 className="mt-5 h-5 w-5 animate-spin text-purple-400" />
            </div>
          )}

          {/* Summary */}
          {summary &&
            !isLoading && (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />

                    Generated with Gemini
                  </div>

                  <button
                    onClick={
                      handleCopy
                    }
                    className="inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-white"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 sm:p-6">
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {summary}
                  </div>
                </div>
              </div>
            )}

          {/* Empty */}
          {!summary &&
            !isLoading &&
            !error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10">
                  <Sparkles className="h-8 w-8 text-purple-400" />
                </div>

                <h3 className="text-xl font-semibold text-white">
                  Generate AI Summary
                </h3>

                <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                  Gemini will analyze
                  your PDF and
                  generate a structured
                  summary with key
                  insights and
                  takeaways.
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-4">
          <button
            onClick={
              handleSummarize
            }
            disabled={
              isLoading || !pdfjs
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : summary ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Re-generate Summary
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Summarize with
                Gemini
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}