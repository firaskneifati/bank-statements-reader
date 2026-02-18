"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { FileUploader } from "@/components/FileUploader";
import { TransactionTable } from "@/components/TransactionTable";
import { CategorySummary } from "@/components/CategorySummary";
import { ExportButtons } from "@/components/ExportButtons";
import { UsageBanner } from "@/components/UsageBanner";
import { UploadProgress, UploadProgressData } from "@/components/UploadProgress";
import { AutoRuleToast } from "@/components/AutoRuleToast";
import { uploadSingleStatement, fetchUsage, fetchCategoryGroups, updateCategoryGroup, applyRules } from "@/lib/api-client";
import { Transaction, UploadResponse, UsageStats, CategoryConfig, DEFAULT_CATEGORIES, CategoryGroup } from "@/lib/types";
import { Header } from "@/components/Header";
import { AlertCircle, RotateCcw, Trash2, FileText, Plus, X, Tag, Settings, Star, RefreshCw } from "lucide-react";
import Link from "next/link";

const SESSION_DATA_KEY = "bank-statement-results";

const STATEMENT_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300", activeBg: "bg-violet-600" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300", activeBg: "bg-teal-600" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", activeBg: "bg-amber-600" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300", activeBg: "bg-rose-600" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300", activeBg: "bg-cyan-600" },
  { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-300", activeBg: "bg-lime-600" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-300", activeBg: "bg-fuchsia-600" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", activeBg: "bg-orange-600" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300", activeBg: "bg-sky-600" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", activeBg: "bg-emerald-600" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300", activeBg: "bg-pink-600" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", activeBg: "bg-indigo-600" },
];

type AppState = "idle" | "uploading" | "results" | "error";

