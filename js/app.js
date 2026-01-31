import { loadConfig, apiBaseUrl } from "./config.js";
import { login, logout, register } from "./auth.js";
import {
  get,
  post,
  patch,
  del,
  getMe,
  getAdminUsers,
  patchAdminUser,
  getAdminUsage,
  getAdminAudit,
  getAdminInvites,
  postAdminInvite,
  setAuthErrorHandler,
} from "./api.js";
import { createSseStream, createRetryStream } from "./sse.js";
import {
  getState,
  setSelectedConversation,
  updateConversations,
  updateMessages,
  attachStream,
  detachStream,
  pushMessage,
  setProviders,
  updateMessageById,
  setCurrentAssistantMessageId,
  isStreaming,
  setAutoScroll,
  shouldAutoScroll,
  getResumeHint,
  clearActiveStreamMeta,
  setActiveStreamMeta,
  resetVirtualMeasurements,
  setCurrentUser,
  setAdminUsers,
  setAdminUsage,
  setAdminAudit,
  setAdminInvites,
  getSelectedAdminUsers,
  setSelectedAdminUsers,
  getAdminUsers as getAdminUsersState,
  getAdminUsage as getAdminUsageState,
  getAdminAudit as getAdminAuditState,
  resetAppState,
  getProviderSelection,
  setProviderSelection,
  getSettings,
  updateSettings,
  resetSettings,
  getUiState,
  setSidebarCollapsed,
  isSidebarCollapsed,
  setInspectorCollapsed,
  isInspectorCollapsed,
  resetUiState,
} from "./state.js";
import {
  renderConversations,
  renderMessages,
  updateStatus,
  updateInspector,
  syncInspectorWithSettings,
  showError,
  bindConversationActions,
  bindJumpButton,
  setJumpButtonVisibility,
  showResumeNotice,
  hideResumeNotice,
  updateStreamBadge,
  updateElapsedTime,
  scrollToBottom,
  bindResumeRetry,
  getMessageStreamElement,
  updateMessage,
  setAdminToggleVisible,
  bindAdminToggle,
  showAdminPanel,
  hideAdminPanel,
  bindAdminClose,
  bindAdminUserActions,
  bindAdminRefreshButtons,
  renderAdminUsers,
  renderAdminUsage,
  renderAdminAudit,
  renderAdminInvites,
  bindAdminInviteForm,
  refreshVisibleMessages,
  resetVirtualRange,
  bindAdminBulkButtons,
  bindAdminExportControls,
  bindAdminAuditFilters,
  updateSelectionSummary,
  setBulkButtonsEnabled,
  syncSelectAllCheckbox,
  setAuditFilterControls,
  setUserSummary,
  setPlanBadge,
  setBackendBadge,
  renderProviders,
  renderProviderOptions,
  renderModelOptions,
  bindProviderSelectors,
  bindModelSelectors,
  bindSettingsControls,
  updateSettingsControls,
  applySettingsToUI,
  bindSettingsModal,
  bindSettingsAccordion,
  bindMessageActions,
  openSettingsModal,
  closeSettingsModal,
} from "./ui.js";

let elapsedInterval = null;
let auditFilters = { event: "", from: "", to: "" };
let authRedirecting = false;
const providerModelsCache = new Map();
let autoRetryTimeout = null;
let streamTiming = { startedAt: null, firstTokenAt: null };

function normalizeProviderId(provider) {
  if (!provider) return null;
  if (typeof provider === "string") return provider;
  return provider.id || provider.provider_id || null;
}

function pickDefaultProvider(providers) {
  if (!Array.isArray(providers) || !providers.length) return null;
  const normalized = providers.map((item) => (typeof item === "string" ? { id: item } : item));
  const healthy = normalized.find((item) => item?.ok === true);
  const available = normalized.find((item) => item?.ok !== false);
  const fallback = healthy || available || normalized[0];
  return normalizeProviderId(fallback);
}

async function fetchProviderModels(providerId) {
  if (!providerId) return [];
  if (providerModelsCache.has(providerId)) {
    return providerModelsCache.get(providerId);
  }
  try {
    const payload = await get(`/providers/${providerId}/models`);
    const models = Array.isArray(payload) ? payload : payload?.models;
    const list = Array.isArray(models) ? models.filter(Boolean) : [];
    providerModelsCache.set(providerId, list);
    return list;
  } catch (err) {
    showError(err.message, err.code);
    return [];
  }
}

