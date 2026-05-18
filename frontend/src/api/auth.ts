import type { AuthResponse, User } from "../types/auth";

const authTokenKey = "relaydb.auth_token";

export function getAuthToken() {
  return window.localStorage.getItem(authTokenKey);
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(authTokenKey, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(authTokenKey);
}

export async function login(payload: { email: string; password: string }) {
  return authPost<AuthResponse>("/api/v1/auth/login", payload);
}

export async function register(payload: { email: string; password: string; name: string }) {
  return authPost<AuthResponse>("/api/v1/auth/register", payload);
}

export async function getCurrentUser(signal?: AbortSignal) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Missing authentication token");
  }

  const response = await fetch("/api/v1/auth/me", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Authentication check failed with ${response.status}`);
  }

  return response.json() as Promise<User>;
}

export async function logout() {
  const token = getAuthToken();
  if (!token) {
    return;
  }
  await fetch("/api/v1/auth/logout", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  clearAuthToken();
}

async function authPost<T>(path: string, payload: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Authentication request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
