"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
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

function EditableCell({
  value,
  onSave,
  type = "text",
  className,
  displayValue,
}: {
  value: string | number | null;
  onSave: (val: string | number | null) => void;
  type?: "text" | "number";
  className?: string;
  displayValue?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (type === "number") {
      const num = parseFloat(draft);
      if (!isNaN(num) && num !== value) onSave(num);
      else if (draft === "" && value !== null) onSave(null);
    } else {
      if (draft !== String(value ?? "")) onSave(draft || null);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(String(value ?? "")); setEditing(false); }
        }}
        className="w-full bg-white border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
      className={`cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 ${className || ""}`}
      title="Click to edit"
    >
      {displayValue ?? (value !== null && value !== "" ? String(value) : <span className="text-gray-300">—</span>)}
    </span>
  );
}

interface TransactionTableProps {
  transactions: Transaction[];
  categories?: string[];
  onCategoryChange?: (stmtIndex: number, txIndex: number, newCategory: string) => void;
  onFieldChange?: (stmtIndex: number, txIndex: number, field: string, value: string | number | null) => void;
  onSortedRowsChange?: (sortedTransactions: Transaction[]) => void;
}

export function TransactionTable({ transactions, categories, onCategoryChange, onFieldChange, onSortedRowsChange }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const hasPostingDates = transactions.some((t) => t.posting_date);
  const hasSources = transactions.some((t) => t.source);

  const getIndices = (info: { row: { original: Transaction } }) => {
    const orig = info.row.original as unknown as Record<string, unknown>;
    return { stmtIdx: orig._stmtIndex as number, txIdx: orig._txIndex as number };
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => {
          if (!onFieldChange) return info.getValue();
          const { stmtIdx, txIdx } = getIndices(info);
          return (
            <EditableCell
              value={info.getValue()}
              onSave={(v) => onFieldChange(stmtIdx, txIdx, "date", v)}
            />
          );
        },
      }),
      ...(hasPostingDates
        ? [
            columnHelper.accessor("posting_date", {
              header: "Posting Date",
              cell: (info) => {
                if (!onFieldChange) return info.getValue() || "";
                const { stmtIdx, txIdx } = getIndices(info);
                return (
                  <EditableCell
                    value={info.getValue()}
                    onSave={(v) => onFieldChange(stmtIdx, txIdx, "posting_date", v)}
                  />
                );
              },
            }),
          ]
        : []),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => {
          if (!onFieldChange) return <span className="font-medium">{info.getValue()}</span>;
          const { stmtIdx, txIdx } = getIndices(info);
          return (
            <EditableCell
              value={info.getValue()}
              onSave={(v) => onFieldChange(stmtIdx, txIdx, "description", v)}
              displayValue={<span className="font-medium">{info.getValue()}</span>}
            />
          );
        },
      }),
      columnHelper.display({
        id: "spent",
        header: "Spent",
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.type === "debit" ? rowA.original.amount : 0;
          const b = rowB.original.type === "debit" ? rowB.original.amount : 0;
          return a - b;
        },
        cell: (info) => {
          const tx = info.row.original;
          if (tx.type !== "debit") return null;
          const absAmount = Math.abs(tx.amount);
          const display = <span className="text-red-700 font-semibold">{formatCurrency(absAmount)}</span>;
          if (!onFieldChange) return display;
          const { stmtIdx, txIdx } = getIndices(info);
          return (
            <EditableCell
              value={absAmount}
              type="number"
              onSave={(v) => onFieldChange(stmtIdx, txIdx, "amount", v)}
              displayValue={display}
            />
          );
        },
      }),
      columnHelper.display({
        id: "received",
        header: "Received",
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.type === "credit" ? rowA.original.amount : 0;
          const b = rowB.original.type === "credit" ? rowB.original.amount : 0;
          return a - b;
        },
        cell: (info) => {
          const tx = info.row.original;
          if (tx.type !== "credit") return null;
          const absAmount = Math.abs(tx.amount);
          const display = <span className="text-green-700 font-semibold">{formatCurrency(absAmount)}</span>;
          if (!onFieldChange) return display;
          const { stmtIdx, txIdx } = getIndices(info);
          return (
            <EditableCell
              value={absAmount}
              type="number"
              onSave={(v) => onFieldChange(stmtIdx, txIdx, "amount", v)}
              displayValue={display}
            />
          );
        },
      }),
      columnHelper.accessor("balance", {
        header: "Balance",
        cell: (info) => {
          if (!onFieldChange) return formatCurrency(info.getValue());
          const { stmtIdx, txIdx } = getIndices(info);
          return (
            <EditableCell
              value={info.getValue()}
              type="number"
              onSave={(v) => onFieldChange(stmtIdx, txIdx, "balance", v)}
              displayValue={info.getValue() !== null ? formatCurrency(info.getValue()) : undefined}
            />
          );
        },
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => {
          const current = info.getValue();
          if (categories && onCategoryChange) {
            const orig = info.row.original as unknown as Record<string, unknown>;
            const stmtIdx = orig._stmtIndex as number;
            const txIdx = orig._txIndex as number;
            return (
              <select
                value={current}
                onChange={(e) => onCategoryChange(stmtIdx, txIdx, e.target.value)}
                className="appearance-none bg-blue-100 text-blue-800 px-2 py-0.5 pr-5 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%3E%3Cpath%20d%3D%22M0%200l5%206%205-6z%22%20fill%3D%22%231e40af%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_6px] bg-[right_6px_center] bg-no-repeat"
              >
                {[...categories].sort((a, b) => a.localeCompare(b)).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {!categories.includes(current) && (
                  <option value={current}>{current}</option>
                )}
              </select>
            );
          }
          return (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {current}
            </span>
          );
        },
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
    [hasPostingDates, hasSources, categories, onCategoryChange, onFieldChange]
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedRows = table.getSortedRowModel().rows;
  useEffect(() => {
    if (onSortedRowsChange) {
      onSortedRowsChange(sortedRows.map((r) => r.original));
    }
  }, [sortedRows, onSortedRowsChange]);

  return (
    <div className="overflow-auto max-h-[70vh] rounded-lg border border-gray-200">
      <table className="w-max min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
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
