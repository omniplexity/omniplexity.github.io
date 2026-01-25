import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import BackendBanner from "../components/BackendBanner";
import ProbeDebugPanel from "../components/ProbeDebugPanel";
import { apiFetch } from "../lib/apiClient";
import { clearAuth, setAccessToken, setCsrfToken } from "../lib/authStore";
import { triggerBackendHealthCheck, useAppState } from "./appState";

type User = {
  id: number;
  username: string;
  role: string;
  status: string;
};

type ProviderModel = { id: string; label?: string };
type ProviderInfo = { provider_id: string; name: string; models: ProviderModel[] };

type Message = {
  role: "user" | "assistant";
  content: string;
};

type StreamUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

const App = () => {
  const { apiBaseUrl, backendStatus, configSource, lastError, lastHealthCheckAt, nextRetryMs } = useAppState();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [usage, setUsage] = useState<StreamUsage | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.provider_id === providerId),
    [providers, providerId]
  );

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const res = await apiFetch("/auth/me");
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = (await res.json()) as { user: User };
        if (active) {
          setUser(data.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();
    return () => {
      active = false;
    };
  }, []);

  const refreshProviders = async () => {
    if (!user) return;
    setProvidersLoading(true);
    try {
      const res = await apiFetch("/providers?include_models=true");
      if (!res.ok) return;
      const data = (await res.json()) as ProviderInfo[];
      setProviders(data);
    } catch {
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  useEffect(() => {
    refreshProviders();
  }, [user]);

  useEffect(() => {
    if (!providers.length) return;
    if (!providerId) {
      setProviderId(providers[0].provider_id);
      return;
    }
    const provider = providers.find((item) => item.provider_id === providerId);
    if (!provider) {
      setProviderId(providers[0].provider_id);
    }
  }, [providers, providerId]);

  useEffect(() => {
    if (!selectedProvider) return;
    const firstModel = selectedProvider.models?.[0]?.id || "";
    if (!modelId || !selectedProvider.models.some((model) => model.id === modelId)) {
      setModelId(firstModel);
    }
  }, [selectedProvider, modelId]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const apiJson = async <T,>(path: string, init: RequestInit) => {
    const res = await apiFetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as T & { message?: string };
    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data;
  };

  const handleLogin = async (payload: { username: string; password: string }) => {
    setAuthError(null);
    const data = await apiJson<{ user: User; access_token?: string; csrf_token?: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    if (data.access_token) {
      setAccessToken(data.access_token);
    }
    if (data.csrf_token) {
      setCsrfToken(data.csrf_token);
    }
    setUser(data.user);
  };

  const handleRegister = async (payload: { invite_code: string; username: string; password: string }) => {
    setAuthError(null);
    const data = await apiJson<{ user: User; access_token?: string; csrf_token?: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    if (data.access_token) {
      setAccessToken(data.access_token);
    }
    if (data.csrf_token) {
      setCsrfToken(data.csrf_token);
    }
    setUser(data.user);
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAuth();
    setUser(null);
    setMessages([]);
    setConversationId(null);
    setGenerationId(null);
  };

  const resetConversation = () => {
    setMessages([]);
    setConversationId(null);
    setGenerationId(null);
    setUsage(null);
    setStreamError(null);
  };

  const appendAssistantDelta = (delta: string) => {
    if (!delta) return;
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.length - 1;
      if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
        next[lastIndex] = { ...next[lastIndex], content: next[lastIndex].content + delta };
      }
      return next;
    });
  };

  const startStreaming = async (content: string) => {
    if (!providerId || !modelId) {
      throw new Error("Select a provider and model first.");
    }

    const payload: Record<string, unknown> = {
      message: { role: "user", content },
      provider: providerId,
      model: modelId,
    };
    if (conversationId) {
      payload.conversation_id = conversationId;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const response = await apiFetch("/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "message";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (currentEvent === "meta") {
              if (data.conversation_id) {
                setConversationId(Number(data.conversation_id));
              }
              if (data.generation_id) {
                setGenerationId(data.generation_id);
              }
            } else if (currentEvent === "delta") {
              appendAssistantDelta(data.delta || data.text || "");
            } else if (currentEvent === "usage") {
              setUsage(data.usage || null);
            } else if (currentEvent === "error") {
              setStreamError(data.message || "Streaming error");
            } else if (currentEvent === "done") {
              return;
            }
          } catch {
            // ignore malformed lines
          }
        }
        if (line === "") {
          currentEvent = "message";
        }
      }
    }
  };

  const handleSend = async () => {
    if (streaming || !input.trim()) return;
    const content = input.trim();
    setInput("");
    setStreamError(null);
    setUsage(null);
    setMessages((prev) => [...prev, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      await startStreaming(content);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setStreamError(error instanceof Error ? error.message : "Streaming failed");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleCancel = async () => {
    abortRef.current?.abort();
    if (generationId) {
      try {
        await apiFetch(`/chat/cancel/${generationId}`, { method: "POST" });
      } catch {
        // ignore cancel failures
      }
    }
    setStreaming(false);
  };

  const usageText = useMemo(() => {
    if (!usage) return "";
    const parts = [];
    if (usage.prompt_tokens !== undefined) parts.push(`P:${usage.prompt_tokens}`);
    if (usage.completion_tokens !== undefined) parts.push(`C:${usage.completion_tokens}`);
    if (usage.total_tokens !== undefined) parts.push(`T:${usage.total_tokens}`);
    return parts.join(" ");
  }, [usage]);

  const lastCheckLabel = useMemo(() => {
    if (!lastHealthCheckAt) return "Not checked yet";
    return new Date(lastHealthCheckAt).toLocaleString();
  }, [lastHealthCheckAt]);

  const nextRetryLabel = useMemo(() => {
    if (!nextRetryMs || nextRetryMs <= 0) return "—";
    return `${Math.round(nextRetryMs / 1000)}s`;
  }, [nextRetryMs]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_circle_at_top,_#f8fafc,_#eef2f7_45%,_#fef3c7_100%)] text-slate-900">
        <BackendBanner />
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-24">
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
            Checking session…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_top,_#f8fafc,_#eef2f7_45%,_#fef3c7_100%)] text-slate-900">
      <BackendBanner />
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">OmniAI</h1>
          <p className="text-sm text-slate-500">Streaming-ready UI</p>
        </div>
        {user ? (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 text-xs uppercase tracking-wide text-slate-500">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`rounded-full px-3 py-1 ${
                activeTab === "chat" ? "bg-slate-900 text-white" : "text-slate-500"
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`rounded-full px-3 py-1 ${
                activeTab === "settings" ? "bg-slate-900 text-white" : "text-slate-500"
              }`}
            >
              Settings
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className={`inline-flex h-2 w-2 rounded-full ${backendStatus === "ok" ? "bg-emerald-500" : "bg-amber-400"}`} />
          <span>{backendStatus === "ok" ? "Backend healthy" : "Backend check pending"}</span>
        </div>
      </header>

      {!user ? (
        <main className="mx-auto w-full max-w-3xl px-6 pb-16">
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
              <button
                type="button"
                onClick={() => setAuthView("login")}
                className={`rounded-full px-3 py-1 ${authView === "login" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setAuthView("register")}
                className={`rounded-full px-3 py-1 ${authView === "register" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
              >
                Register
              </button>
            </div>

            {authView === "login" ? (
              <AuthForm
                title="Welcome back"
                subtitle="Sign in to start streaming conversations."
                fields={[
                  { id: "username", label: "Username", type: "text", autoComplete: "username" },
                  { id: "password", label: "Password", type: "password", autoComplete: "current-password" },
                ]}
                submitLabel="Sign in"
                error={authError}
                onSubmit={async (values) => {
                  try {
                    await handleLogin({ username: values.username, password: values.password });
                  } catch (error) {
                    setAuthError(error instanceof Error ? error.message : "Login failed");
                  }
                }}
              />
            ) : (
              <AuthForm
                title="Create your account"
                subtitle="Use an invite code to register."
                fields={[
                  { id: "invite_code", label: "Invite code", type: "text", autoComplete: "one-time-code" },
                  { id: "username", label: "Username", type: "text", autoComplete: "username" },
                  { id: "password", label: "Password", type: "password", autoComplete: "new-password" },
                ]}
                submitLabel="Register"
                error={authError}
                onSubmit={async (values) => {
                  try {
                    await handleRegister({
                      invite_code: values.invite_code,
                      username: values.username,
                      password: values.password,
                    });
                  } catch (error) {
                    setAuthError(error instanceof Error ? error.message : "Registration failed");
                  }
                }}
              />
            )}
          </section>
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-16">
          <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-xs uppercase tracking-wide text-slate-400">Signed in</div>
                <div className="text-sm font-medium text-slate-700">{user.username}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  New chat
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>
            </div>
          </section>

          {activeTab === "chat" ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="min-w-[180px]">
                    <label className="text-xs uppercase tracking-wide text-slate-400">Provider</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      value={providerId}
                      onChange={(event) => setProviderId(event.target.value)}
                    >
                      {providers.map((provider) => (
                        <option key={provider.provider_id} value={provider.provider_id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[220px]">
                    <label className="text-xs uppercase tracking-wide text-slate-400">Model</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      value={modelId}
                      onChange={(event) => setModelId(event.target.value)}
                    >
                      {(selectedProvider?.models || []).map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label || model.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      Start a conversation and watch the response stream in real time.
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          message.role === "user"
                            ? "ml-auto max-w-[75%] bg-slate-900 text-white"
                            : "mr-auto max-w-[85%] bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content || (message.role === "assistant" && streaming ? "…" : "")}</div>
                      </div>
                    ))
                  )}
                  <div ref={endRef} />
                </div>

                {streamError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {streamError}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{streaming ? "Streaming…" : "Ready"}</span>
                    <span>{usageText}</span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      rows={3}
                      placeholder="Type your message…"
                      className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={streaming || !input.trim()}
                        className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={!streaming}
                        className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
                <p className="mt-1 text-sm text-slate-500">
                  These settings explain how OmniAI connects to your backend and providers. Anything that touches secrets or
                  server behavior is configured on the backend.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Connection</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">API base URL:</span> {apiBaseUrl || "Not set"}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Config source:</span> {configSource}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Last check:</span> {lastCheckLabel}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Next retry:</span> {nextRetryLabel}
                    </div>
                    {lastError ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {lastError}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerBackendHealthCheck()}
                    className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Recheck backend
                  </button>
                  <p className="mt-3 text-xs text-slate-500">
                    OmniAI reads the backend URL from <code>frontend/public/runtime-config.json</code> when the app boots.
                    Update that file and redeploy if your tunnel URL changes.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Providers & Models</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Providers loaded:</span> {providers.length || 0}
                    </div>
                    <div className="text-xs text-slate-500">
                      Choose a provider + model before sending a message. The list is fetched from the backend provider registry.
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {providers.map((provider) => (
                        <li key={provider.provider_id}>
                          {provider.name} • {provider.models?.length || 0} models
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={refreshProviders}
                    disabled={providersLoading}
                    className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {providersLoading ? "Refreshing…" : "Refresh providers"}
                  </button>
                  <p className="mt-3 text-xs text-slate-500">
                    If a provider is missing, verify it is running locally and the backend `*.env` base URLs are correct.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Streaming</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      Streaming responses use a server-sent event stream over HTTP. You should see the first tokens quickly after
                      sending a message.
                    </p>
                    <p className="text-xs text-slate-500">
                      If the stream stalls: click <span className="font-semibold text-slate-700">Stop</span>, then resend. Check
                      your provider and backend logs for timeouts.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Memory & Embeddings</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      Memory search is configured server-side and uses the embeddings backend defined in the backend <code>.env</code>.
                    </p>
                    <p className="text-xs text-slate-500">
                      For LM Studio embeddings, load your embedding model (e.g. <code>nomic-embed-text-v1.5</code>) and keep LM
                      Studio running at the configured base URL.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Authentication</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      OmniAI supports both bearer tokens and session cookies. This UI will use a bearer token if the backend
                      issues one, otherwise it falls back to secure cookies.
                    </p>
                    <p className="text-xs text-slate-500">
                      Sessions, CSRF protection, and admin access are enforced by the backend. Update auth settings in the backend
                      <code>.env</code> and restart the server to apply changes.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      <ProbeDebugPanel />
    </div>
  );
};

type AuthField = {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
};

const AuthForm = ({
  title,
  subtitle,
  fields,
  submitLabel,
  error,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  fields: AuthField[];
  submitLabel: string;
  error: string | null;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) => {
  const [values, setValues] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.id]: "" }), {})
  );
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <label key={field.id} className="block text-sm text-slate-600">
            <span className="text-xs uppercase tracking-wide text-slate-400">{field.label}</span>
            <input
              type={field.type}
              autoComplete={field.autoComplete}
              value={values[field.id]}
              onChange={(event) => handleChange(field.id, event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              required
            />
          </label>
        ))}
      </div>
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Working…" : submitLabel}
      </button>
    </form>
  );
};

export default App;
