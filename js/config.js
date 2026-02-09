const HARD_CODED_BACKEND_BASE_URL = "https://rossie-chargeful-plentifully.ngrok-free.dev";

const runtime = {
  data: {
    BACKEND_BASE_URL: HARD_CODED_BACKEND_BASE_URL,
  },
};

export async function loadConfig() {
  return runtime.data;
}

export function apiBaseUrl() {
  const baseUrl = runtime.data?.BACKEND_BASE_URL || runtime.data?.API_BASE_URL;
  if (!baseUrl) {
    throw new Error("BACKEND_BASE_URL (or API_BASE_URL) not configured");
  }
  return baseUrl.replace(/\/+$/, "");
}

export function ngrokHeaders() {
  const base = apiBaseUrl();
  if (base.includes("ngrok-free.dev") || base.includes("ngrok.app") || base.includes("ngrok.io")) {
    return { "ngrok-skip-browser-warning": "true" };
  }
  return {};
}
