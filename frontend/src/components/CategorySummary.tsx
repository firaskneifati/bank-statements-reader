"use client";

import { useMemo } from "react";
import { Transaction } from "@/lib/types";

interface CategorySummaryProps {
  transactions: Transaction[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

interface CategoryRow {
  category: string;
  count: number;
  debits: number;
  credits: number;
  net: number;
}

export function CategorySummary({ transactions }: CategorySummaryProps) {
  const rows = useMemo(() => {
    const map = new Map<string, { count: number; debits: number; credits: number }>();

    for (const t of transactions) {
      const cat = t.category || "Other";
      const entry = map.get(cat) || { count: 0, debits: 0, credits: 0 };
      entry.count++;
      if (t.type === "debit") {
        entry.debits += t.amount;
      } else {
        entry.credits += t.amount;
      }
      map.set(cat, entry);
    }

    const result: CategoryRow[] = [];
    for (const [category, { count, debits, credits }] of map) {
      result.push({
        category,
        count,
        debits: Math.round(debits * 100) / 100,
        credits: Math.round(credits * 100) / 100,
        net: Math.round((credits - debits) * 100) / 100,
      });
    }

    // Sort by total volume (debits + credits) descending
    result.sort((a, b) => (b.debits + b.credits) - (a.debits + a.credits));
    return result;
  }, [transactions]);

  if (rows.length === 0) return null;

  const totalDebits = rows.reduce((sum, r) => sum + r.debits, 0);
  const totalCredits = rows.reduce((sum, r) => sum + r.credits, 0);
  const totalNet = rows.reduce((sum, r) => sum + r.net, 0);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Category Summary</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-max min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Count
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Spent
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Received
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Net
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.category} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-sm">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-700 text-right tabular-nums">
                  {row.count}
                </td>
                <td className="px-4 py-2.5 text-sm text-red-700 font-medium text-right tabular-nums">
                  {row.debits > 0 ? formatCurrency(row.debits) : "—"}
                </td>
                <td className="px-4 py-2.5 text-sm text-green-700 font-medium text-right tabular-nums">
                  {row.credits > 0 ? formatCurrency(row.credits) : "—"}
                </td>
                <td className={`px-4 py-2.5 text-sm font-semibold text-right tabular-nums ${
                  row.net >= 0 ? "text-green-700" : "text-red-700"
                }`}>
                  {row.net >= 0 ? "+" : ""}{formatCurrency(Math.abs(row.net))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr className="font-semibold">
              <td className="px-4 py-3 text-sm text-gray-900">
                Total ({rows.length} categories)
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">
                {transactions.length}
              </td>
              <td className="px-4 py-3 text-sm text-red-700 text-right tabular-nums">
                {formatCurrency(totalDebits)}
              </td>
              <td className="px-4 py-3 text-sm text-green-700 text-right tabular-nums">
                {formatCurrency(totalCredits)}
              </td>
              <td className={`px-4 py-3 text-sm text-right tabular-nums ${
                totalNet >= 0 ? "text-green-700" : "text-red-700"
              }`}>
                {totalNet >= 0 ? "+" : ""}{formatCurrency(Math.abs(totalNet))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
