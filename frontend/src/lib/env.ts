const DEFAULT_API_BASE_URL = "";

export function getApiBaseUrl(override?: string): string {
  if (override && override.trim().length > 0) {
    return override.trim();
  }
  return DEFAULT_API_BASE_URL;
}
