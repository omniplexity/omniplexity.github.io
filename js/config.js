const FALLBACK_BACKEND_URL = "https://omniplexity.duckdns.org";

const runtime = {
  data: {
    BACKEND_BASE_URL: FALLBACK_BACKEND_URL,
  },
};

export async function loadConfig() {
  try {
    const res = await fetch(`/runtime-config.json?v=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.BACKEND_BASE_URL) {
        runtime.data.BACKEND_BASE_URL = json.BACKEND_BASE_URL;
      }
    }
  } catch {
    // Use fallback URL
  }
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
