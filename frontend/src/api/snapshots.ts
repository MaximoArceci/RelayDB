import type { Snapshot, SnapshotListResponse } from "../types/snapshots";

export async function getSnapshots(signal?: AbortSignal) {
  const response = await fetch("/api/v1/snapshots", {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Snapshot list failed with ${response.status}`);
  }

  return response.json() as Promise<SnapshotListResponse>;
}

export async function createSnapshot(environmentId: string, name: string) {
  const response = await fetch(`/api/v1/environments/${environmentId}/snapshots`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `Snapshot creation failed with ${response.status}`);
  }

  return response.json() as Promise<Snapshot>;
}

export async function restoreSnapshot(snapshotId: string, environmentId: string) {
  const response = await fetch(`/api/v1/snapshots/${snapshotId}/restore/${environmentId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `Snapshot restore failed with ${response.status}`);
  }

  return response.json() as Promise<Snapshot>;
}

export async function deleteSnapshot(snapshotId: string) {
  const response = await fetch(`/api/v1/snapshots/${snapshotId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `Snapshot delete failed with ${response.status}`);
  }

  return response.json() as Promise<Snapshot>;
}
