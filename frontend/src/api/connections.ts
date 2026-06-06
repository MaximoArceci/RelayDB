import { apiFetch, apiGet } from "./client";
import { responseError } from "./errors";
import type { ConnectionSlot, ConnectionsResponse, CreateConnectionPayload, UpdateConnectionPayload } from "../types/connections";

export function getConnections(signal?: AbortSignal) {
  return apiGet<ConnectionsResponse>("/api/v1/connections", signal);
}

export async function createConnection(payload: CreateConnectionPayload) {
  const response = await apiFetch("/api/v1/connections", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await responseError(response, `Connection creation failed with ${response.status}`);
  }

  return response.json() as Promise<ConnectionSlot>;
}

export async function switchConnection(connectionId: string, environmentId: string) {
  const response = await apiFetch(`/api/v1/connections/${connectionId}/switch/${environmentId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw await responseError(response, `Connection switch failed with ${response.status}`);
  }

  return response.json() as Promise<ConnectionSlot>;
}

export async function updateConnection(connectionId: string, payload: UpdateConnectionPayload) {
  const response = await apiFetch(`/api/v1/connections/${connectionId}`, {
    method: "PATCH",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await responseError(response, `Connection update failed with ${response.status}`);
  }

  return response.json() as Promise<ConnectionSlot>;
}

export async function deleteConnection(connectionId: string) {
  const response = await apiFetch(`/api/v1/connections/${connectionId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw await responseError(response, `Connection delete failed with ${response.status}`);
  }

  return response.json() as Promise<ConnectionSlot>;
}
