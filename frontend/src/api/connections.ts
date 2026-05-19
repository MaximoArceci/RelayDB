import { apiGet } from "./client";
import type { ConnectionSlot, ConnectionsResponse, CreateConnectionPayload } from "../types/connections";

export function getConnections(signal?: AbortSignal) {
  return apiGet<ConnectionsResponse>("/api/v1/connections", signal);
}

export async function createConnection(payload: CreateConnectionPayload) {
  const response = await fetch("/api/v1/connections", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `Connection creation failed with ${response.status}`);
  }

  return response.json() as Promise<ConnectionSlot>;
}

export async function switchConnection(connectionId: string, environmentId: string) {
  const response = await fetch(`/api/v1/connections/${connectionId}/switch/${environmentId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `Connection switch failed with ${response.status}`);
  }

  return response.json() as Promise<ConnectionSlot>;
}

export async function deleteConnection(connectionId: string) {
  const response = await fetch(`/api/v1/connections/${connectionId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `Connection delete failed with ${response.status}`);
  }

  return response.json() as Promise<ConnectionSlot>;
}
