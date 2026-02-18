import { getSession, signOut } from "next-auth/react";
import { UploadResponse, ExportRequest, CategoryConfig, UsageStats, BillingStatus, CategoryGroup, SimilarityWarning, Transaction } from "./types";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  if (session?.accessToken) {
    return { Authorization: `Bearer ${session.accessToken}` };
  }
  return {};
}

async function handleResponse(response: Response, fallbackMsg: string): Promise<Response> {
  if (response.status === 401) {
    await signOut({ callbackUrl: "/sign-in" });
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: fallbackMsg }));
    throw new Error(error.detail || `${fallbackMsg} (${response.status})`);
  }
  return response;
}

export async function uploadSingleStatement(
  file: File,
  categories?: CategoryConfig[],
  categoryGroupId?: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("files", file);
  if (categoryGroupId) {
    formData.append("category_group_id", categoryGroupId);
  } else if (categories && categories.length > 0) {
    formData.append("categories", JSON.stringify(categories));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min per file

  const authHeaders = await getAuthHeaders();

  const response = await fetch("/api/v1/upload", {
    method: "POST",
    headers: { ...authHeaders },
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  await handleResponse(response, "Upload failed");
  return response.json();
}

export async function uploadStatements(
  files: File[],
  categories?: CategoryConfig[]
): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (categories && categories.length > 0) {
    formData.append("categories", JSON.stringify(categories));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout

  const authHeaders = await getAuthHeaders();

  const response = await fetch("/api/v1/upload", {
    method: "POST",
    headers: { ...authHeaders },
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  await handleResponse(response, "Upload failed");
  return response.json();
}

export async function fetchUsage(): Promise<UsageStats> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch("/api/v1/usage", {
    headers: { ...authHeaders },
  });

  await handleResponse(response, "Failed to fetch usage");
  return response.json();
}

export async function createCheckoutSession(plan: string): Promise<{ url: string }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({
      plan,
      success_url: `${window.location.origin}/settings/billing?success=true`,
      cancel_url: `${window.location.origin}/settings/billing?cancelled=true`,
    }),
  });

  await handleResponse(response, "Failed to create checkout session");
  return response.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({
      return_url: `${window.location.origin}/settings/billing`,
    }),
  });

  await handleResponse(response, "Failed to create portal session");
  return response.json();
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/status", {
    headers: { ...authHeaders },
  });

  await handleResponse(response, "Failed to fetch billing status");
  return response.json();
}

export async function syncBilling(): Promise<{ plan: string }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
  });

  await handleResponse(response, "Failed to sync billing");
  return response.json();
}

export async function cancelSubscription(): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
  });

  await handleResponse(response, "Failed to cancel subscription");
}

export async function exportTransactions(request: ExportRequest): Promise<void> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch("/api/v1/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(request),
  });

  await handleResponse(response, "Export failed");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${request.filename}${request.format === "quickbooks" ? "_quickbooks" : ""}.${request.format === "xlsx" ? "xlsx" : "csv"}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Category Groups API ───────────────────────────────────────────

export async function fetchCategoryGroups(): Promise<CategoryGroup[]> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/category-groups", {
    headers: { ...authHeaders },
  });
  await handleResponse(response, "Failed to fetch category groups");
  return response.json();
}

export async function createCategoryGroup(name: string): Promise<CategoryGroup> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/category-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ name }),
  });
  await handleResponse(response, "Failed to create category group");
  return response.json();
}

export async function updateCategoryGroup(
  id: string,
  data: { name?: string; is_active?: boolean }
): Promise<CategoryGroup> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/category-groups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  await handleResponse(response, "Failed to update category group");
  return response.json();
}

export async function deleteCategoryGroup(id: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/category-groups/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders },
  });
  await handleResponse(response, "Failed to delete category group");
}

export async function addCategory(
  groupId: string,
  data: { name: string; description?: string }
): Promise<{ category: CategoryGroup["categories"][0]; warning: SimilarityWarning | null }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/category-groups/${groupId}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  await handleResponse(response, "Failed to add category");
  return response.json();
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string }
): Promise<{ category: CategoryGroup["categories"][0]; warning: SimilarityWarning | null }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  await handleResponse(response, "Failed to update category");
  return response.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/categories/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders },
  });
  await handleResponse(response, "Failed to delete category");
}

export async function addRule(
  categoryId: string,
  data: { rule_type: "include" | "exclude"; pattern: string }
): Promise<{ rule: CategoryGroup["categories"][0]["rules"][0]; warning: SimilarityWarning | null }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/categories/${categoryId}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  await handleResponse(response, "Failed to add rule");
  return response.json();
}

export async function updateRule(
  id: string,
  data: { rule_type?: "include" | "exclude"; pattern?: string }
): Promise<{ rule: CategoryGroup["categories"][0]["rules"][0]; warning: SimilarityWarning | null }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/rules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  await handleResponse(response, "Failed to update rule");
  return response.json();
}

export async function deleteRule(id: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/rules/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders },
  });
  await handleResponse(response, "Failed to delete rule");
}

export async function applyRules(
  groupId: string,
  transactions: Transaction[]
): Promise<{ transactions: Transaction[]; rules_applied: number }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`/api/v1/category-groups/${groupId}/apply-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ transactions }),
  });
  await handleResponse(response, "Failed to apply rules");
  return response.json();
}
