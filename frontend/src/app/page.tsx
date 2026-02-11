"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { FileUploader } from "@/components/FileUploader";
import { CategoryManager } from "@/components/CategoryManager";
import { TransactionTable } from "@/components/TransactionTable";
import { ExportButtons } from "@/components/ExportButtons";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { UsageBanner } from "@/components/UsageBanner";
import { UploadProgress, UploadProgressData } from "@/components/UploadProgress";
import { uploadSingleStatement, fetchUsage } from "@/lib/api-client";
import { UploadResponse, UsageStats, CategoryConfig, DEFAULT_CATEGORIES } from "@/lib/types";
import { Header } from "@/components/Header";
import { AlertCircle, RotateCcw, FileText, Plus } from "lucide-react";

const STORAGE_KEY = "bank-statement-categories";

function loadCategories(): CategoryConfig[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CATEGORIES;
}

type AppState = "idle" | "uploading" | "loading" | "results" | "error";

export default function Home() {
  const { status: sessionStatus } = useSession();
  const [state, setState] = useState<AppState>("idle");
  const [data, setData] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    setCategories(loadCategories());
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetchUsage()
      .then(setUsage)
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [sessionStatus]);

  const handleCategoriesChange = (updated: CategoryConfig[]) => {
    setCategories(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const [addingMore, setAddingMore] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressData>({
    total: 0,
    completed: 0,
    currentFile: null,
    completedFiles: [],
    failedFiles: [],
  });

  const handleUpload = async (files: File[]) => {
    if (files.length === 1) {
      // Single file — use simple loading state
      setState("loading");
      setError("");
      try {
        const result = await uploadSingleStatement(files[0], categories);
        setData(result);
        if (result.usage) setUsage(result.usage);
        setState("results");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
        setState("error");
      }
      return;
    }

    // Multiple files — upload one at a time with progress
    setState("uploading");
    setError("");
    const progress: UploadProgressData = {
      total: files.length,
      completed: 0,
      currentFile: null,
      completedFiles: [],
      failedFiles: [],
    };
    setUploadProgress({ ...progress });

    const allStatements: UploadResponse["statements"] = [];
    let latestUsage: UsageStats | null = null;
    let mockMode = false;

    for (const file of files) {
      progress.currentFile = file.name;
      setUploadProgress({ ...progress });

      try {
        const result = await uploadSingleStatement(file, categories);
        allStatements.push(...result.statements);
        if (result.usage) latestUsage = result.usage;
        if (result.mock_mode) mockMode = true;
        progress.completed++;
        progress.completedFiles.push(file.name);
      } catch (err) {
        progress.completed++;
        progress.failedFiles.push({
          name: file.name,
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }

      setUploadProgress({ ...progress });
    }

    progress.currentFile = null;
    setUploadProgress({ ...progress });

    if (allStatements.length > 0) {
      setData({ statements: allStatements, mock_mode: mockMode, usage: latestUsage });
      if (latestUsage) setUsage(latestUsage);
      setState("results");
    } else {
      setError(
        `All ${files.length} files failed to process. ${progress.failedFiles.map((f) => `${f.name}: ${f.error}`).join("; ")}`
      );
      setState("error");
    }
  };

  const handleAddMore = async (files: File[]) => {
    setAddingMore(true);
    const progress: UploadProgressData = {
      total: files.length,
      completed: 0,
      currentFile: null,
      completedFiles: [],
      failedFiles: [],
    };
    setUploadProgress({ ...progress });

    for (const file of files) {
      progress.currentFile = file.name;
      setUploadProgress({ ...progress });

      try {
        const result = await uploadSingleStatement(file, categories);
        setData((prev) => {
          if (!prev) return result;
          return {
            ...prev,
            statements: [...prev.statements, ...result.statements],
            mock_mode: prev.mock_mode || result.mock_mode,
            usage: result.usage ?? prev.usage,
          };
        });
        if (result.usage) setUsage(result.usage);
        progress.completed++;
        progress.completedFiles.push(file.name);
      } catch (err) {
        progress.completed++;
        progress.failedFiles.push({
          name: file.name,
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }

      setUploadProgress({ ...progress });
    }

    progress.currentFile = null;
    setUploadProgress({ ...progress });
    setSelectedStatement(null);
    setAddingMore(false);
  };

  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setState("idle");
    setData(null);
    setError("");
    setSelectedStatement(null);
  };

  const visibleStatements = selectedStatement !== null
    ? [data?.statements[selectedStatement]].filter(Boolean)
    : data?.statements ?? [];
  const filteredTransactions = visibleStatements.flatMap((s) => s!.transactions);
  const totalDebits = visibleStatements.reduce((sum, s) => sum + s!.total_debits, 0);
  const totalCredits = visibleStatements.reduce((sum, s) => sum + s!.total_credits, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <Header />
    <UsageBanner usage={usage} loading={usageLoading} />
    <div className="space-y-6 mt-6">
      {state === "idle" && (
        <>
          <CategoryManager categories={categories} onChange={handleCategoriesChange} />
          <FileUploader onUpload={handleUpload} />
        </>
      )}

      {state === "loading" && <LoadingSpinner />}

      {state === "uploading" && <UploadProgress progress={uploadProgress} />}

      {state === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold">Upload Failed</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={handleReset}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {state === "results" && data && (
        <>
          {addingMore && <UploadProgress progress={uploadProgress} />}

          {!addingMore && uploadProgress.failedFiles.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>{uploadProgress.failedFiles.length} file{uploadProgress.failedFiles.length !== 1 ? "s" : ""} failed:</strong>{" "}
              {uploadProgress.failedFiles.map((f) => f.name).join(", ")}
            </div>
          )}

          {data.mock_mode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Mock mode is active. Showing sample data. Set MOCK_MODE=false with an API key for real parsing.
            </div>
          )}

          {data.statements.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatement(null)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedStatement === null
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                All ({data.statements.reduce((sum, s) => sum + s.transaction_count, 0)})
              </button>
              {data.statements.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedStatement(i)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatement === i
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {s.filename} ({s.transaction_count})
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredTransactions.length} Transactions{selectedStatement !== null ? ` — ${data.statements[selectedStatement].filename}` : " Found"}
              </h2>
              <p className="text-sm text-gray-500">
                {visibleStatements.length} statement{visibleStatements.length !== 1 ? "s" : ""}
                {" | "}
                <span className="text-green-700">
                  Credits: ${totalCredits.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                </span>
                {" | "}
                <span className="text-red-700">
                  Debits: ${totalDebits.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ExportButtons transactions={filteredTransactions} />
              <input
                ref={addMoreInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) handleAddMore(files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => addMoreInputRef.current?.click()}
                disabled={addingMore}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add More
              </button>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                New Upload
              </button>
            </div>
          </div>

          <TransactionTable transactions={filteredTransactions} />
        </>
      )}
    </div>
    </main>
  );
}
