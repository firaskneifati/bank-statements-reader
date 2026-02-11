"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export interface UploadProgressData {
  total: number;
  completed: number;
  currentFile: string | null;
  completedFiles: string[];
  failedFiles: { name: string; error: string }[];
}

export function UploadProgress({ progress }: { progress: UploadProgressData }) {
  const { total, completed, currentFile, completedFiles, failedFiles } = progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Uploading statements
          </h3>
          <span className="text-sm text-gray-500">
            {completed} of {total} files
          </span>
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
          {completedFiles.map((name) => (
            <li key={name} className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{name}</span>
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
