"use client";

import { useState, useEffect } from "react";
import { FileUploader } from "@/components/FileUploader";
import { CategoryManager } from "@/components/CategoryManager";
import { TransactionTable } from "@/components/TransactionTable";
import { ExportButtons } from "@/components/ExportButtons";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { uploadStatements } from "@/lib/api-client";
import { UploadResponse, CategoryConfig, DEFAULT_CATEGORIES } from "@/lib/types";
import { Header } from "@/components/Header";
import { AlertCircle, RotateCcw } from "lucide-react";

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

type AppState = "idle" | "loading" | "results" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [data, setData] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    setCategories(loadCategories());
  }, []);

  const handleCategoriesChange = (updated: CategoryConfig[]) => {
    setCategories(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleUpload = async (files: File[]) => {
    setState("loading");
    setError("");
    try {
      const result = await uploadStatements(files, categories);
      setData(result);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setData(null);
    setError("");
  };

  const allTransactions = data?.statements.flatMap((s) => s.transactions) ?? [];
  const totalDebits = data?.statements.reduce((sum, s) => sum + s.total_debits, 0) ?? 0;
  const totalCredits = data?.statements.reduce((sum, s) => sum + s.total_credits, 0) ?? 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <Header />
    <div className="space-y-6">
      {state === "idle" && (
        <>
          <CategoryManager categories={categories} onChange={handleCategoriesChange} />
          <FileUploader onUpload={handleUpload} />
        </>
      )}

      {state === "loading" && <LoadingSpinner />}

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
          {data.mock_mode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Mock mode is active. Showing sample data. Set MOCK_MODE=false with an API key for real parsing.
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {allTransactions.length} Transactions Found
              </h2>
              <p className="text-sm text-gray-500">
                {data.statements.length} statement{data.statements.length !== 1 ? "s" : ""} processed
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
              <ExportButtons transactions={allTransactions} />
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                New Upload
              </button>
            </div>
          </div>

          <TransactionTable transactions={allTransactions} />
        </>
      )}
    </div>
    </main>
  );
}
