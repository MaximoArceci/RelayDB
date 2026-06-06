import { apiFetch } from "./client";
import { responseError } from "./errors";
import type { Snapshot, SnapshotListResponse } from "../types/snapshots";

export async function getSnapshots(signal?: AbortSignal) {
  const response = await apiFetch("/api/v1/snapshots", {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw await responseError(response, `Snapshot list failed with ${response.status}`);
  }

  return response.json() as Promise<SnapshotListResponse>;
}

export async function createSnapshot(environmentId: string, name: string) {
  const response = await apiFetch(`/api/v1/environments/${environmentId}/snapshots`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw await responseError(response, `Snapshot creation failed with ${response.status}`);
  }

  return response.json() as Promise<Snapshot>;
}

export async function uploadSnapshot(environmentId: string, name: string, file: File) {
  const formData = new FormData();
  formData.append("environment_id", environmentId);
  formData.append("name", name);
  formData.append("file", file);

  const response = await apiFetch("/api/v1/snapshots/upload", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });

  if (!response.ok) {
    throw await responseError(response, `Snapshot upload failed with ${response.status}`);
  }

  return response.json() as Promise<Snapshot>;
}

export async function downloadSnapshot(snapshotId: string) {
  const response = await apiFetch(`/api/v1/snapshots/${snapshotId}/download`, {
    headers: { Accept: "application/octet-stream" },
  });

  if (!response.ok) {
    throw await responseError(response, `Snapshot download failed with ${response.status}`);
  }

  return response.blob();
}

export async function restoreSnapshot(snapshotId: string, environmentId: string) {
  const response = await apiFetch(`/api/v1/snapshots/${snapshotId}/restore/${environmentId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw await responseError(response, `Snapshot restore failed with ${response.status}`);
  }

  return response.json() as Promise<Snapshot>;
}

export async function deleteSnapshot(snapshotId: string) {
  const response = await apiFetch(`/api/v1/snapshots/${snapshotId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw await responseError(response, `Snapshot delete failed with ${response.status}`);
  }

  return response.json() as Promise<Snapshot>;
}
