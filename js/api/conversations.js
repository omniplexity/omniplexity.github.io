import { fetchJson } from "./client.js";
import { getCsrfToken } from "./csrf.js";

export async function listConversations() {
  const data = await fetchJson("/v1/conversations", { method: "GET" });
  return Array.isArray(data) ? data : (data.items || data.conversations || []);
}

export async function createConversation() {
  const csrf = await getCsrfToken();
  return await fetchJson("/v1/conversations", {
    method: "POST",
    headers: { "X-CSRF-Token": csrf },
    body: {}
  });
}

export async function getConversation(id) {
  try {
    return await fetchJson(`/v1/conversations/${encodeURIComponent(id)}`, { method: "GET" });
  } catch (e) {
    if (e?.status === 404) return null;
    throw e;
  }
}
