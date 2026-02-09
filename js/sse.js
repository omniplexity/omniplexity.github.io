import { apiBaseUrl, ngrokHeaders } from "./config.js";
import { getCsrfToken } from "./auth.js";
import { get, notifyAuthError } from "./api.js";
import {
  isStreaming,
  setStreaming,
  setStreamStatus,
  updateActiveStreamMeta,
  clearActiveStreamMeta,
  markStreamInterrupted,
} from "./state.js";

const PUBLIC_EVENTS = ["meta", "delta", "final", "error", "ping"];
const STREAM_POLL_INTERVAL_MS = 1800;
const STREAM_POLL_TIMEOUT_MS = 120000;

// Reconnection config
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;
const RECONNECT_MAX_ATTEMPTS = 5;

function calculateReconnectDelay(attempt) {
  const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.min(delay + Math.random() * 500, RECONNECT_MAX_DELAY_MS);
}

function shouldAttemptReconnect(error, attempt) {
  // Don't reconnect on auth errors
  if (error?.code === "E2000" || error?.code === "E2002") {
    return false;
  }
  // Don't reconnect if max attempts reached
  if (attempt >= RECONNECT_MAX_ATTEMPTS) {
    return false;
  }
  return true;
}

function parseChunk(raw) {
  const lines = raw.split("\n");
  const event = lines.find((row) => row.startsWith("event:"))?.split("event:")[1].trim();
  const dataLines = lines.filter((row) => row.startsWith("data:")).map((row) => row.split("data:")[1]);
  let payload = {};
  if (dataLines.length) {
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      payload = {};
    }
  }
  return { event, data: payload };
}

function supportsStreaming(response) {
  return Boolean(response?.body && typeof response.body.getReader === "function" && typeof TextDecoder !== "undefined");
}

function delay(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    }
  });
}

function isCompletionMeta(meta) {
  return Boolean(meta?.completed || meta?.canceled || meta?.error || meta?.finish_reason);
}

async function pollForAssistantMessage({ conversationId, onEvent, signal }) {
  let lastContent = "";
  const startTime = Date.now();
  while (!signal.aborted && Date.now() - startTime < STREAM_POLL_TIMEOUT_MS) {
    await delay(STREAM_POLL_INTERVAL_MS, signal);
    if (signal.aborted) break;
    try {
      const payload = await get(`/conversations/${conversationId}/messages`);
      const messages = payload?.messages || [];
      const lastAssistant = [...messages].reverse().find((msg) => msg.role === "assistant");
      if (!lastAssistant) {
        continue;
      }
      const content = lastAssistant.content || "";
      if (content.length > lastContent.length) {
        const delta = content.slice(lastContent.length);
        lastContent = content;
        if (delta) {
          onEvent?.delta?.({ text: delta });
          updateActiveStreamMeta({ partialLength: lastContent.length });
        }
      }
      const meta = lastAssistant.provider_meta || {};
      if (meta?.error) {
        return { status: "error", error: meta.error };
      }
      if (isCompletionMeta(meta)) {
        return { status: "final" };
      }
    } catch {
      continue;
    }
  }
  if (!signal.aborted) {
    markStreamInterrupted(conversationId);
  }
  return { status: signal.aborted ? "canceled" : "timeout" };
}

