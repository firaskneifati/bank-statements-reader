"use client";

import { useState } from "react";
import { X, Zap, Pencil } from "lucide-react";
import { addRule } from "@/lib/api-client";

interface AutoRuleToastProps {
  description: string;
  newCategory: string;
  categoryId: string;
  oldCategory: string;
  categorySource: "ai" | "rule" | "manual" | undefined;
  onCreated: () => void;
  onDismiss: () => void;
}

export function AutoRuleToast({
  description,
  newCategory,
  categoryId,
  oldCategory,
  categorySource,
  onCreated,
  onDismiss,
}: AutoRuleToastProps) {
  const [editing, setEditing] = useState(false);
  const [pattern, setPattern] = useState(description);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmed = pattern.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await addRule(categoryId, { rule_type: "include", pattern: trimmed });
      onCreated();
    } catch {
      // Silently dismiss on error — not critical
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  const isRuleOverride = categorySource === "rule";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full mx-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Zap className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {isRuleOverride ? "Update categorization rule?" : "Create auto-categorization rule?"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Transactions containing &quot;{editing ? "" : pattern.slice(0, 60)}{pattern.length > 60 && !editing ? "..." : ""}&quot; → <strong>{newCategory}</strong>
            </p>

            {editing ? (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            ) : null}

            <div className="mt-2.5 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving || !pattern.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Create Rule"}
              </button>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Pattern
                </button>
              )}
              <button
                onClick={onDismiss}
                className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
