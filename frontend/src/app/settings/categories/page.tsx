"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Shield,
  ShieldOff,
  Copy,
  Star,
} from "lucide-react";
import Link from "next/link";
import {
  fetchCategoryGroups,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  addCategory,
  updateCategory,
  deleteCategory,
  addRule,
  deleteRule,
} from "@/lib/api-client";
import type { CategoryGroup, CategoryItem, CategoryRule, SimilarityWarning } from "@/lib/types";

export default function CategoriesSettingsPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Group creation
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Inline editing
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDesc, setEditCategoryDesc] = useState("");

  // Add category
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Add rule
  const [addingRuleCatId, setAddingRuleCatId] = useState<string | null>(null);
  const [newRuleType, setNewRuleType] = useState<"include" | "exclude">("include");
  const [newRulePattern, setNewRulePattern] = useState("");

  // Warnings
  const [warning, setWarning] = useState<SimilarityWarning | null>(null);
  const [error, setError] = useState("");

  const loadGroups = useCallback(async () => {
    try {
      const data = await fetchCategoryGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        const active = data.find((g) => g.is_active);
        setSelectedGroupId(active?.id ?? data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (session) loadGroups();
  }, [session, loadGroups]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      setError("");
      const group = await createCategoryGroup(name);
      setGroups((prev) => [...prev, group]);
      setSelectedGroupId(group.id);
      setCreatingGroup(false);
      setNewGroupName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    }
  };

  const handleSetActive = async (groupId: string) => {
    try {
      setError("");
      await updateCategoryGroup(groupId, { is_active: true });
      setGroups((prev) =>
        prev.map((g) => ({ ...g, is_active: g.id === groupId }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set active group");
    }
  };

  const handleRenameGroup = async (groupId: string) => {
    const name = editGroupName.trim();
    if (!name) return;
    try {
      setError("");
      const updated = await updateCategoryGroup(groupId, { name });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
      setEditingGroupId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename group");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Delete this category group and all its categories/rules?")) return;
    try {
      setError("");
      await deleteCategoryGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedGroupId === groupId) {
        setSelectedGroupId(groups.find((g) => g.id !== groupId)?.id ?? null);
      }
      // Reload to get updated active status
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  const handleDuplicateGroup = async (group: CategoryGroup) => {
    try {
      setError("");
      const newGroup = await createCategoryGroup(`${group.name} (Copy)`);
      // Delete the default categories that were auto-created
      for (const cat of newGroup.categories) {
        await deleteCategory(cat.id);
      }
      // Re-create categories from source group
      for (const cat of group.categories) {
        const result = await addCategory(newGroup.id, {
          name: cat.name,
          description: cat.description ?? undefined,
        });
        // Re-create rules for each category
        for (const rule of cat.rules) {
          await addRule(result.category.id, {
            rule_type: rule.rule_type,
            pattern: rule.pattern,
          });
        }
      }
      await loadGroups();
      setSelectedGroupId(newGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate group");
    }
  };

  const handleAddCategory = async () => {
    if (!selectedGroupId || !newCatName.trim()) return;
    try {
      setError("");
      setWarning(null);
      const result = await addCategory(selectedGroupId, {
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      if (result.warning) setWarning(result.warning);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroupId
            ? { ...g, categories: [...g.categories, result.category] }
            : g
        )
      );
      setNewCatName("");
      setNewCatDesc("");
      setAddingCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    }
  };

  const handleUpdateCategory = async (catId: string) => {
    const name = editCategoryName.trim();
    if (!name) return;
    try {
      setError("");
      setWarning(null);
      const result = await updateCategory(catId, {
        name,
        description: editCategoryDesc.trim() || undefined,
      });
      if (result.warning) setWarning(result.warning);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroupId
            ? {
                ...g,
                categories: g.categories.map((c) =>
                  c.id === catId ? result.category : c
                ),
              }
            : g
        )
      );
      setEditingCategoryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      setError("");
      await deleteCategory(catId);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroupId
            ? { ...g, categories: g.categories.filter((c) => c.id !== catId) }
            : g
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  const handleAddRule = async (catId: string) => {
    const pattern = newRulePattern.trim();
    if (!pattern) return;
    try {
      setError("");
      setWarning(null);
      const result = await addRule(catId, {
        rule_type: newRuleType,
        pattern,
      });
      if (result.warning) setWarning(result.warning);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroupId
            ? {
                ...g,
                categories: g.categories.map((c) =>
                  c.id === catId
                    ? { ...c, rules: [...c.rules, result.rule] }
                    : c
                ),
              }
            : g
        )
      );
      setNewRulePattern("");
      setAddingRuleCatId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rule");
    }
  };

  const handleDeleteRule = async (catId: string, ruleId: string) => {
    try {
      setError("");
      await deleteRule(ruleId);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroupId
            ? {
                ...g,
                categories: g.categories.map((c) =>
                  c.id === catId
                    ? { ...c, rules: c.rules.filter((r) => r.id !== ruleId) }
                    : c
                ),
              }
            : g
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  if (!session) return null;

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Category Groups</h1>
        <p className="text-gray-600 mb-6">
          Manage category groups with custom rules for automatic transaction categorization.
          Rules override AI — if a transaction description matches a rule, that category is used automatically.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button onClick={() => setError("")} className="ml-2 text-red-500 hover:text-red-700">
              <X className="h-3.5 w-3.5 inline" />
            </button>
          </div>
        )}

        {warning && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{warning.message}</span>
            <button onClick={() => setWarning(null)} className="ml-auto text-amber-500 hover:text-amber-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* Left: Group List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Groups</h2>
                <button
                  onClick={() => setCreatingGroup(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>

              {creatingGroup && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="text"
                    placeholder="Group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim()}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setCreatingGroup(false); setNewGroupName(""); }}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {groups.length === 0 && !creatingGroup && (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No groups yet. Create one to get started.
                </p>
              )}

              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                    selectedGroupId === group.id
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  {editingGroupId === group.id ? (
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameGroup(group.id);
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button onClick={() => handleRenameGroup(group.id)} className="text-green-600 hover:text-green-700">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingGroupId(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{group.name}</span>
                        {group.is_active && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full">
                            <Star className="h-2.5 w-2.5" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {group.categories.length} categories
                        {group.categories.reduce((sum, c) => sum + c.rules.length, 0) > 0 &&
                          ` · ${group.categories.reduce((sum, c) => sum + c.rules.length, 0)} rules`}
                      </p>
                      <div
                        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                        style={{ opacity: selectedGroupId === group.id ? 1 : undefined }}
                      >
                        {!group.is_active && (
                          <button
                            onClick={() => handleSetActive(group.id)}
                            title="Set as active"
                            className="p-1 text-gray-400 hover:text-green-600 rounded"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicateGroup(group)}
                          title="Duplicate group"
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingGroupId(group.id); setEditGroupName(group.name); }}
                          title="Rename"
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          title="Delete"
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Right: Categories + Rules */}
            <div>
              {selectedGroup ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedGroup.name}
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({selectedGroup.categories.length} categories)
                      </span>
                    </h2>
                    <button
                      onClick={() => setAddingCategory(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Category
                    </button>
                  </div>

                  {addingCategory && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Category name"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={newCatDesc}
                          onChange={(e) => setNewCatDesc(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleAddCategory}
                            disabled={!newCatName.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setAddingCategory(false); setNewCatName(""); setNewCatDesc(""); }}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {[...selectedGroup.categories]
                      .sort((a, b) => {
                        if (a.name.toLowerCase() === "other") return -1;
                        if (b.name.toLowerCase() === "other") return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((cat) => (
                      <div
                        key={cat.id}
                        className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                      >
                        {/* Category Header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() =>
                            setExpandedCategoryId(
                              expandedCategoryId === cat.id ? null : cat.id
                            )
                          }
                        >
                          {expandedCategoryId === cat.id ? (
                            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}

                          {editingCategoryId === cat.id ? (
                            <div
                              className="flex-1 flex flex-col sm:flex-row gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdateCategory(cat.id);
                                  if (e.key === "Escape") setEditingCategoryId(null);
                                }}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editCategoryDesc}
                                onChange={(e) => setEditCategoryDesc(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdateCategory(cat.id);
                                  if (e.key === "Escape") setEditingCategoryId(null);
                                }}
                                placeholder="Description"
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex gap-1">
                                <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-600 hover:text-green-700 p-1">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => setEditingCategoryId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                                {cat.description && (
                                  <span className="text-xs text-gray-500 ml-2">{cat.description}</span>
                                )}
                              </div>
                              {cat.rules.length > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                  {cat.rules.length} rule{cat.rules.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditCategoryName(cat.name);
                                    setEditCategoryDesc(cat.description ?? "");
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                  title="Edit category"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {cat.name.toLowerCase() !== "other" && (
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                    title="Delete category"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Rules Section (expanded) */}
                        {expandedCategoryId === cat.id && (
                          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Auto-categorize Rules
                              </h4>
                              <button
                                onClick={() => {
                                  setAddingRuleCatId(cat.id);
                                  setNewRulePattern("");
                                  setNewRuleType("include");
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                              >
                                <Plus className="h-3 w-3" />
                                Add Rule
                              </button>
                            </div>

                            {cat.rules.length === 0 && addingRuleCatId !== cat.id && (
                              <p className="text-xs text-gray-400 py-2">
                                No rules yet. Add include rules to auto-match transactions by description.
                              </p>
                            )}

                            {cat.rules.map((rule) => (
                              <div
                                key={rule.id}
                                className="flex items-center gap-2 py-1.5 text-sm group"
                              >
                                {rule.rule_type === "include" ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded">
                                    <Shield className="h-3 w-3" />
                                    INCLUDE
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded">
                                    <ShieldOff className="h-3 w-3" />
                                    EXCLUDE
                                  </span>
                                )}
                                <code className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700 flex-1 truncate">
                                  {rule.pattern}
                                </code>
                                <button
                                  onClick={() => handleDeleteRule(cat.id, rule.id)}
                                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}

                            {addingRuleCatId === cat.id && (
                              <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <select
                                    value={newRuleType}
                                    onChange={(e) => setNewRuleType(e.target.value as "include" | "exclude")}
                                    className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="include">Include</option>
                                    <option value="exclude">Exclude</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder='Pattern (e.g., "AMAZON" or "TIM HORTONS")'
                                    value={newRulePattern}
                                    onChange={(e) => setNewRulePattern(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddRule(cat.id)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleAddRule(cat.id)}
                                      disabled={!newRulePattern.trim()}
                                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => setAddingRuleCatId(null)}
                                      className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5">
                                  Include: if description contains this pattern, assign this category.
                                  Exclude: skip this category even if an include rule matches.
                                  Matching is case-insensitive.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  {groups.length > 0
                    ? "Select a group to manage its categories"
                    : "Create your first category group to get started"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
