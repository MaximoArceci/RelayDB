export async function responseError(response: Response, fallback: string) {
  const detail = await response.json().catch(() => null);
  const message = typeof detail?.detail === "string" ? detail.detail : fallback;
  return new Error(message);
}
