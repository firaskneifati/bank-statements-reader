"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Transaction } from "@/lib/types";
import { exportTransactions } from "@/lib/api-client";

interface ExportButtonsProps {
  transactions: Transaction[];
  filename?: string;
}

export function ExportButtons({
  transactions,
  filename = "transactions",
}: ExportButtonsProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "xlsx" | "quickbooks") => {
    setExporting(format);
    try {
      await exportTransactions({ transactions, format, filename });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleExport("csv")}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <Download className="h-4 w-4" />
        {exporting === "csv" ? "Exporting..." : "Export CSV"}
      </button>
      <button
        onClick={() => handleExport("xlsx")}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {exporting === "xlsx" ? "Exporting..." : "Export Excel"}
      </button>
      <button
        onClick={() => handleExport("quickbooks")}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
      >
        <Download className="h-4 w-4" />
        {exporting === "quickbooks" ? "Exporting..." : "QuickBooks CSV"}
      </button>
    </div>
  );
}
