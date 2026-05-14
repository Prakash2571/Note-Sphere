/**
 * components/modals/SummarizePanel.tsx
 * Modal panel for AI summarization using Gemini.
 * Uses pdfjs-dist to extract text from the PDF on the client,
 * then sends it to the /api/notes/:id/summarize endpoint.
 */

"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, AlertCircle, RefreshCw, Copy, Check } from "lucide-react";
import * as pdfjs from "pdfjs-dist";

// Set the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  onUpdate: (updated: Partial<Note> & { _id: string }) => void;
}

export function SummarizePanel({ note, onClose, onUpdate }: SummarizePanelProps) {
  const [summary, setSummary] = useState(note.summary || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [step, setStep] = useState<"idle" | "extracting" | "summarizing">("idle");

  // If already summarized, show existing summary immediately
  useEffect(() => {
    if (note.isSummarized && note.summary) {
      setSummary(note.summary);
    }
  }, [note]);

  // ── Extract text from PDF using pdfjs ──────────────────────────────────────
  async function extractTextFromPdf(pdfUrl: string): Promise<string> {
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    let fullText = "";
    const maxPages = Math.min(pdf.numPages, 30); // Limit to first 30 pages

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  }

  // ── Summarize handler ──────────────────────────────────────────────────────
  async function handleSummarize() {
    setIsLoading(true);
    setError("");
    setSummary("");

    try {
      // Step 1: Get a fresh pre-signed URL
      setStep("extracting");
      const noteRes = await fetch(`/api/notes/${note._id}`);
      const noteData = await noteRes.json();
      if (!noteRes.ok) throw new Error(noteData.error);

      // Step 2: Extract text from the PDF
      const extractedText = await extractTextFromPdf(noteData.presignedUrl);

      if (!extractedText) {
        throw new Error("No readable text found in this PDF. It may be a scanned image.");
      }

      // Step 3: Send to Gemini via our API
      setStep("summarizing");
      const res = await fetch(`/api/notes/${note._id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSummary(data.summary);
      onUpdate({ _id: note._id, summary: data.summary, isSummarized: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize. Please try again.");
    } finally {
      setIsLoading(false);
      setStep("idle");
    }
  }

  // ── Copy summary to clipboard ──────────────────────────────────────────────
  async function handleCopy() {
    await navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const stepLabel = {
    idle: "",
    extracting: "Extracting text from PDF...",
    summarizing: "Gemini is reading your document...",
  }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-[#111827] border border-[#1e2d45] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Summary</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{note.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-[#1a2235] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-purple-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-slate-300 font-medium">{stepLabel}</p>
                <p className="text-slate-500 text-sm mt-1">This may take a few seconds</p>
              </div>
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          )}

          {/* Summary output */}
          {summary && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Generated by Google Gemini
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                >
                  {isCopied ? (
                    <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>

              {/* Markdown-style summary */}
              <div className="bg-[#0d1526] border border-[#1e2d45] rounded-xl p-5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!summary && !isLoading && !error && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Generate AI Summary
                </h3>
                <p className="text-slate-400 text-sm max-w-sm">
                  Gemini will read your PDF and generate a structured summary with key points and takeaways.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2d45] flex-shrink-0">
          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : summary ? (
              <><RefreshCw className="w-4 h-4" /> Re-generate Summary</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Summarize with Gemini</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
