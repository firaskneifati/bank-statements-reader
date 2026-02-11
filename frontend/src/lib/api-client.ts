import { getSession } from "next-auth/react";
import { UploadResponse, ExportRequest, CategoryConfig, UsageStats } from "./types";

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
  a.download = `${request.filename}.${request.format === "xlsx" ? "xlsx" : "csv"}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
