"use client";

import { BarChart3 } from "lucide-react";
import { UsageStats } from "@/lib/types";

interface UsageBannerProps {
  usage: UsageStats | null;
  loading: boolean;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-CA");
}

export function UsageBanner({ usage, loading }: UsageBannerProps) {
  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (!usage) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
      <div className="flex items-start gap-2">
        <BarChart3 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p>
            <span className="font-medium text-gray-700">This month:</span>{" "}
            {formatNumber(usage.month_uploads)} uploads | {formatNumber(usage.month_documents)} documents | {formatNumber(usage.month_pages)} pages | {formatNumber(usage.month_transactions)} transactions | {formatNumber(usage.month_exports)} exports
          </p>
          <p>
            <span className="font-medium text-gray-700">All time:</span>{" "}
            {formatNumber(usage.total_uploads)} uploads | {formatNumber(usage.total_documents)} documents | {formatNumber(usage.total_pages)} pages | {formatNumber(usage.total_transactions)} transactions | {formatNumber(usage.total_exports)} exports
          </p>
        </div>
      </div>
    </div>
  );
}
