"use client";

import { BarChart3, FileText } from "lucide-react";
import Link from "next/link";
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

  const currentPlan = usage.plan || "free";
  const showUpgrade = currentPlan === "free" || currentPlan === "starter";
  const hasLimit = usage.page_limit !== null && usage.page_limit !== undefined;
  const pagesUsed = usage.month_pages;
  const pagesLimit = usage.page_limit ?? 0;
  const percentage = hasLimit ? Math.min((pagesUsed / pagesLimit) * 100, 100) : 0;
  const isNearLimit = hasLimit && percentage >= 80;
  const isAtLimit = hasLimit && pagesUsed >= pagesLimit;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {hasLimit && (
        <div
          className={`rounded-lg border px-4 py-3 sm:min-w-[200px] ${
            isAtLimit
              ? "bg-red-50 border-red-200"
              : isNearLimit
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText
              className={`h-4 w-4 ${
                isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-blue-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                isAtLimit ? "text-red-700" : isNearLimit ? "text-amber-700" : "text-blue-700"
              }`}
            >
              <span className="capitalize">{currentPlan}</span> Plan
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold ${
                isAtLimit ? "text-red-700" : isNearLimit ? "text-amber-700" : "text-blue-700"
              }`}
            >
              {formatNumber(pagesUsed)}
            </span>
            <span
              className={`text-sm ${
                isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-blue-500"
              }`}
            >
              / {formatNumber(pagesLimit)}
            </span>
          </div>
          <p
            className={`text-xs mt-1 ${
              isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-blue-400"
            }`}
          >
            {isAtLimit ? (
              <>
                Limit reached{" "}
                {showUpgrade && (
                  <Link href="/settings/billing" className="underline font-medium hover:opacity-80">
                    — Upgrade
                  </Link>
                )}
              </>
            ) : (
              <>
                {formatNumber(Math.max(0, pagesLimit - pagesUsed))} pages remaining
                {showUpgrade && isNearLimit && (
                  <>
                    {" "}
                    <Link href="/settings/billing" className="underline font-medium hover:opacity-80">
                      Upgrade
                    </Link>
                  </>
                )}
              </>
            )}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p>
              <span className="font-medium text-gray-700">This month:</span>{" "}
              {formatNumber(usage.month_uploads)} uploads | {formatNumber(usage.month_documents)} docs | {formatNumber(usage.month_pages)} pages | {formatNumber(usage.month_transactions)} transactions
            </p>
            <p>
              <span className="font-medium text-gray-700">All time:</span>{" "}
              {formatNumber(usage.total_uploads)} uploads | {formatNumber(usage.total_documents)} docs | {formatNumber(usage.total_pages)} pages | {formatNumber(usage.total_transactions)} transactions | {formatNumber(usage.total_exports)} exports
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
