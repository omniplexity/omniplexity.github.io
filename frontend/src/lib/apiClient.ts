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

import { getAccessToken } from "./authStore";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = apiUrl(path);
  const token = getAccessToken();
  return fetch(url, {
    ...init,
    credentials: init.credentials ?? "omit",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

export function sseUrl(path: string) {
  return apiUrl(path);
}
