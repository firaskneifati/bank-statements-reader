"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Transaction } from "@/lib/types";

const columnHelper = createColumnHelper<Transaction>();

function formatCurrency(value: number | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const hasPostingDates = transactions.some((t) => t.posting_date);
  const hasSources = transactions.some((t) => t.source);

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => info.getValue(),
      }),
      ...(hasPostingDates
        ? [
            columnHelper.accessor("posting_date", {
              header: "Posting Date",
              cell: (info) => info.getValue() || "",
            }),
          ]
        : []),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => {
          const tx = info.row.original;
          return (
            <span
              className={
                tx.type === "credit" ? "text-green-700 font-semibold" : "text-red-700 font-semibold"
              }
            >
              {tx.type === "credit" ? "+" : "-"}
              {formatCurrency(info.getValue())}
            </span>
          );
        },
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => (
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              info.getValue() === "credit"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("balance", {
        header: "Balance",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {info.getValue()}
          </span>
        ),
      }),
      ...(hasSources
        ? [
            columnHelper.accessor("source", {
              header: "Source",
              cell: (info) => {
                const val = info.getValue() || "";
                const short = val.replace(/\.pdf$/i, "");
                const color = info.row.original.sourceColor;
                return (
                  <span className="relative group inline-block">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium max-w-[10rem] truncate ${
                        color ? `${color.bg} ${color.text}` : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {short}
                    </span>
                    <span className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded max-w-[20rem] break-words opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-normal">
                      {val}
                    </span>
                  </span>
                );
              },
            }),
          ]
        : []),
    ],
    [hasPostingDates, hasSources]
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-max min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                >
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext()
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
