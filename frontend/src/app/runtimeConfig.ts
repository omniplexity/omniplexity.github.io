export type RuntimeConfig = { apiBaseUrl: string; source: "runtime-config" | "env" | "fallback" };

function normalizeBase(url: string): string {
  const trimmed = url.trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("apiBaseUrl must be http(s)");
  }
  return parsed.toString().replace(/\/+$/, "");
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const baseWithSlash = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const cfgUrl = `${baseWithSlash}runtime-config.json?v=${Date.now()}`;

  try {
    const res = await fetch(cfgUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`runtime-config fetch failed: ${res.status}`);
    }
    const json = (await res.json()) as Partial<{ apiBaseUrl: string }>;
    if (!json.apiBaseUrl) {
      throw new Error("runtime-config missing apiBaseUrl");
    }
    return { apiBaseUrl: normalizeBase(json.apiBaseUrl), source: "runtime-config" };
  } catch {
    const envFallback = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
    if (envFallback) {
      return { apiBaseUrl: normalizeBase(envFallback), source: "env" };
    }
    return { apiBaseUrl: "http://localhost:8000", source: "fallback" };
  }
}
