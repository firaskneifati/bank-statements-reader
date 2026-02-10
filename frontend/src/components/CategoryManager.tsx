"use client";

import { useState } from "react";
import { X, Plus, RotateCcw, Tag } from "lucide-react";
import { CategoryConfig, DEFAULT_CATEGORIES } from "@/lib/types";

interface CategoryManagerProps {
  categories: CategoryConfig[];
  onChange: (categories: CategoryConfig[]) => void;
}

export function CategoryManager({ categories, onChange }: CategoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleRemove = (index: number) => {
    const updated = categories.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAdd = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) return;

    onChange([...categories, { name: trimmedName, description: newDescription.trim() }]);
    setNewName("");
    setNewDescription("");
    setIsAdding(false);
  };

  const handleReset = () => {
    onChange([...DEFAULT_CATEGORIES]);
  };

  const isDefault =
    categories.length === DEFAULT_CATEGORIES.length &&
    categories.every((c, i) => c.name === DEFAULT_CATEGORIES[i].name);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
          <span className="text-xs text-gray-400">({categories.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Defaults
            </button>
          )}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                  setNewDescription("");
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat, index) => (
          <span
            key={cat.name}
            title={cat.description || cat.name}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full group hover:bg-gray-200 transition-colors"
          >
            {cat.name}
            <button
              onClick={() => handleRemove(index)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              aria-label={`Remove ${cat.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
