import { apiBaseUrl, ngrokHeaders } from "./config.js";
import { getCsrfToken } from "./auth.js";

let authErrorHandler = null;

export function setAuthErrorHandler(handler) {
  authErrorHandler = typeof handler === "function" ? handler : null;
}

export function notifyAuthError(error) {
  if (!error) return;
  if (error.code === "E2000" || error.code === "E2002") {
    authErrorHandler?.(error);
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch (_err) {
    return null;
  }
}

async function normalizeResponse(res) {
  const payload = await safeJson(res);
  if (res.ok) {
    return payload;
  }
  if (payload?.error) {
    const error = new Error(payload.error.message);
    error.code = payload.error.code;
    error.requestId = payload.error.request_id;
    notifyAuthError(error);
    throw error;
  }
  const error = new Error(res.statusText || "Unexpected error");
  error.status = res.status;
  if (res.status === 429) {
    error.code = "E1005";
  }
  if (res.status === 401) {
    error.code = "E2000";
  }
  notifyAuthError(error);
  throw error;
}

function buildUrl(path, params) {
  const url = new URL(`${apiBaseUrl()}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const error = new Error("Backend unavailable. Check your tunnel connection.");
    error.code = "E_NETWORK";
    error.cause = err;
    throw error;
  }
}

export async function get(path, params) {
  const res = await safeFetch(buildUrl(path, params), {
    credentials: "include",
    headers: {
      ...ngrokHeaders(),
    },
  });
  return normalizeResponse(res);
}

export async function post(path, body, requiresCsrf = true) {
  return sendWithBody("POST", path, body, requiresCsrf);
}

export async function patch(path, body) {
  return sendWithBody("PATCH", path, body, true);
}

export async function del(path) {
  return sendWithBody("DELETE", path, null, true);
}

async function sendWithBody(method, path, body, csrf) {
  const headers = { "Content-Type": "application/json", ...ngrokHeaders() };
  if (csrf) {
    headers["X-CSRF-Token"] = await getCsrfToken();
  }
  const res = await safeFetch(buildUrl(path), {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  return normalizeResponse(res);
}

export async function getMe() {
  return get("/auth/me");
}

export async function getAdminUsers(params) {
  return get("/admin/users", params);
}

export async function patchAdminUser(userId, body) {
  return patch(`/admin/users/${userId}`, body);
}

export async function getAdminUsage(params) {
  return get("/admin/usage", params);
}

export async function getAdminAudit(params) {
  return get("/admin/audit", params);
}

export async function getAdminInvites() {
  return get("/admin/invites");
}

export async function postAdminInvite(body) {
  return post("/admin/invites", body);
}
