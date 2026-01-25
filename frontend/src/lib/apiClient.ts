let API_BASE = "";

export function initApi(baseUrl: string) {
  API_BASE = baseUrl.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  return API_BASE;
}

export function apiUrl(path: string) {
  if (!API_BASE) {
    throw new Error("API not initialized");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

import { getAccessToken, getCsrfToken } from "./authStore";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = apiUrl(path);
  const token = getAccessToken();
  const csrfToken = getCsrfToken();
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  const requiresCsrf = !token && !["GET", "HEAD", "OPTIONS"].includes(method);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (requiresCsrf && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(url, {
    ...init,
    credentials: init.credentials ?? "include",
    headers,
  });
}

export function sseUrl(path: string) {
  return apiUrl(path);
}