async function ensureProviderSelection(preferredProviderId, preferredModel) {
  const providers = getState().providers;
  const selection = getProviderSelection();
  const settings = getSettings();
  const providerId =
    normalizeProviderId(preferredProviderId) ||
    normalizeProviderId(selection.providerId) ||
    normalizeProviderId(settings?.defaultProviderId) ||
    pickDefaultProvider(providers);
  if (!providerId) {
    showError("No providers available.");
    return null;
  }
  const models = await fetchProviderModels(providerId);
  let model = preferredModel || selection.model || settings?.defaultModel;
  if (!model || (models.length && !models.includes(model))) {
    model = models[0] || null;
  }
  if (!model) {
    showError(`No models available for ${providerId}.`);
    return null;
  }
  setProviderSelection({ providerId, model });
  updateStatus({ provider: providerId, model, token_usage: null });
  return { providerId, model, models };
}

function applyConversationProviderModel(conversation, providerId, model) {
  if (!conversation) return;
  if (providerId) {
    conversation.provider = providerId;
  }
  if (model) {
    conversation.model = model;
  }
  if (conversation.provider || conversation.model) {
    setProviderSelection({
      providerId: conversation.provider || providerId || null,
      model: conversation.model || model || null,
    });
    updateStatus({
      provider: conversation.provider || providerId || null,
      model: conversation.model || model || null,
      token_usage: null,
    });
  }
}

function syncConversationFromMessages(conversation, messages) {
  if (!conversation || !Array.isArray(messages) || !messages.length) return;
  const lastAssistant = [...messages].reverse().find((msg) => msg.role === "assistant");
  if (!lastAssistant) return;
  const providerId =
    lastAssistant.provider ||
    lastAssistant.provider_id ||
    lastAssistant.provider_meta?.provider_id ||
    null;
  const model = lastAssistant.model || lastAssistant.provider_meta?.model || null;
  if (providerId || model) {
    applyConversationProviderModel(conversation, providerId, model);
  }
}

function applySettings(settings) {
  if (!settings) return;
  applySettingsToUI(settings);
  updateSettingsControls(settings);
  syncInspectorWithSettings(settings);
  setAutoScroll(settings.autoScroll !== false);
}

function handleSettingsChange(patch) {
  const updated = updateSettings(patch);
  applySettings(updated);
}

function handleSettingsReset() {
  resetSettings();
  resetUiState();
  applySettings(getSettings());
  updateSidebarUi(false);
  updateInspectorUi(false);
}

function updateSidebarUi(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", Boolean(collapsed));
  setSidebarCollapsed(Boolean(collapsed));
}

function updateInspectorUi(collapsed) {
  document.body.classList.toggle("inspector-collapsed", Boolean(collapsed));
  setInspectorCollapsed(Boolean(collapsed));
}

function clearAutoRetry() {
  if (autoRetryTimeout) {
    clearTimeout(autoRetryTimeout);
    autoRetryTimeout = null;
  }
}

function scheduleAutoRetry() {
  const settings = getSettings();
  if (settings?.retryBehavior !== "auto") return;
  if (autoRetryTimeout) return;
  autoRetryTimeout = setTimeout(() => {
    autoRetryTimeout = null;
    handleRetry();
  }, 1200);
}

function buildStreamSettings() {
  const settings = getSettings();
  return {
    temperature: settings?.temperature,
    top_p: settings?.top_p,
    max_tokens: settings?.max_tokens ?? null,
    streaming: settings?.streaming !== false,
    transport_preference: settings?.transportPreference || "sse",
  };
}

async function setActiveProviderModel(providerId, model, { persist = false } = {}) {
  if (!providerId) return null;
  const models = await fetchProviderModels(providerId);
  let nextModel = model;
  if (!nextModel || (models.length && !models.includes(nextModel))) {
    nextModel = models[0] || null;
  }
  if (!nextModel) {
    showError(`No models available for ${providerId}.`);
    return null;
  }
  setProviderSelection({ providerId, model: nextModel });
  renderProviderOptions(getState().providers, providerId);
  renderModelOptions(models, nextModel);
  updateStatus({ provider: providerId, model: nextModel, token_usage: null });
  renderProviders(getState().providers);
  if (persist) {
    updateSettings({ defaultProviderId: providerId, defaultModel: nextModel });
  }
  return { providerId, model: nextModel, models };
}

function applySelectionToConversation(providerId, model) {
  const conversation = getState().selectedConversation;
  if (!conversation) return;
  applyConversationProviderModel(conversation, providerId, model);
}

async function handleProviderSelection(providerId) {
  if (!providerId) return;
  const selection = await setActiveProviderModel(providerId, null, { persist: true });
  if (selection) {
    applySelectionToConversation(selection.providerId, selection.model);
  }
}

async function handleModelSelection(model) {
  const providerId = getProviderSelection().providerId || getSettings()?.defaultProviderId;
  if (!providerId || !model) return;
  const selection = await setActiveProviderModel(providerId, model, { persist: true });
  if (selection) {
    applySelectionToConversation(selection.providerId, selection.model);
  }
}