async function fetchWithKeepAlive({ path, body, signal }) {
  const token = await getCsrfToken();
  return fetch(`${apiBaseUrl()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...ngrokHeaders(),
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(body),
    signal,
  });
}

async function createStream({ path, body, onEvent }) {
  if (isStreaming() && path === "/chat/stream") {
    throw new Error("Another stream is already active");
  }
  const controller = new AbortController();
  let buffer = "";
  let reader;
  let reconnecting = false;
  let stalledTimer;
  let partialLength = 0;

  const resetStallTimer = () => {
    clearTimeout(stalledTimer);
    if (reconnecting) {
      reconnecting = false;
      setStreamStatus(body.conversation_id, "streaming");
    }
    stalledTimer = setTimeout(() => {
      reconnecting = true;
      setStreamStatus(body.conversation_id, "reconnecting");
      onEvent?.reconnecting?.();
    }, 15000);
  };

  const cleanup = () => {
    clearTimeout(stalledTimer);
    setStreaming(false);
    if (!reconnecting) {
      setStreamStatus(body.conversation_id, "idle");
    }
    reader?.releaseLock();
    reader = null;
  };

  async function startPolling(response) {
    setStreamStatus(body.conversation_id, "polling");
    onEvent?.meta?.({
      provider_id: body.provider_id,
      model: body.model,
      mode: "polling",
    });

    response.text().catch(() => {});

    const result = await pollForAssistantMessage({
      conversationId: body.conversation_id,
      onEvent,
      signal: controller.signal,
    });
    if (!result) return;
    if (result.status === "final") {
      onEvent?.final?.({});
    }
    if (result.status === "error") {
      onEvent?.error?.({
        message: result.error?.message || "Stream failed",
        code: result.error?.code,
      });
    }
    if (result.status === "canceled") {
      onEvent?.canceled?.();
    }
    if (result.status === "timeout") {
      onEvent?.disconnected?.();
    }
    controller.abort();
  }

  async function start() {
    const response = await fetchWithKeepAlive({ path, body, signal: controller.signal });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      if (payload?.error) {
        const error = new Error(payload.error.message || "Unable to open SSE stream");
        error.code = payload.error.code;
        error.requestId = payload.error.request_id;
        notifyAuthError(error);
        throw error;
      }
      const error = new Error("Unable to open SSE stream");
      if (response.status === 401) {
        error.code = "E2000";
      }
      notifyAuthError(error);
      throw error;
    }
    setStreaming(true);

    if (!supportsStreaming(response)) {
      try {
        await startPolling(response);
      } finally {
        cleanup();
      }
      return;
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    setStreamStatus(body.conversation_id, "streaming");
    resetStallTimer();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        resetStallTimer();
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          const { event, data } = parseChunk(chunk);
          if (!event) continue;
          if (event === "ping" || chunk.trim() === ":") {
            continue;
          }
          if (PUBLIC_EVENTS.includes(event) && typeof onEvent[event] === "function") {
            onEvent[event](data);
          }
          if (event === "delta" && data.text) {
            partialLength += data.text.length;
            updateActiveStreamMeta({ partialLength });
          }
          if (event === "final" || event === "error") {
            clearTimeout(stalledTimer);
            if (event === "final") {
              clearActiveStreamMeta();
              setStreamStatus(body.conversation_id, "idle");
            }
            return;
          }
        }
      }
      if (!reconnecting) {
        markStreamInterrupted(body.conversation_id);
        onEvent?.disconnected?.();
        setStreamStatus(body.conversation_id, "disconnected");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        onEvent?.canceled?.();
      } else {
        markStreamInterrupted(body.conversation_id);
        onEvent?.disconnected?.();
      }
    } finally {
      cleanup();
    }
  }
  return {
    start,
    cancel() {
      controller.abort();
      reader?.cancel();
      reader?.releaseLock();
      reader = null;
    },
  };
}

export function createSseStream(options) {
  const { conversationId, providerId, model, input, settings, onEvent } = options;
  return createStream({
    path: "/chat/stream",
    body: {
      conversation_id: conversationId,
      provider_id: providerId,
      model,
      input,
      settings,
    },
    onEvent,
  });
}

export function createRetryStream(conversationId, onEvent) {
  return createStream({
    path: "/chat/retry",
    body: { conversation_id: conversationId },
    onEvent,
  });
}

// Reconnecting stream with exponential backoff
export function createReconnectingStream(options) {
  const { conversationId, providerId, model, input, settings, onEvent, maxAttempts = RECONNECT_MAX_ATTEMPTS } = options;

  let attempt = 0;
  let currentStream = null;
  let resolveStart = null;
  let rejectStart = null;

  const startPromise = new Promise((resolve, reject) => {
    resolveStart = resolve;
    rejectStart = reject;
  });

  const wrappedOnEvent = {
    ...onEvent,
    reconnecting(data) {
      attempt++;
      const delay = calculateReconnectDelay(attempt);
      const status = attempt >= maxAttempts
        ? `Reconnect failed (${attempt}/${maxAttempts})`
        : `Reconnecting in ${Math.round(delay/1000)}s (${attempt}/${maxAttempts})...`;
      onEvent?.reconnecting?.({ ...data, status, attempt, delay, maxAttempts });
    },
  };

  async function attemptStream(streamAttempt) {
    currentStream = createStream({
      path: "/chat/stream",
      body: {
        conversation_id: conversationId,
        provider_id: providerId,
        model,
        input,
        settings,
      },
      onEvent: wrappedOnEvent,
    });

    try {
      await currentStream.start();
      // Stream completed successfully
      resolveStart?.();
    } catch (err) {
      if (streamAttempt >= maxAttempts) {
        rejectStart?.(err);
        return;
      }

      if (shouldAttemptReconnect(err, streamAttempt)) {
        const delay = calculateReconnectDelay(streamAttempt);
        await delay(delay);
        await attemptStream(streamAttempt + 1);
      } else {
        rejectStart?.(err);
      }
    }
  }

  // Start the first attempt
  attemptStream(1);

  return {
    start: () => startPromise,
    cancel() {
      currentStream?.cancel();
      attempt = maxAttempts; // Prevent further reconnect attempts
    },
    getCurrentAttempt() {
      return attempt;
    },
  };
}
