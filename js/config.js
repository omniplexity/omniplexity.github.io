const runtime = {
  data: null,
};

function getCandidateConfigPaths() {
  const href = document.querySelector("base")?.getAttribute("href")?.trim() || "";
  const normalizedBase = href.replace(/\/$/, "");
  const paths = [];
  if (normalizedBase && normalizedBase !== ".") {
    paths.push(`${normalizedBase}/runtime-config.json`);
  }
  paths.push("./runtime-config.json");
  return paths;
}

export async function loadConfig() {
  if (runtime.data) {
    return runtime.data;
  }
  let lastError = new Error("Unable to load runtime config");
  for (const configPath of getCandidateConfigPaths()) {
    try {
      const res = await fetch(configPath, { cache: "no-store" });
      if (res.ok) {
        runtime.data = await res.json();
        return runtime.data;
      }
      lastError = new Error(`Unable to load runtime config (${configPath}: ${res.status})`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
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
