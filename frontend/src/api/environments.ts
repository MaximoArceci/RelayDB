import { apiGet, authHeaders } from "./client";
import type { ActiveEnvironmentResponse, CreateEnvironmentPayload, EnvironmentsResponse, PostgresEnvironment } from "../types/environments";

export function getEnvironments(signal?: AbortSignal) {
  return apiGet<EnvironmentsResponse>("/api/v1/environments", signal);
}

export function getActiveEnvironment(signal?: AbortSignal) {
  return apiGet<ActiveEnvironmentResponse>("/api/v1/environments/active", signal);
}

export async function switchEnvironment(environmentId: string) {
  const response = await fetch(`/api/v1/environments/active/${environmentId}`, {
    method: "POST",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Environment switch failed with ${response.status}`);
  }

  return response.json() as Promise<{ active: PostgresEnvironment; stable_endpoint: string }>;
}

export async function registerEnvironment(payload: Omit<PostgresEnvironment, "id">) {
  const response = await fetch("/api/v1/environments", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Environment registration failed with ${response.status}`);
  }

  return response.json() as Promise<PostgresEnvironment>;
}

export async function createEnvironment(payload: CreateEnvironmentPayload) {
  const response = await fetch("/api/v1/environments/create", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Environment provisioning failed with ${response.status}`);
  }

  return response.json() as Promise<PostgresEnvironment>;
}

export async function startEnvironment(environmentId: string) {
  const response = await fetch(`/api/v1/environments/${environmentId}/start`, {
    method: "POST",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Environment start failed with ${response.status}`);
  }

  return response.json() as Promise<PostgresEnvironment>;
}

export async function stopEnvironment(environmentId: string) {
  const response = await fetch(`/api/v1/environments/${environmentId}/stop`, {
    method: "POST",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Environment stop failed with ${response.status}`);
  }

  return response.json() as Promise<PostgresEnvironment>;
}

export async function deleteEnvironment(environmentId: string, removeVolume = false) {
  const response = await fetch(`/api/v1/environments/${environmentId}?remove_volume=${removeVolume}`, {
    method: "DELETE",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Environment delete failed with ${response.status}`);
  }

  return response.json() as Promise<PostgresEnvironment>;
}