function buildLoginUrl(reason) {
  const params = new URLSearchParams();
  if (reason) {
    params.set("reason", reason);
  }
  const query = params.toString();
  return query ? `login.html?${query}` : "login.html";
}

function redirectToLogin(reason) {
  if (authRedirecting) return;
  authRedirecting = true;
  window.location.replace(buildLoginUrl(reason));
}

function mapAuthNotice(reason) {
  if (reason === "expired") {
    return "Your session expired. Please sign in again.";
  }
  if (reason === "logout") {
    return "You have been signed out.";
  }
  if (reason === "unauthorized") {
    return "Please sign in to continue.";
  }
  return "";
}

function startElapsedTimer() {
  stopElapsedTimer();
  const tick = () => {
    const start = getState().streamStartTime;
    if (!start) {
      updateElapsedTime(0);
      return;
    }
    const seconds = Math.floor((Date.now() - start) / 1000);
    updateElapsedTime(seconds);
  };
  tick();
  elapsedInterval = setInterval(tick, 1000);
}

function stopElapsedTimer() {
  if (elapsedInterval) {
    clearInterval(elapsedInterval);
    elapsedInterval = null;
  }
  updateElapsedTime(0);
}

async function loadCurrentUser() {
  try {
    const payload = await getMe();
    setCurrentUser(payload.user);
    setUserSummary(payload.user);
    setPlanBadge(payload.user);
    const isAdmin = payload.user?.role === "admin";
    setAdminToggleVisible(Boolean(isAdmin));
    if (!isAdmin) {
      hideAdminPanel();
    }
    return true;
  } catch (err) {
    setAdminToggleVisible(false);
    if (err?.code === "E2000" || err?.code === "E2002") {
      redirectToLogin("expired");
      return false;
    }
    if (err?.code === "E_NETWORK") {
      showError(err.message, err.code);
    }
    return false;
  }
}

