import { apiBaseUrl, ngrokHeaders } from "./config.js";

const authState = {
  csrfToken: null,
};

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

async function fetchCsrfToken() {
  const res = await safeFetch(`${apiBaseUrl()}/api/auth/csrf`, {
    credentials: "include",
    headers: {
      ...ngrokHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error("Unable to refresh CSRF token");
  }
  const payload = await res.json();
  authState.csrfToken = payload.csrf_token;
  return authState.csrfToken;
}

export async function getCsrfToken() {
  if (authState.csrfToken) {
    return authState.csrfToken;
  }
  return fetchCsrfToken();
}

export async function login(credentials) {
  const res = await safeFetch(`${apiBaseUrl()}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...ngrokHeaders(),
    },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    if (payload?.error?.message) {
      const error = new Error(payload.error.message);
      error.code = payload.error.code;
      error.requestId = payload.error.request_id;
      throw error;
    }
    throw new Error("Invalid credentials");
  }
  await fetchCsrfToken();
  return res.json();
}

export async function register(payload) {
  const res = await safeFetch(`${apiBaseUrl()}/api/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...ngrokHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.error?.message) {
      const error = new Error(body.error.message);
      error.code = body.error.code;
      error.requestId = body.error.request_id;
      throw error;
    }
    throw new Error("Registration failed");
  }
  const data = await res.json();
  if (data?.csrf_token) {
    authState.csrfToken = data.csrf_token;
  } else {
    await fetchCsrfToken();
  }
  return data;
}

export async function logout() {
  const token = await getCsrfToken();
  await safeFetch(`${apiBaseUrl()}/api/auth/logout`, {
    credentials: "include",
    method: "POST",
    headers: { "X-CSRF-Token": token, ...ngrokHeaders() },
  });
  authState.csrfToken = null;
}
