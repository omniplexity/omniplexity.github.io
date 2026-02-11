import { fetchJson } from "./client.js";
import { getCsrfToken, clearCsrfToken } from "./csrf.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function meta() {
  try {
    return await fetchJson("/v1/meta", { method: "GET" });
  } catch (e) {
    if (e?.status === 401) return { authenticated: false };
    throw e;
  }
}

export async function login(username, password, onStatus, options = {}) {
  const { signal } = options;
  const body = { username, password };

  // One-shot CSRF refresh/retry for E2002 to handle stale/bootstrap drift.
  try {
    const csrf = await getCsrfToken();
    return await fetchJson("/v1/auth/login", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body,
      signal
    });
  } catch (e) {
    if (e?.code === "E2002") {
      // If user is already authenticated with an existing session, prefer recovery.
      try {
        const m = await meta();
        if (m?.authenticated) return { authenticated: true, recovered: true };
      } catch {
        // Continue to CSRF refresh + retry.
      }

      onStatus?.("[E2002] Session token mismatch. Retrying…");
      clearCsrfToken();
      const csrf2 = await getCsrfToken();
      return await fetchJson("/v1/auth/login", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf2 },
        body,
        signal
      });
    }
    throw e;
  }
}

export async function verifySession({ attempts = 3, delayMs = 250 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const m = await meta();
      if (m?.authenticated) {
        return { authenticated: true, reason: null, meta: m };
      }
    } catch (e) {
      // Network or transient failure: keep retrying briefly.
      if (i === attempts - 1) {
        return { authenticated: false, reason: e?.message || "Session verification failed", meta: null };
      }
    }

    if (i < attempts - 1) {
      await sleep(delayMs * (i + 1));
    }
  }

  return { authenticated: false, reason: "Session cookie not available after login", meta: null };
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
