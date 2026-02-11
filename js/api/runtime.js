import { FALLBACK_BACKEND_URL } from "../config.js";

export async function loadRuntimeConfig() {
  try {
    const res = await fetch(`./runtime-config.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`runtime-config.json ${res.status}`);
    const data = await res.json();
    return {
      BACKEND_BASE_URL: (data.BACKEND_BASE_URL || FALLBACK_BACKEND_URL).replace(/\/+$/, ""),
      FEATURE_FLAGS: data.FEATURE_FLAGS || {}
    };
  } catch {
    return { BACKEND_BASE_URL: FALLBACK_BACKEND_URL, FEATURE_FLAGS: {} };
  }
}
