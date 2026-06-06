import { responseError } from "./errors";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await apiFetch(path, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw await responseError(response, `RelayDB API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
