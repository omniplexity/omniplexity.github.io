import { ApiError } from "./errors.js";

let BACKEND = "https://omniplexity.duckdns.org";

export function setBackendBaseUrl(url) {
  BACKEND = (url || BACKEND).replace(/\/+$/, "");
}

export function getBackendBaseUrl() {
  return BACKEND;
}

async function readBody(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch { return null; }
  }
  try { return await res.text(); } catch { return null; }
}

export async function fetchJson(path, { method = "GET", headers = {}, body, signal } = {}) {
  const url = `${BACKEND}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    signal
  });

  const requestId = res.headers.get("x-request-id") || res.headers.get("x-request_id") || null;
  const data = await readBody(res);

  if (!res.ok) {
    const code = data && typeof data === "object" ? (data.code || null) : null;
    const msg =
      data && typeof data === "object" ? (data.message || `HTTP ${res.status}`) :
      typeof data === "string" && data ? data :
      `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, code, requestId);
  }

  return data;
}

export async function fetchTextEventStream(path, { headers = {}, signal } = {}) {
  const url = `${BACKEND}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "text/event-stream", ...headers },
    credentials: "include",
    signal
  });

  if (!res.ok) {
    const requestId = res.headers.get("x-request-id") || null;
    throw new ApiError(`Stream HTTP ${res.status}`, res.status, null, requestId);
  }
  return res;
}
