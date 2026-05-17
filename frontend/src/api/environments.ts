import { apiGet } from "./client";
import type { ActiveEnvironmentResponse, EnvironmentsResponse, PostgresEnvironment } from "../types/environments";

export function getEnvironments(signal?: AbortSignal) {
  return apiGet<EnvironmentsResponse>("/api/v1/environments", signal);
}

export function getActiveEnvironment(signal?: AbortSignal) {
  return apiGet<ActiveEnvironmentResponse>("/api/v1/environments/active", signal);
}

export async function switchEnvironment(environmentId: string) {
  const response = await fetch(`/api/v1/environments/active/${environmentId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Environment switch failed with ${response.status}`);
  }

  return response.json() as Promise<{ active: PostgresEnvironment; stable_endpoint: string }>;
}

export async function registerEnvironment(payload: Omit<PostgresEnvironment, "id">) {
  const response = await fetch("/api/v1/environments", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Environment registration failed with ${response.status}`);
  }

  return response.json() as Promise<PostgresEnvironment>;
}
