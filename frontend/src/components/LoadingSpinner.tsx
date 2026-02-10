"use client";

import { Loader2 } from "lucide-react";

export function LoadingSpinner({ message = "Processing statements..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
      <p className="text-gray-600 text-lg">{message}</p>
      <p className="text-gray-400 text-sm">
        Extracting transactions from your PDF...
      </p>
    </div>
  );
}
