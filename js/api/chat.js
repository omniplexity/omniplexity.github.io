import { fetchJson, fetchTextEventStream } from "./client.js";
import { getCsrfToken } from "./csrf.js";
import { readSse } from "./sse.js";

export async function createChatRun({ conversationId, message, clientMessageId, settings = {} }) {
  const csrf = await getCsrfToken();
  const body = {
    conversation_id: conversationId,
    message,
    settings,
    client_message_id: clientMessageId
  };
  return await fetchJson("/v1/chat", {
    method: "POST",
    headers: { "X-CSRF-Token": csrf },
    body
  });
}

export async function streamChatRun({ runId, signal, onData }) {
  const queryPath = `/v1/chat/stream?run_id=${encodeURIComponent(runId)}`;
  try {
    const res = await fetchTextEventStream(queryPath, { signal });
    await readSse(res, { onData, signal });
    return;
  } catch (e) {
    if (e?.status && e.status !== 404) throw e;
  }

  const pathForm = `/v1/chat/stream/${encodeURIComponent(runId)}`;
  const res2 = await fetchTextEventStream(pathForm, { signal });
  await readSse(res2, { onData, signal });
}

export function extractDelta(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;

  if (payload.delta) return String(payload.delta);

  const c0 = payload.choices?.[0];
  const d = c0?.delta?.content;
  if (d) return String(d);

  const t = payload.text || payload.content;
  if (t) return String(t);

  return "";
}