export default function Home() {
  const { status: sessionStatus } = useSession();
  const [state, setState] = useState<AppState>("idle");
  const [data, setData] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [sortedTransactions, setSortedTransactions] = useState<Transaction[]>([]);

  // Category groups
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Auto-rule toast
  const [ruleToast, setRuleToast] = useState<{
    description: string;
    newCategory: string;
    categoryId: string;
    oldCategory: string;
    categorySource: "ai" | "rule" | "manual" | undefined;
  } | null>(null);

  const activeGroup = categoryGroups.find((g) => g.id === activeGroupId);
  const categoryNames = useMemo(
    () => activeGroup?.categories.map((c) => c.name) ?? DEFAULT_CATEGORIES.map((c) => c.name),
    [activeGroup]
  );

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_DATA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UploadResponse;
        if (parsed.statements?.length > 0) {
          setData(parsed);
          setState("results");
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (data) {
      sessionStorage.setItem(SESSION_DATA_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(SESSION_DATA_KEY);
    }
  }, [data]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetchUsage()
      .then(setUsage)
      .catch(() => {})
      .finally(() => setUsageLoading(false));
    fetchCategoryGroups()
      .then((groups) => {
        setCategoryGroups(groups);
        const active = groups.find((g) => g.is_active);
        if (active) setActiveGroupId(active.id);
        else if (groups.length > 0) setActiveGroupId(groups[0].id);
      })
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, [sessionStatus]);

  const handleSwitchGroup = async (groupId: string) => {
    setActiveGroupId(groupId);
    try {
      await updateCategoryGroup(groupId, { is_active: true });
      setCategoryGroups((prev) =>
        prev.map((g) => ({ ...g, is_active: g.id === groupId }))
      );
    } catch {}
  };

  const [addingMore, setAddingMore] = useState(false);
  const [showAddDropzone, setShowAddDropzone] = useState(false);
  const cancelRef = useRef(false);
  const [selectedStatement, setSelectedStatement] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressData>({
    total: 0,
    completed: 0,
    currentFile: null,
    completedFiles: [],
    failedFiles: [],
  });

  const handleUpload = async (files: File[]) => {
    setState("uploading");
    setError("");
    cancelRef.current = false;
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
      if (cancelRef.current) break;
      progress.currentFile = file.name;
      setUploadProgress({ ...progress });

      try {
        const result = await uploadSingleStatement(file, undefined, activeGroupId ?? undefined);
        allStatements.push(...result.statements);
        if (result.usage) { latestUsage = result.usage; setUsage(result.usage); }
        if (result.mock_mode) mockMode = true;
        progress.completed++;
        progress.completedFiles.push({ name: file.name, pages: result.statements.reduce((sum, s) => sum + s.page_count, 0) });
      } catch (err) {
        if (cancelRef.current) break;
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
    } else if (!cancelRef.current) {
      setError(
        `All ${files.length} files failed to process. ${progress.failedFiles.map((f) => `${f.name}: ${f.error}`).join("; ")}`
      );
      setState("error");
    } else {
      setState("idle");
    }
  };

  const handleAddMore = async (files: File[]) => {
    setAddingMore(true);
    cancelRef.current = false;
    const progress: UploadProgressData = {
      total: files.length,
      completed: 0,
      currentFile: null,
      completedFiles: [],
      failedFiles: [],
    };
    setUploadProgress({ ...progress });

    for (const file of files) {
      if (cancelRef.current) break;
      progress.currentFile = file.name;
      setUploadProgress({ ...progress });

      try {
        const result = await uploadSingleStatement(file, undefined, activeGroupId ?? undefined);
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
        progress.completedFiles.push({ name: file.name, pages: result.statements.reduce((sum, s) => sum + s.page_count, 0) });
      } catch (err) {
        if (cancelRef.current) break;
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
  const colorAssignments = useRef<Record<string, typeof STATEMENT_COLORS[number]>>({});

  const handleRemoveStatement = (index: number) => {
    const name = data?.statements[index]?.filename ?? "this statement";
    if (!window.confirm(`Remove "${name}" from results?`)) return;
    setData((prev) => {
      if (!prev) return prev;
      const updated = prev.statements.filter((_, i) => i !== index);
      if (updated.length === 0) {
        sessionStorage.removeItem(SESSION_DATA_KEY);
        setState("idle");
        return null;
      }
      return { ...prev, statements: updated };
    });
    setSelectedStatement(null);
  };

  const handleDiscard = () => {
    if (!window.confirm("Discard all results? This cannot be undone.")) return;
    sessionStorage.removeItem(SESSION_DATA_KEY);
    setState("idle");
    setData(null);
    setError("");
    setSelectedStatement(null);
  };

  const handleFieldChange = useCallback((stmtIndex: number, txIndex: number, field: string, value: string | number | null) => {
    setData((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        statements: prev.statements.map((s, si) => {
          if (si !== stmtIndex) return s;
          const updatedTxs = s.transactions.map((t, ti) =>
            ti === txIndex ? { ...t, [field]: value } : t
          );
          const totalDebits = updatedTxs.reduce((sum, t) => sum + (t.type === "debit" ? t.amount : 0), 0);
          const totalCredits = updatedTxs.reduce((sum, t) => sum + (t.type === "credit" ? t.amount : 0), 0);
          return {
            ...s,
            transactions: updatedTxs,
            total_debits: Math.round(totalDebits * 100) / 100,
            total_credits: Math.round(totalCredits * 100) / 100,
            transaction_count: updatedTxs.length,
          };
        }),
      };
      return updated;
    });
  }, []);

  const handleCategoryChange = useCallback((stmtIndex: number, txIndex: number, newCategory: string) => {
    // Get the transaction before changing it
    const tx = data?.statements[stmtIndex]?.transactions[txIndex];
    const oldCategory = tx?.category ?? "";
    const source = tx?.category_source;

    handleFieldChange(stmtIndex, txIndex, "category", newCategory);
    handleFieldChange(stmtIndex, txIndex, "category_source", "manual");

    // Suggest auto-rule if category was changed and we have an active group
    if (tx && activeGroup && newCategory !== oldCategory && (source === "ai" || source === "rule")) {
      const targetCat = activeGroup.categories.find(
        (c) => c.name === newCategory
      );
      if (targetCat) {
        setRuleToast({
          description: tx.description,
          newCategory,
          categoryId: targetCat.id,
          oldCategory,
          categorySource: source,
        });
      }
    }
  }, [handleFieldChange, data, activeGroup]);

  const [reprocessing, setReprocessing] = useState(false);

  const handleReprocessRules = useCallback(async () => {
    if (!activeGroupId || !data) return;
    setReprocessing(true);
    try {
      const allTxs = data.statements.flatMap((s) => s.transactions);
      const result = await applyRules(activeGroupId, allTxs);

      // Only update category + category_source from result, preserve all other fields
      setData((prev) => {
        if (!prev) return prev;
        let offset = 0;
        const updatedStatements = prev.statements.map((s) => {
          const updatedTxs = s.transactions.map((tx, i) => ({
            ...tx,
            category: result.transactions[offset + i]?.category ?? tx.category,
            category_source: result.transactions[offset + i]?.category_source ?? tx.category_source,
          }));
          offset += s.transactions.length;
          return { ...s, transactions: updatedTxs };
        });
        return { ...prev, statements: updatedStatements };
      });

      alert(`Rules reprocessed: ${result.rules_applied} transaction${result.rules_applied !== 1 ? "s" : ""} matched rules.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reprocess rules");
    } finally {
      setReprocessing(false);
    }
  }, [activeGroupId, data]);

  const visibleStatements = selectedStatement !== null
    ? [data?.statements[selectedStatement]].filter(Boolean)
    : data?.statements ?? [];
  const statements = data?.statements ?? [];
  let nextColorIndex = Object.keys(colorAssignments.current).length;
  for (const s of statements) {
    if (!(s.filename in colorAssignments.current)) {
      colorAssignments.current[s.filename] = STATEMENT_COLORS[nextColorIndex % STATEMENT_COLORS.length];
      nextColorIndex++;
    }
  }
  const colorMap = colorAssignments.current;
  const statementsWithIndices = selectedStatement !== null
    ? [{ stmt: data?.statements[selectedStatement], stmtIdx: selectedStatement }]
    : (data?.statements ?? []).map((stmt, i) => ({ stmt, stmtIdx: i }));
  const filteredTransactions = useMemo(() => statementsWithIndices.flatMap(({ stmt, stmtIdx }) =>
    stmt!.transactions.map((t, txIdx) => ({
      ...t,
      source: stmt!.filename,
      sourceColor: colorMap[stmt!.filename],
      _stmtIndex: stmtIdx,
      _txIndex: txIdx,
    }))
  ), [data, selectedStatement]);
  const totalDebits = visibleStatements.reduce((sum, s) => sum + s!.total_debits, 0);
  const totalCredits = visibleStatements.reduce((sum, s) => sum + s!.total_credits, 0);

  return (
    <>
    <Header />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <UsageBanner usage={usage} loading={usageLoading} />
      {/* Category Group Selector — visible in idle + results */}
      {(state === "idle" || state === "results") && !groupsLoading && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Category Group</h3>
                {categoryGroups.length > 0 ? (
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={activeGroupId ?? ""}
                      onChange={(e) => handleSwitchGroup(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categoryGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.categories.length} categories
                          {g.categories.reduce((s, c) => s + c.rules.length, 0) > 0
                            ? `, ${g.categories.reduce((s, c) => s + c.rules.length, 0)} rules`
                            : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    No groups yet — using default categories.{" "}
                    <Link href="/settings/categories" className="text-blue-600 hover:underline">Create one</Link>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state === "results" && activeGroup && (
                <button
                  onClick={handleReprocessRules}
                  disabled={reprocessing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${reprocessing ? "animate-spin" : ""}`} />
                  {reprocessing ? "Reprocessing..." : "Reprocess Rules"}
                </button>
              )}
              <Link
                href="/settings/categories"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Manage
              </Link>
            </div>
          </div>
          {activeGroup && activeGroup.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
              {[...activeGroup.categories]
                .sort((a, b) => {
                  if (a.name.toLowerCase() === "other") return -1;
                  if (b.name.toLowerCase() === "other") return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((cat) => (
                <span
                  key={cat.id}
                  title={cat.description || cat.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                >
                  {cat.name}
                  {cat.rules.length > 0 && (
                    <span className="text-[10px] text-blue-500 font-semibold">{cat.rules.length}r</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {state === "idle" && (
        <FileUploader onUpload={handleUpload} />
      )}

      {state === "uploading" && <UploadProgress progress={uploadProgress} onCancel={() => { cancelRef.current = true; }} />}

      {state === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 overflow-hidden">
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-red-800 font-semibold">Upload Failed</h3>
              <p className="text-red-700 mt-1 break-words">{error}</p>
              <button
                onClick={handleDiscard}
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
          {addingMore && <UploadProgress progress={uploadProgress} onCancel={() => { cancelRef.current = true; }} />}

          {!addingMore && uploadProgress.failedFiles.length > 0 && (() => {
            const errors = uploadProgress.failedFiles;
            const uniqueErrors = [...new Set(errors.map((f) => f.error))];
            const allSameError = uniqueErrors.length === 1;
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 break-words overflow-hidden">
                {allSameError ? (
                  <>
                    <strong>{errors.length} file{errors.length !== 1 ? "s" : ""} failed:</strong>{" "}
                    {uniqueErrors[0]}
                  </>
                ) : (
                  <>
                    <strong>{errors.length} file{errors.length !== 1 ? "s" : ""} failed:</strong>{" "}
                    {errors.map((f) => `${f.name} — ${f.error}`).join("; ")}
                  </>
                )}
              </div>
            );
          })()}

          {data.mock_mode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Mock mode is active. Showing sample data. Set MOCK_MODE=false with an API key for real parsing.
            </div>
          )}

          {data.statements.length >= 1 && (
            <div className="flex flex-wrap gap-2 min-w-0">
              <button
                onClick={() => setSelectedStatement(null)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border ${
                  selectedStatement === null
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                All ({data.statements.reduce((sum, s) => sum + s.transaction_count, 0)})
              </button>
              {data.statements.map((s, i) => {
                const c = colorMap[s.filename];
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedStatement(i)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors max-w-full border ${
                      selectedStatement === i
                        ? `${c.activeBg} text-white border-transparent`
                        : `${c.bg} ${c.text} ${c.border} hover:opacity-80`
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="break-all">{s.filename}</span> ({s.transaction_count})
                    <span className="text-[10px] opacity-60">
                      {s.actual_pages || s.page_count}p{s.processing_type === "image" ? " img" : s.processing_type === "ocr" ? " scan" : ""}
                      {s.ocr_confidence != null && ` ${Math.round(s.ocr_confidence * 100)}%`}
                    </span>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveStatement(i);
                      }}
                      className={`ml-1 rounded-full p-0.5 transition-colors ${
                        selectedStatement === i
                          ? "hover:bg-white/20"
                          : "hover:bg-black/10"
                      }`}
                      title={`Remove ${s.filename}`}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
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
                {(() => {
                  const textPages = visibleStatements.filter((s) => s!.processing_type === "text").reduce((sum, s) => sum + (s!.actual_pages || s!.page_count), 0);
                  const imagePages = visibleStatements.filter((s) => s!.processing_type === "image").reduce((sum, s) => sum + (s!.actual_pages || 1), 0);
                  const ocrPages = visibleStatements.filter((s) => s!.processing_type === "ocr").reduce((sum, s) => sum + (s!.actual_pages || s!.page_count), 0);
                  const spreadsheetPages = visibleStatements.filter((s) => s!.processing_type === "spreadsheet").reduce((sum, s) => sum + (s!.actual_pages || 1), 0);
                  const parts: string[] = [];
                  if (textPages > 0) parts.push(`${textPages} text`);
                  if (ocrPages > 0) parts.push(`${ocrPages} scanned`);
                  if (imagePages > 0) parts.push(`${imagePages} image`);
                  if (spreadsheetPages > 0) parts.push(`${spreadsheetPages} spreadsheet`);
                  const total = textPages + imagePages + ocrPages + spreadsheetPages;
                  return (
                    <span>
                      {parts.length > 1 ? parts.join(" + ") + " = " : ""}
                      {total} page{total !== 1 ? "s" : ""}
                    </span>
                  );
                })()}
                {" | "}
                <span className="text-green-700">
                  Received: ${totalCredits.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                </span>
                {" | "}
                <span className="text-red-700">
                  Spent: ${totalDebits.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExportButtons transactions={sortedTransactions.length > 0 ? sortedTransactions : filteredTransactions} />
              <button
                onClick={() => setShowAddDropzone(!showAddDropzone)}
                disabled={addingMore}
                className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  showAddDropzone
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                }`}
              >
                <Plus className="h-4 w-4" />
                Add More
              </button>
              <button
                onClick={handleDiscard}
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Discard
              </button>
            </div>
          </div>

          {showAddDropzone && !addingMore && (
            <FileUploader
              onUpload={(files) => {
                setShowAddDropzone(false);
                handleAddMore(files);
              }}
            />
          )}

          <TransactionTable
            transactions={filteredTransactions}
            categories={categoryNames}
            onCategoryChange={handleCategoryChange}
            onFieldChange={handleFieldChange}
            onSortedRowsChange={setSortedTransactions}
          />
          <CategorySummary transactions={filteredTransactions} />
        </>
      )}

      {/* Auto-rule toast */}
      {ruleToast && (
        <AutoRuleToast
          description={ruleToast.description}
          newCategory={ruleToast.newCategory}
          categoryId={ruleToast.categoryId}
          oldCategory={ruleToast.oldCategory}
          categorySource={ruleToast.categorySource}
          onCreated={() => {
            setRuleToast(null);
            // Reload groups to get updated rules
            fetchCategoryGroups().then((groups) => {
              setCategoryGroups(groups);
            }).catch(() => {});
          }}
          onDismiss={() => setRuleToast(null)}
        />
      )}
    </main>
    </>
  );
}
