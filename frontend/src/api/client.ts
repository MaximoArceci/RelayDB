const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`NexusOps API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
