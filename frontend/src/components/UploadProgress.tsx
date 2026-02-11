"use client";

import { CheckCircle2, XCircle, Loader2, StopCircle } from "lucide-react";

export interface UploadProgressData {
  total: number;
  completed: number;
  currentFile: string | null;
  completedFiles: { name: string; pages: number }[];
  failedFiles: { name: string; error: string }[];
}

interface UploadProgressProps {
  progress: UploadProgressData;
  onCancel?: () => void;
}

export function UploadProgress({ progress, onCancel }: UploadProgressProps) {
  const { total, completed, currentFile, completedFiles, failedFiles } = progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Uploading statements
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {completed} of {total} files
            </span>
            {onCancel && currentFile && (
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <StopCircle className="h-3.5 w-3.5" />
                Stop
              </button>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {currentFile && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          <span className="truncate">Processing: {currentFile}</span>
        </div>
      )}

      {completedFiles.length > 0 && (
        <ul className="space-y-1">
          {completedFiles.map((f) => (
            <li key={f.name} className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{f.name}</span>
              <span className="text-green-500 text-xs whitespace-nowrap">({f.pages} {f.pages === 1 ? "page" : "pages"})</span>
            </li>
          ))}
        </ul>
      )}

      {failedFiles.length > 0 && (
        <ul className="space-y-1">
          {failedFiles.map((f) => (
            <li key={f.name} className="flex items-center gap-2 text-sm text-red-700">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{f.name}: {f.error}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
