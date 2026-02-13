import { getSession } from "next-auth/react";
import { UploadResponse, ExportRequest, CategoryConfig, UsageStats, BillingStatus } from "./types";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  if (session?.accessToken) {
    return { Authorization: `Bearer ${session.accessToken}` };
  }
  return {};
}

export async function uploadSingleStatement(
  file: File,
  categories?: CategoryConfig[]
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("files", file);
  if (categories && categories.length > 0) {
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || `Upload failed (${response.status})`);
  }

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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || `Upload failed (${response.status})`);
  }

  return response.json();
}

export async function fetchUsage(): Promise<UsageStats> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch("/api/v1/usage", {
    headers: { ...authHeaders },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch usage" }));
    throw new Error(error.detail || `Failed to fetch usage (${response.status})`);
  }

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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to create checkout session" }));
    throw new Error(error.detail || `Checkout failed (${response.status})`);
  }

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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to create portal session" }));
    throw new Error(error.detail || `Portal failed (${response.status})`);
  }

  return response.json();
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/status", {
    headers: { ...authHeaders },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch billing status" }));
    throw new Error(error.detail || `Failed to fetch billing (${response.status})`);
  }

  return response.json();
}

export async function syncBilling(): Promise<{ plan: string }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to sync billing" }));
    throw new Error(error.detail || `Sync failed (${response.status})`);
  }

  return response.json();
}

export async function cancelSubscription(): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/v1/billing/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to cancel subscription" }));
    throw new Error(error.detail || `Cancel failed (${response.status})`);
  }
}

export async function exportTransactions(request: ExportRequest): Promise<void> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch("/api/v1/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(error.detail || `Export failed (${response.status})`);
  }

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
