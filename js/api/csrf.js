import { fetchJson } from "./client.js";

let CSRF = null;

export async function getCsrfToken() {
  if (CSRF) return CSRF;

  const candidates = [
    "/v1/auth/csrf/bootstrap",
    "/api/auth/csrf/bootstrap",
    "/v1/auth/csrf"
  ];

  let lastErr = null;
  for (const p of candidates) {
    try {
      const data = await fetchJson(p, { method: "GET" });
      const token =
        (data && typeof data === "object" && (data.csrf_token || data.csrf || data.token)) || null;
      if (!token) throw new Error(`CSRF token missing in ${p}`);
      CSRF = token;
      return CSRF;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("CSRF bootstrap failed");
}

export function clearCsrfToken() {
  CSRF = null;
}