async function refreshAdminUsers() {
  try {
    const payload = await getAdminUsers({ limit: 100 });
    setAdminUsers(payload.users);
    setSelectedAdminUsers([]);
    renderAdminUsers(payload.users);
    handleAdminSelectionChange([]);
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function refreshAdminUsage() {
  try {
    const payload = await getAdminUsage({ limit: 50 });
    setAdminUsage(payload.entries);
    renderAdminUsage(payload.entries, getAdminUsersState());
  } catch (err) {
    showError(err.message, err.code);
  }
}

function filterAuditEntries(entries, filters) {
  if (!entries?.length) return [];
  const fromTs = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const toTs = filters.to ? new Date(`${filters.to}T23:59:59`).getTime() : null;
  return entries.filter((entry) => {
    if (filters.event && entry.action !== filters.event) {
      return false;
    }
    const created = new Date(entry.created_at).getTime();
    if (Number.isNaN(created)) {
      return false;
    }
    if (fromTs != null && Number.isFinite(fromTs) && created < fromTs) {
      return false;
    }
    if (toTs != null && Number.isFinite(toTs) && created > toTs) {
      return false;
    }
    return true;
  });
}

async function refreshAdminAudit(overrides = {}) {
  const params = {
    limit: 50,
    ...auditFilters,
    ...overrides,
  };
  auditFilters = {
    event: params.event || "",
    from: params.from || "",
    to: params.to || "",
  };
  try {
    const payload = await getAdminAudit(params);
    const filtered = filterAuditEntries(payload.entries || [], auditFilters);
    setAdminAudit(filtered);
    renderAdminAudit(filtered);
    setAuditFilterControls(auditFilters);
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function refreshAdminInvites() {
  try {
    const payload = await getAdminInvites();
    setAdminInvites(payload.invites);
    renderAdminInvites(payload.invites);
  } catch (err) {
    showError(err.message, err.code);
  }
}

function handleAdminSelectionChange(selectedIds) {
  setSelectedAdminUsers(selectedIds);
  updateSelectionSummary(selectedIds.length);
  setBulkButtonsEnabled(selectedIds.length > 0);
  syncSelectAllCheckbox(selectedIds.length, getAdminUsersState().length);
}

async function bulkUpdateUsers(status) {
  const ids = getSelectedAdminUsers();
  if (!ids.length) return;
  try {
    await Promise.all(ids.map((userId) => patchAdminUser(userId, { status })));
    await refreshAdminUsers();
  } catch (err) {
    showError(err.message, err.code);
  }
}

function escapeCsv(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, headers, rows) {
  const lines = [];
  lines.push(headers.map(escapeCsv).join(","));
  rows.forEach((row) => {
    lines.push(row.map(escapeCsv).join(","));
  });
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function exportUsersCsv() {
  const users = getAdminUsersState();
  const headers = ["ID", "Username", "Email", "Role", "Status", "Messages/day", "Tokens/day"];
  const rows = users.map((user) => [
    user.id,
    user.username,
    user.email || "",
    user.role,
    user.status,
    user.quotas?.messages_per_day ?? "",
    user.quotas?.tokens_per_day ?? "",
  ]);
  downloadCsv("admin-users.csv", headers, rows);
}

function exportUsageCsv() {
  const entries = getAdminUsageState();
  const headers = ["Date", "User ID", "Username", "Messages used", "Tokens used"];
  const rows = entries.map((entry) => [
    entry.date,
    entry.user_id,
    entry.username || "",
    entry.messages_used,
    entry.tokens_used,
  ]);
  downloadCsv("admin-usage.csv", headers, rows);
}

function exportAuditCsv() {
  const entries = getAdminAuditState();
  const headers = ["Timestamp", "Action", "Actor", "Target", "Details"];
  const rows = entries.map((entry) => [
    entry.created_at,
    entry.action,
    entry.actor_user_id || "system",
    entry.target_id || "—",
    entry.details ? JSON.stringify(entry.details) : "",
  ]);
  downloadCsv("admin-audit.csv", headers, rows);
}

function handleAdminExport(type) {
  if (type === "users") {
    exportUsersCsv();
  }
  if (type === "usage") {
    exportUsageCsv();
  }
  if (type === "audit") {
    exportAuditCsv();
  }
}

function handleAuditFilterApply(filters) {
  auditFilters = {
    event: filters.event || "",
    from: filters.from || "",
    to: filters.to || "",
  };
  refreshAdminAudit(auditFilters);
}

async function refreshAllAdminData() {
  await Promise.all([
    refreshAdminUsers(),
    refreshAdminUsage(),
    refreshAdminAudit(),
    refreshAdminInvites(),
  ]);
}

async function handleAdminToggleStatus(userId, nextStatus) {
  try {
    await patchAdminUser(userId, { status: nextStatus });
    await refreshAdminUsers();
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function handleAdminQuotaSave(userId, quotas) {
  try {
    await patchAdminUser(userId, quotas);
    await refreshAdminUsers();
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function handleAdminInviteSubmit(payload) {
  try {
    await postAdminInvite(payload);
    await refreshAdminInvites();
  } catch (err) {
    showError(err.message, err.code);
  }
}

function setupAdminPanel() {
  bindAdminToggle(() => {
    showAdminPanel();
    refreshAllAdminData();
  });
  bindAdminClose(() => hideAdminPanel());
  bindAdminUserActions({
    onToggleStatus: handleAdminToggleStatus,
    onSaveQuotas: handleAdminQuotaSave,
    onSelectionChange: handleAdminSelectionChange,
    onValidationError: (message) => showError(message),
  });
  bindAdminBulkButtons({
    onBulkEnable: () => bulkUpdateUsers("active"),
    onBulkDisable: () => bulkUpdateUsers("disabled"),
  });
  bindAdminExportControls({
    onExport: handleAdminExport,
  });
  bindAdminAuditFilters({
    onApply: handleAuditFilterApply,
  });
  bindAdminRefreshButtons({
    onUsers: refreshAdminUsers,
    onUsage: refreshAdminUsage,
    onAudit: refreshAdminAudit,
  });
  bindAdminInviteForm(handleAdminInviteSubmit);
  setAuditFilterControls(auditFilters);
  handleAdminSelectionChange([]);
  setBulkButtonsEnabled(false);
}

function setRetryEnabled(enabled) {
  const retryBtn = document.getElementById("retryBtn");
  if (!retryBtn) return;
  retryBtn.disabled = !enabled;
}

function setStreamControls(active) {
  const sendBtn = document.getElementById("sendBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  if (sendBtn) sendBtn.disabled = Boolean(active);
  if (cancelBtn) cancelBtn.disabled = !active;
}

function streamCompleted() {
  detachStream();
  stopElapsedTimer();
}

function clearUiForLogout() {
  const stream = getState().stream;
  if (stream) {
    stream.cancel();
  }
  clearAutoRetry();
  detachStream();
  streamTiming = { startedAt: null, firstTokenAt: null };
  clearActiveStreamMeta();
  stopElapsedTimer();
  updateStreamBadge(null);
  hideResumeNotice();
  setRetryEnabled(false);
  setStreamControls(false);
  setJumpButtonVisibility(false);
  closeSettingsModal();
  resetAppState();
  setUserSummary(null);
  setPlanBadge(null);
  updateStatus({ provider: null, model: null, token_usage: null });
  updateInspector({ status: "Idle", latencyMs: null, durationMs: null, tokens: null });
  renderMessages([]);
  renderConversations([], handleSelectConversation, {
    onRename: handleRenameConversation,
    onDelete: handleDeleteConversation,
  });
  renderProviders([]);
}

async function handleLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginButton = document.getElementById("loginButton");
  const registerButton = document.getElementById("registerButton");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");
  const authNotice = document.getElementById("authNotice");
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-form]");

  try {
    const payload = await getMe();
    if (payload?.user) {
      window.location.replace("index.html");
      return;
    }
  } catch (err) {
    if (err?.code === "E_NETWORK") {
      if (authNotice) {
        authNotice.textContent = "Backend unavailable. Check your tunnel connection and try again.";
        authNotice.classList.remove("hidden");
      }
    }
  }

  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason");
  const notice = mapAuthNotice(reason);
  if (authNotice && notice) {
    authNotice.textContent = notice;
    authNotice.classList.remove("hidden");
  }

  const setButtonLoading = (button, loading) => {
    if (!button) return;
    if (loading) {
      button.disabled = true;
      button.dataset.loading = "true";
      button.setAttribute("aria-busy", "true");
    } else {
      button.disabled = false;
      delete button.dataset.loading;
      button.removeAttribute("aria-busy");
    }
  };

  const focusFirstInput = (mode) => {
    const panel = document.querySelector(`[data-auth-form="${mode}"]`);
    panel?.querySelector("input")?.focus();
  };

  const setAuthMode = (mode) => {
    tabs.forEach((tab) => {
      const active = tab.getAttribute("data-auth-tab") === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach((panel) => {
      const active = panel.getAttribute("data-auth-form") === mode;
      panel.classList.toggle("active", active);
      panel.setAttribute("aria-hidden", active ? "false" : "true");
    });
    focusFirstInput(mode);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthMode(tab.getAttribute("data-auth-tab"));
    });
  });

  setAuthMode("login");

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setButtonLoading(loginButton, true);
    loginError?.classList.add("hidden");
    try {
      await login({
        username: loginForm.username?.value,
        password: loginForm.password?.value,
      });
      window.location.replace("index.html");
    } catch (err) {
      const message = err?.message || "Invalid credentials";
      if (loginError) {
        loginError.textContent = message;
        loginError.classList.remove("hidden");
      }
    } finally {
      setButtonLoading(loginButton, false);
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setButtonLoading(registerButton, true);
    registerError?.classList.add("hidden");
    try {
      await register({
        username: registerForm.username?.value,
        password: registerForm.password?.value,
        email: registerForm.email?.value || null,
        invite_code: registerForm.invite_code?.value || null,
      });
      try {
        const payload = await getMe();
        if (payload?.user) {
          window.location.replace("index.html");
          return;
        }
      } catch (_err) {
        // Fall through to show feedback if session not established.
      }
      if (registerError) {
        registerError.textContent =
          "Account created, but we could not start a session. Please log in and check your cookie settings.";
        registerError.classList.remove("hidden");
      }
    } catch (err) {
      const message = err?.message || "Registration failed";
      if (registerError) {
        registerError.textContent = message;
        registerError.classList.remove("hidden");
      }
    } finally {
      setButtonLoading(registerButton, false);
    }
  });
}

function buildStreamHandlers(conversation) {
  const assistantMessageId = getState().currentAssistantMessageId;
  const providerId = conversation.provider || "";
  const model = conversation.model || "";
  let activeProvider = providerId;
  let activeModel = model;
  return {
    meta(data) {
      clearAutoRetry();
      const resolvedProvider = data.provider_id || providerId || "lmstudio";
      const resolvedModel = data.model || model || "default";
      const mode = data.mode || "sse";
      activeProvider = resolvedProvider;
      activeModel = resolvedModel;
      applyConversationProviderModel(conversation, resolvedProvider, resolvedModel);
      const streamingEnabled = getSettings()?.streaming !== false;
      const statusLabel = streamingEnabled
        ? mode === "polling"
          ? "Polling…"
          : "Streaming…"
        : "Processing…";
      streamTiming = { startedAt: getState().streamStartTime || Date.now(), firstTokenAt: null };
      updateInspector({ status: statusLabel, latencyMs: null, durationMs: null });
      updateStreamBadge(statusLabel);
      startElapsedTimer();
      setRetryEnabled(false);
      setStreamControls(true);
      setAutoScroll(getSettings()?.autoScroll !== false);
      if (shouldAutoScroll()) {
        scrollToBottom();
      }
      setActiveStreamMeta({
        conversationId: conversation.id,
        assistantMessageId,
        providerId: resolvedProvider,
        model: resolvedModel,
        partialLength: 0,
        startedAt: Date.now(),
      });
      hideResumeNotice();
    },
    delta(data) {
      const messages = getState().messages;
      const message = messages.find((m) => m.id === assistantMessageId);
      if (!message) return;
      const nextContent = `${message.content || ""}${data.text || ""}`;
      const updated = updateMessageById(assistantMessageId, { content: nextContent, isTyping: true });
      if (streamTiming.startedAt && !streamTiming.firstTokenAt) {
        streamTiming.firstTokenAt = Date.now();
        updateInspector({ latencyMs: streamTiming.firstTokenAt - streamTiming.startedAt });
      }
      const streamingEnabled = getSettings()?.streaming !== false;
      if (updated && streamingEnabled) {
        updateMessage(updated);
      }
      if (shouldAutoScroll()) {
        scrollToBottom();
      }
    },
    final(data) {
      const meta = data?.provider_meta || null;
      const updated = updateMessageById(assistantMessageId, {
        isTyping: false,
        provider_meta: meta || undefined,
        token_usage: data?.token_usage || undefined,
      });
      if (updated) {
        updateMessage(updated);
      }
      updateStatus({ provider: activeProvider, model: activeModel, token_usage: data?.token_usage });
      if (streamTiming.startedAt) {
        updateInspector({
          status: "Completed",
          durationMs: Date.now() - streamTiming.startedAt,
        });
      }
      streamTiming = { startedAt: null, firstTokenAt: null };
      updateStreamBadge(null);
      hideResumeNotice();
      setRetryEnabled(false);
      setStreamControls(false);
      streamCompleted();
      clearActiveStreamMeta();
    },
    error(data) {
      const updated = updateMessageById(assistantMessageId, {
        metaStatus: "[error]",
        errorMessage: data?.message || "Stream failed",
        isTyping: false,
      });
      if (updated) {
        updateMessage(updated);
      }
      if (streamTiming.startedAt) {
        updateInspector({
          status: "Error",
          durationMs: Date.now() - streamTiming.startedAt,
        });
      } else {
        updateInspector({ status: "Error" });
      }
      streamTiming = { startedAt: null, firstTokenAt: null };
      updateStreamBadge("Disconnected");
      showResumeNotice("Connection interrupted. Retry to continue.");
      setRetryEnabled(true);
      setStreamControls(false);
      scheduleAutoRetry();
      streamCompleted();
    },
    reconnecting() {
      updateStreamBadge("Reconnecting…");
    },
    disconnected() {
      const updated = updateMessageById(assistantMessageId, {
        metaStatus: "[disconnected]",
        errorMessage: "Connection interrupted. You can retry.",
        isTyping: false,
      });
      if (updated) {
        updateMessage(updated);
      }
      if (streamTiming.startedAt) {
        updateInspector({
          status: "Disconnected",
          durationMs: Date.now() - streamTiming.startedAt,
        });
      } else {
        updateInspector({ status: "Disconnected" });
      }
      streamTiming = { startedAt: null, firstTokenAt: null };
      setRetryEnabled(true);
      updateStreamBadge("Disconnected");
      showResumeNotice("A response may have been interrupted.");
      setStreamControls(false);
      scheduleAutoRetry();
      streamCompleted();
    },
    canceled() {
      const updated = updateMessageById(assistantMessageId, {
        metaStatus: "[canceled]",
        isTyping: false,
      });
      if (updated) {
        updateMessage(updated);
      }
      if (streamTiming.startedAt) {
        updateInspector({
          status: "Canceled",
          durationMs: Date.now() - streamTiming.startedAt,
        });
      } else {
        updateInspector({ status: "Canceled" });
      }
      streamTiming = { startedAt: null, firstTokenAt: null };
      updateStreamBadge("Canceled");
      showResumeNotice("Response canceled. Retry if you like.");
      setRetryEnabled(true);
      setStreamControls(false);
      streamCompleted();
    },
  };
}

async function handleSend(composer) {
  if (isStreaming()) {
    showError("A stream is already running");
    return;
  }
  const text = composer?.value.trim();
  if (!text) {
    return;
  }
  const state = getState();
  const conversation = state.selectedConversation;
  if (!conversation) {
    showError("Select a conversation first");
    return;
  }
  clearAutoRetry();
  if (!state.providers.length) {
    await loadProviders();
  }
  const selection = await ensureProviderSelection(conversation.provider, conversation.model);
  if (!selection) {
    return;
  }
  applyConversationProviderModel(conversation, selection.providerId, selection.model);
  composer.value = "";
  setRetryEnabled(false);
  setStreamControls(true);
  pushMessage({ role: "user", content: text });
  renderMessages(getState().messages);
  if (getSettings()?.autoScroll !== false) {
    scrollToBottom();
  }
  const assistantMessage = pushMessage({ role: "assistant", content: "", isTyping: true });
  setCurrentAssistantMessageId(assistantMessage.id);
  renderMessages(getState().messages);
  if (getSettings()?.autoScroll !== false) {
    scrollToBottom();
  }
  setJumpButtonVisibility(false);
  updateStreamBadge(null);
  const streamSettings = buildStreamSettings();
  const stream = createSseStream({
    conversationId: conversation.id,
    providerId: conversation.provider || selection.providerId,
    model: conversation.model || selection.model,
    input: text,
    settings: streamSettings,
    onEvent: buildStreamHandlers(conversation),
  });
  attachStream(stream);
  try {
    await stream.start();
  } catch (err) {
    showError(err.message || "Stream failed");
    streamCompleted();
    setStreamControls(false);
  }
}

async function handleCancel() {
  const stream = getState().stream;
  if (!stream) {
    showError("No active stream to cancel");
    return;
  }
  stream.cancel();
}

async function handleRetry() {
  if (isStreaming()) {
    showError("Finish the current stream first");
    return;
  }
  const state = getState();
  const conversation = state.selectedConversation;
  if (!conversation) {
    showError("Select a conversation to retry");
    return;
  }
  clearAutoRetry();
  setRetryEnabled(false);
  setStreamControls(true);
  hideResumeNotice();
  const assistantMessage = pushMessage({ role: "assistant", content: "", isTyping: true });
  setCurrentAssistantMessageId(assistantMessage.id);
  renderMessages(getState().messages);
  if (getSettings()?.autoScroll !== false) {
    scrollToBottom();
  }
  updateStreamBadge(null);
  const stream = createRetryStream(conversation.id, buildStreamHandlers(conversation));
  attachStream(stream);
  try {
    await stream.start();
  } catch (err) {
    showError(err.message || "Retry failed");
    streamCompleted();
    setStreamControls(false);
  }
}

async function handleRenameConversation(conversation) {
  const title = window.prompt("New title", conversation.title);
  if (!title) return;
  if (!conversation) return;
  try {
    await patch(`/conversations/${conversation.id}`, { title });
    await refreshConversations();
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function handleDeleteConversation(conversation) {
  if (!window.confirm("Delete this conversation?")) return;
  try {
    await del(`/conversations/${conversation.id}`);
    await refreshConversations();
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function startNewConversation() {
  try {
    await post("/conversations", { title: "New chat" });
    await refreshConversations();
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function refreshConversations() {
  try {
    const payload = await get("/conversations");
    updateConversations(payload.conversations);
    renderConversations(payload.conversations, handleSelectConversation, {
      onRename: handleRenameConversation,
      onDelete: handleDeleteConversation,
    });
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function handleSelectConversation(conversation) {
  setSelectedConversation(conversation);
  renderConversations(getState().conversations, handleSelectConversation, {
    onRename: handleRenameConversation,
    onDelete: handleDeleteConversation,
  });
  if (getSettings()?.sidebarAutoCollapse) {
    updateSidebarUi(true);
  }
  document.getElementById("composerInput")?.focus();
  try {
    const payload = await get(`/conversations/${conversation.id}/messages`);
    updateMessages(payload.messages);
    resetVirtualMeasurements();
    resetVirtualRange();
    renderMessages(payload.messages);
    if (getSettings()?.autoScroll !== false) {
      scrollToBottom();
    }
    setAutoScroll(getSettings()?.autoScroll !== false);
    setJumpButtonVisibility(false);
    hideResumeNotice();
    syncConversationFromMessages(conversation, payload.messages);
    if (conversation.provider || conversation.model) {
      await setActiveProviderModel(conversation.provider, conversation.model, { persist: false });
    }
    const hint = getResumeHint(conversation.id);
    if (hint) {
      const message = payload.messages.find((msg) => msg.id === hint.assistantMessageId);
      const providerMeta = message?.provider_meta || {};
      const completed =
        providerMeta.completed === true ||
        providerMeta.canceled === true ||
        Boolean(providerMeta.finish_reason) ||
        Boolean(providerMeta.error);
      if (message && !message.token_usage && !completed) {
        showResumeNotice("A response may have been interrupted.");
        setRetryEnabled(true);
      } else {
        hideResumeNotice();
        setRetryEnabled(false);
      }
    } else {
      setRetryEnabled(false);
    }
  } catch (err) {
    showError(err.message, err.code);
  }
}

async function loadProviders() {
  try {
    const payload = await get("/providers");
    const providers = Array.isArray(payload) ? payload : payload?.providers;
    setProviders(Array.isArray(providers) ? providers : []);
    const selection = await ensureProviderSelection();
    renderProviders(getState().providers);
    renderProviderOptions(getState().providers, selection?.providerId || null);
    if (selection?.models) {
      renderModelOptions(selection.models, selection.model);
    }
  } catch (err) {
    showError(err.message, err.code);
  }
}

function setupScrolling() {
  const streamEl = getMessageStreamElement();
  if (!streamEl) return;
  let scrollRaf = null;
  streamEl.addEventListener("scroll", () => {
    const atBottom =
      streamEl.scrollHeight - streamEl.scrollTop - streamEl.clientHeight <= 80;
    const autoEnabled = getSettings()?.autoScroll !== false;
    if (autoEnabled) {
      setAutoScroll(atBottom);
    } else {
      setAutoScroll(false);
    }
    setJumpButtonVisibility(!atBottom);
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
    }
    scrollRaf = requestAnimationFrame(() => {
      refreshVisibleMessages(getState().messages);
    });
  });
}

async function mainApp() {
  const sendBtn = document.getElementById("sendBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const retryBtn = document.getElementById("retryBtn");
  const composer = document.getElementById("composerInput");
  const logoutBtn = document.getElementById("logoutBtn");
  const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  const inspectorToggleBtn = document.getElementById("inspectorToggleBtn");
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userMenuPanel = document.getElementById("userMenuPanel");

  applySettings(getSettings());
  updateSidebarUi(getUiState().sidebarCollapsed);
  updateInspectorUi(getUiState().inspectorCollapsed);
  bindSettingsAccordion();
  bindSettingsControls({
    onChange: handleSettingsChange,
    onReset: handleSettingsReset,
  });
  bindSettingsModal({
    onOpen: () => {
      updateSettingsControls(getSettings());
      const selection = getProviderSelection();
      renderProviderOptions(getState().providers, selection.providerId);
      if (selection.providerId) {
        fetchProviderModels(selection.providerId).then((models) => {
          renderModelOptions(models, selection.model);
        });
      }
      openSettingsModal();
      userMenuPanel?.classList.add("hidden");
      userMenuBtn?.setAttribute("aria-expanded", "false");
    },
    onClose: () => closeSettingsModal(),
  });
  bindProviderSelectors(handleProviderSelection);
  bindModelSelectors(handleModelSelection);
  bindMessageActions({
    onRetry: () => handleRetry(),
  });

  bindConversationActions(startNewConversation);
  bindJumpButton(() => {
    scrollToBottom();
    if (getSettings()?.autoScroll !== false) {
      setAutoScroll(true);
    }
    setJumpButtonVisibility(false);
  });
  bindResumeRetry(handleRetry);
  setupScrolling();

  sendBtn?.addEventListener("click", () => handleSend(composer));
  cancelBtn?.addEventListener("click", handleCancel);
  retryBtn?.addEventListener("click", handleRetry);
  setStreamControls(false);
  logoutBtn?.addEventListener("click", async () => {
    try {
      await logout();
    } finally {
      clearUiForLogout();
      window.location.replace(buildLoginUrl("logout"));
    }
  });

  sidebarToggleBtn?.addEventListener("click", () => {
    updateSidebarUi(!isSidebarCollapsed());
  });

  inspectorToggleBtn?.addEventListener("click", () => {
    updateInspectorUi(!isInspectorCollapsed());
  });

  userMenuBtn?.addEventListener("click", () => {
    if (!userMenuPanel) return;
    const isHidden = userMenuPanel.classList.contains("hidden");
    if (isHidden) {
      userMenuPanel.classList.remove("hidden");
      userMenuBtn.setAttribute("aria-expanded", "true");
    } else {
      userMenuPanel.classList.add("hidden");
      userMenuBtn.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", (event) => {
    if (!userMenuPanel || !userMenuBtn) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!userMenuPanel.contains(target) && !userMenuBtn.contains(target)) {
      userMenuPanel.classList.add("hidden");
      userMenuBtn.setAttribute("aria-expanded", "false");
    }
  });

  composer?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(composer);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
    }
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "b") {
      event.preventDefault();
      updateSidebarUi(!isSidebarCollapsed());
    }
    if (event.key === "Escape") {
      closeSettingsModal();
      userMenuPanel?.classList.add("hidden");
      userMenuBtn?.setAttribute("aria-expanded", "false");
    }
  });

  setupAdminPanel();
  const authed = await loadCurrentUser();
  if (!authed) {
    return;
  }

  await refreshConversations();
  await loadProviders();
  setRetryEnabled(false);
  setJumpButtonVisibility(false);
}

async function init() {
  try {
    await loadConfig();
    setBackendBadge(apiBaseUrl());
    const page = document.body.dataset.page;
    if (page === "login") {
      setAuthErrorHandler(null);
    } else {
      setAuthErrorHandler((error) => {
        if (error?.code === "E2002") {
          redirectToLogin("expired");
          return;
        }
        if (error?.code === "E2000") {
          redirectToLogin("unauthorized");
        }
      });
    }
    if (page === "login") {
      await handleLoginPage();
    } else {
      await mainApp();
    }
  } catch (err) {
    showError("Unable to boot frontend");
  }
}

init();
