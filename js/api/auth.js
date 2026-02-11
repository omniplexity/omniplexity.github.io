import { fetchJson } from "./client.js";
import { getCsrfToken, clearCsrfToken } from "./csrf.js";

export async function meta() {
  try {
    return await fetchJson("/v1/meta", { method: "GET" });
  } catch (e) {
    if (e?.status === 401) return { authenticated: false };
    throw e;
  }
}

export async function login(username, password) {
  const csrf = await getCsrfToken();
  return await fetchJson("/v1/auth/login", {
    method: "POST",
    headers: { "X-CSRF-Token": csrf },
    body: { username, password }
  });
}

export async function logout() {
  const csrf = await getCsrfToken();
  try {
    return await fetchJson("/v1/auth/logout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: {}
    });
  } finally {
    clearCsrfToken();
  }
}
