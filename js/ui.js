import {
  getState,
  recordMessageHeight,
  getAverageMessageHeight,
  getVirtualBuffer,
  resetVirtualMeasurements,
  shouldAutoScroll,
  getSelectedAdminUsers,
  getProviderSelection,
  getSettings,
} from "./state.js";

const dom = {
  conversationList: document.getElementById("conversationList"),
  messageStream: document.getElementById("messageStream"),
  modelLabel: document.getElementById("modelLabel"),
  providerLabel: document.getElementById("providerLabel"),
  providerSelect: document.getElementById("providerSelect"),
  modelSelect: document.getElementById("modelSelect"),
  tokenUsage: document.getElementById("tokenUsage"),
  statusLine: document.getElementById("statusLine"),
  errorBanner: document.getElementById("errorBanner"),
  streamBadge: document.getElementById("streamBadge"),
  elapsedTime: document.getElementById("elapsedTime"),
  jumpButton: document.getElementById("jumpBottomBtn"),
  resumeNotice: document.getElementById("resumeNotice"),
  resumeRetry: document.getElementById("resumeRetryBtn"),
  backendBadge: document.getElementById("backendBadge"),
  planBadge: document.getElementById("planBadge"),
  userName: document.getElementById("userName"),
  userRoleBadge: document.getElementById("userRoleBadge"),
  providersPanel: document.getElementById("providersPanel"),
  settingsModal: document.getElementById("settingsModal"),
  settingsOpenBtn: document.getElementById("settingsOpenBtn"),
  settingsCloseBtn: document.getElementById("settingsCloseBtn"),
  settingsGroups: document.getElementById("settingsGroups"),
  settingsProviderSelect: document.getElementById("settingsProviderSelect"),
  settingsModelSelect: document.getElementById("settingsModelSelect"),
  settingTemperature: document.getElementById("settingTemperature"),
  settingTopP: document.getElementById("settingTopP"),
  settingMaxTokens: document.getElementById("settingMaxTokens"),
  settingStreaming: document.getElementById("settingStreaming"),
  settingTheme: document.getElementById("settingTheme"),
  settingFontSize: document.getElementById("settingFontSize"),
  settingCodeStyle: document.getElementById("settingCodeStyle"),
  settingDensity: document.getElementById("settingDensity"),
  settingSidebarCollapse: document.getElementById("settingSidebarCollapse"),
  settingAutoScroll: document.getElementById("settingAutoScroll"),
  settingShowTokens: document.getElementById("settingShowTokens"),
  settingShowMeta: document.getElementById("settingShowMeta"),
  settingRetryBehavior: document.getElementById("settingRetryBehavior"),
  settingTransport: document.getElementById("settingTransport"),
  settingDebug: document.getElementById("settingDebug"),
  settingsResetBtn: document.getElementById("settingsResetBtn"),
  adminToggle: document.getElementById("adminToggleBtn"),
  adminPanel: document.getElementById("adminPanel"),
  adminCloseBtn: document.getElementById("adminCloseBtn"),
  adminUsersTable: document.getElementById("adminUsersTable"),
  adminUsersRefresh: document.getElementById("adminUsersRefreshBtn"),
  adminUsageList: document.getElementById("adminUsageList"),
  adminUsageRefresh: document.getElementById("adminUsageRefreshBtn"),
  adminInvitesForm: document.getElementById("adminInvitesForm"),
  adminInvitesList: document.getElementById("adminInvitesList"),
  adminAuditList: document.getElementById("adminAuditList"),
  adminAuditRefresh: document.getElementById("adminAuditRefreshBtn"),
  adminExportUsers: document.getElementById("adminExportUsersBtn"),
  bulkEnableBtn: document.getElementById("bulkEnableUsersBtn"),
  bulkDisableBtn: document.getElementById("bulkDisableUsersBtn"),
  adminSelectionCount: document.getElementById("adminSelectionCount"),
  adminExportUsage: document.getElementById("adminExportUsageBtn"),
  adminExportAudit: document.getElementById("adminExportAuditBtn"),
  adminAuditEventFilter: document.getElementById("adminAuditEventFilter"),
  adminAuditFromFilter: document.getElementById("adminAuditFromFilter"),
  adminAuditToFilter: document.getElementById("adminAuditToFilter"),
  adminAuditApply: document.getElementById("adminApplyAuditFilterBtn"),
};

let copyTimeouts = new Map();
const virtualizationState = {
  lastRange: { start: -1, end: -1 },
};

function createInlineNodes(text) {
  const fragment = document.createDocumentFragment();
  const parts = text.split(/`([^`]+)`/g);
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const code = document.createElement("code");
      code.textContent = part;
      fragment.appendChild(code);
      return;
    }
    if (part) {
      fragment.appendChild(document.createTextNode(part));
    }
  });
  return fragment;
}

function createCodeBlock(content, lang) {
  const wrapper = document.createElement("div");
  wrapper.className = "code-block";
  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  codeEl.textContent = content;
  if (lang) {
    codeEl.dataset.lang = lang;
  }
  pre.appendChild(codeEl);
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "copy-snippet";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      copyBtn.textContent = "Copied";
      clearTimeout(copyTimeouts.get(copyBtn));
      const handle = setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1200);
      copyTimeouts.set(copyBtn, handle);
    } catch {
      copyBtn.textContent = "Error";
      clearTimeout(copyTimeouts.get(copyBtn));
      const handle = setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1200);
      copyTimeouts.set(copyBtn, handle);
    }
  });
  wrapper.append(pre, copyBtn);
  return wrapper;
}

function renderMessageContent(text) {
  const fragment = document.createDocumentFragment();
  if (!text) return fragment;
  const lines = text.split("\n");
  let paragraph = null;
  let list = null;
  let inCode = false;
  let codeLines = [];
  let codeLang = "";

  const flushParagraph = () => {
    if (!paragraph) return;
    fragment.appendChild(paragraph);
    paragraph = null;
  };

  const flushList = () => {
    if (!list) return;
    fragment.appendChild(list);
    list = null;
  };

  const flushCode = () => {
    if (!inCode) return;
    const block = createCodeBlock(codeLines.join("\n"), codeLang);
    fragment.appendChild(block);
    codeLines = [];
    codeLang = "";
    inCode = false;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\r$/, "");
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    const listMatch = trimmed.match(/^(\d+\.)\s+(.*)$/) || trimmed.match(/^([-*+])\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      const marker = listMatch[1];
      const isNumeric = marker.endsWith(".");
      if (!list || (list.tagName === "UL" && isNumeric) || (list.tagName === "OL" && !isNumeric)) {
        flushList();
        list = document.createElement(isNumeric ? "ol" : "ul");
        list.className = "message-list";
      }
      const li = document.createElement("li");
      li.appendChild(createInlineNodes(listMatch[2]));
      list.appendChild(li);
      return;
    }
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    if (!paragraph) {
      paragraph = document.createElement("p");
    } else {
      paragraph.appendChild(document.createTextNode(" "));
    }
    paragraph.appendChild(createInlineNodes(line));
  });
  flushCode();
  flushParagraph();
  flushList();
  return fragment;
}

function parseProviderMeta(message) {
  if (!message) return null;
  const raw = message.provider_meta;
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function collectMetadata(message) {
  const meta = parseProviderMeta(message);
  const entries = [];
  const providerId =
    message.provider || meta?.provider_id || meta?.provider || message.provider_id || null;
  const model = message.model || meta?.model || null;
  if (providerId) {
    entries.push(["Provider", providerId]);
  }
  if (model) {
    entries.push(["Model", model]);
  }
  if (message.metaStatus) {
    entries.push(["Status", message.metaStatus]);
  }
  if (meta?.finish_reason) {
    entries.push(["Finish", meta.finish_reason]);
  }
  if (meta?.request_id) {
    entries.push(["Request", meta.request_id]);
  }
  if (meta?.stream_id) {
    entries.push(["Stream", meta.stream_id]);
  }
  if (meta?.completed === true) {
    entries.push(["Completed", "Yes"]);
  }
  if (meta?.canceled === true) {
    entries.push(["Canceled", "Yes"]);
  }
  if (meta?.error?.message || meta?.error?.code) {
    const label = meta.error.code ? `${meta.error.code}` : "Error";
    entries.push([label, meta.error.message || "Stream error"]);
  }
  if (message.token_usage?.total_tokens != null) {
    entries.push(["Tokens", String(message.token_usage.total_tokens)]);
  }
  if (message.errorMessage) {
    entries.push(["Error", message.errorMessage]);
  }
  if (message.created_at) {
    entries.push(["Created", message.created_at]);
  }
  const settings = getSettings();
  if (settings?.debugMode) {
    if (message.id) {
      entries.push(["Message ID", message.id]);
    }
    if (meta?.conversation_id) {
      entries.push(["Conversation", meta.conversation_id]);
    }
  }
  return { entries, meta };
}

function createMetaPanel(metaInfo) {
  const panel = document.createElement("div");
  panel.className = "message-meta-panel";
  if (!metaInfo?.entries?.length) {
    panel.textContent = "No metadata available.";
    return panel;
  }
  metaInfo.entries.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "message-meta-item";
    const key = document.createElement("span");
    key.textContent = label;
    const val = document.createElement("strong");
    val.textContent = value;
    row.append(key, val);
    panel.appendChild(row);
  });
  if (getSettings()?.debugMode && metaInfo.meta) {
    const raw = document.createElement("pre");
    raw.className = "message-meta-raw";
    raw.textContent = JSON.stringify(metaInfo.meta, null, 2);
    panel.appendChild(raw);
  }
  return panel;
}

function createTypingPlaceholder() {
  const placeholder = document.createElement("div");
  placeholder.className = "message-placeholder";
  placeholder.innerHTML = "<span></span><span></span><span></span>";
  return placeholder;
}

function createMessageElement(message) {
  const el = document.createElement("article");
  el.className = `message ${message.role}`;
  el.dataset.messageId = message.id;
  if (message.role === "assistant" && message.isTyping) {
    el.classList.add("typing");
  }
  const header = document.createElement("div");
  header.className = "message-header";
  const role = document.createElement("span");
  role.className = "message-role";
  role.textContent = message.role === "assistant" ? "Assistant" : "You";
  header.appendChild(role);
  if (message.role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.dataset.action = "copy-message";
    copyBtn.textContent = "Copy";
    copyBtn.title = "Copy this response";
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.dataset.action = "retry-message";
    retryBtn.textContent = "Retry";
    retryBtn.title = "Retry this response";
    actions.append(copyBtn, retryBtn);
    header.appendChild(actions);
  }
  el.appendChild(header);
  const contentNode = document.createElement("div");
  contentNode.className = "message-content";
  if (message.isTyping && !message.content) {
    contentNode.appendChild(createTypingPlaceholder());
  } else {
    contentNode.appendChild(renderMessageContent(message.content || ""));
  }
  el.appendChild(contentNode);
  const metaInfo = collectMetadata(message);
  if (metaInfo.entries.length) {
    const metaToggle = document.createElement("button");
    metaToggle.type = "button";
    metaToggle.className = "message-meta-toggle";
    metaToggle.dataset.action = "toggle-meta";
    metaToggle.textContent = "Details";
    metaToggle.title = "Show provider metadata";
    el.appendChild(metaToggle);
    el.appendChild(createMetaPanel(metaInfo));
  }
  if (message.errorMessage) {
    const err = document.createElement("div");
    err.className = "message-error";
    err.textContent = message.errorMessage;
    el.appendChild(err);
  }
  if (message.role === "assistant" && message.isTyping) {
    const cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    cursor.setAttribute("aria-hidden", "true");
    el.appendChild(cursor);
  }
  return el;
}

function computeVisibleRange(messages, container) {
  const total = messages.length;
  const avgHeight = Math.max(getAverageMessageHeight(), 64);
  const buffer = Math.max(3, getVirtualBuffer());
  const viewportHeight = container.clientHeight || 400;
  const scrollTop = container.scrollTop;
  const start = Math.max(0, Math.floor(scrollTop / avgHeight) - buffer);
  const visibleCount = Math.ceil(viewportHeight / avgHeight) + buffer * 2;
  const end = Math.min(total, start + visibleCount);
  return { start, end, avgHeight };
}

function createSpacer(height) {
  const spacer = document.createElement("div");
  spacer.className = "virtual-spacer";
  spacer.style.height = `${Math.max(height, 0)}px`;
  return spacer;
}

function measureRenderedHeights() {
  if (!dom.messageStream) return;
  const nodes = dom.messageStream.querySelectorAll(".message");
  nodes.forEach((node) => {
    const id = node.getAttribute("data-message-id");
    if (!id) return;
    const rect = node.getBoundingClientRect();
    if (rect.height > 0) {
      recordMessageHeight(id, rect.height);
    }
  });
}

function updateVisibleWindow(messages, { force = false, preserveScroll = null } = {}) {
  if (!dom.messageStream) return;
  const container = dom.messageStream;
  if (!messages.length) {
    container.innerHTML = "";
    virtualizationState.lastRange = { start: -1, end: -1 };
    return;
  }
  const { start, end, avgHeight } = computeVisibleRange(messages, container);
  if (!force &&
    virtualizationState.lastRange.start === start &&
    virtualizationState.lastRange.end === end
  ) {
    if (preserveScroll != null) {
      container.scrollTop = preserveScroll;
    }
    return;
  }
  virtualizationState.lastRange = { start, end };
  const fragment = document.createDocumentFragment();
  fragment.appendChild(createSpacer(start * avgHeight));
  for (let idx = start; idx < end; idx++) {
    fragment.appendChild(createMessageElement(messages[idx]));
  }
  fragment.appendChild(
    createSpacer((messages.length - end) * avgHeight)
  );
  const previousScroll = container.scrollTop;
  container.innerHTML = "";
  container.appendChild(fragment);
  measureRenderedHeights();
  if (preserveScroll != null) {
    container.scrollTop = preserveScroll;
  } else {
    container.scrollTop = previousScroll;
  }
}

export function refreshVisibleMessages(messages) {
  updateVisibleWindow(messages, { force: false });
}

export function resetVirtualRange() {
  virtualizationState.lastRange = { start: -1, end: -1 };
}

function updateMessageElement(message) {
  if (!dom.messageStream) return;
  const existing = dom.messageStream.querySelector(`[data-message-id="${message.id}"]`);
  if (!existing) return;
  const contentNode = existing.querySelector(".message-content");
  contentNode.innerHTML = "";
  if (message.isTyping && !message.content) {
    contentNode.appendChild(createTypingPlaceholder());
  } else {
    contentNode.appendChild(renderMessageContent(message.content || ""));
  }
  const metaInfo = collectMetadata(message);
  const metaToggle = existing.querySelector(".message-meta-toggle");
  const metaPanel = existing.querySelector(".message-meta-panel");
  if (metaInfo.entries.length) {
    if (!metaToggle) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "message-meta-toggle";
      toggle.dataset.action = "toggle-meta";
      toggle.textContent = "Details";
      existing.appendChild(toggle);
    }
    if (metaPanel) {
      metaPanel.remove();
    }
    existing.appendChild(createMetaPanel(metaInfo));
  } else {
    metaToggle?.remove();
    metaPanel?.remove();
  }
  const errorEl = existing.querySelector(".message-error");
  if (message.errorMessage) {
    if (errorEl) {
      errorEl.textContent = message.errorMessage;
    } else {
      const err = document.createElement("div");
      err.className = "message-error";
      err.textContent = message.errorMessage;
      existing.appendChild(err);
    }
  } else if (errorEl) {
    errorEl.remove();
  }
  if (message.role === "assistant" && message.isTyping) {
    existing.classList.add("typing");
    if (!existing.querySelector(".typing-cursor")) {
      const cursor = document.createElement("span");
      cursor.className = "typing-cursor";
      cursor.setAttribute("aria-hidden", "true");
      existing.appendChild(cursor);
    }
  } else {
    existing.classList.remove("typing");
    existing.querySelectorAll(".typing-cursor").forEach((node) => node.remove());
  }
  captureMessageHeight(message.id);
}

function captureMessageHeight(messageId) {
  if (!messageId || !dom.messageStream) return;
  const el = dom.messageStream.querySelector(`[data-message-id="${messageId}"]`);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.height > 0) {
    recordMessageHeight(messageId, rect.height);
  }
}

function isErrorCode(value) {
  return typeof value === "string" && /^E\d{4}$/.test(value);
}

function formatErrorMessage(message, code) {
  if (code === "E1005") {
    return "Rate limit reached. Please wait a moment and try again.";
  }
  if (code === "E2000" || code === "E2002") {
    return "Session expired. Please sign in again.";
  }
  if (code === "E_NETWORK") {
    return "Backend unavailable. Check your tunnel connection and refresh.";
  }
  return message;
}

function setConnectionStatus(status) {
  if (!dom.backendBadge) return;
  const label = status || "Online";
  dom.backendBadge.textContent = label;
  dom.backendBadge.dataset.status = label.toLowerCase().replace(/\s+/g, "-");
}

export function showError(message, requestIdOrCode) {
  if (!dom.errorBanner) return;
  const code = isErrorCode(requestIdOrCode) ? requestIdOrCode : null;
  const requestId = code ? null : requestIdOrCode;
  const text = formatErrorMessage(message, code);
  dom.errorBanner.textContent = requestId ? `${text} (request: ${requestId})` : text;
  dom.errorBanner.classList.remove("hidden");
  setTimeout(() => dom.errorBanner?.classList.add("hidden"), 6000);
  if (code === "E_NETWORK") {
    setConnectionStatus("Offline");
  }
}

export function renderConversations(conversations, onSelect, { onRename, onDelete }) {
  if (!dom.conversationList) return;
  dom.conversationList.innerHTML = "";
  const currentId = getState().selectedConversation?.id;
  if (!conversations.length) {
    dom.conversationList.innerHTML = "<div class='empty-state'>No conversations yet. Start a new chat.</div>";
    return;
  }
  conversations.forEach((conv) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "conversation-item";
    if (currentId === conv.id) {
      item.classList.add("active");
    }
    item.title = `Open conversation: ${conv.title || "New chat"}`;
    item.addEventListener("click", () => onSelect(conv));

    const label = document.createElement("span");
    label.textContent = conv.title || "New chat";
    item.appendChild(label);

    const actions = document.createElement("span");
    actions.className = "conversation-actions";
    if (onRename) {
      const rename = document.createElement("button");
      rename.type = "button";
      rename.innerText = "✎";
      rename.setAttribute("aria-label", "Rename conversation");
      rename.title = "Rename conversation";
      rename.addEventListener("click", (event) => {
        event.stopPropagation();
        onRename(conv);
      });
      actions.appendChild(rename);
    }
    if (onDelete) {
      const del = document.createElement("button");
      del.type = "button";
      del.innerText = "🗑";
      del.setAttribute("aria-label", "Delete conversation");
      del.title = "Delete conversation";
      del.addEventListener("click", (event) => {
        event.stopPropagation();
        onDelete(conv);
      });
      actions.appendChild(del);
    }
    item.appendChild(actions);
    dom.conversationList.appendChild(item);
  });
}

export function renderMessages(messages) {
  if (!dom.messageStream) return;
  const preserveScroll = shouldAutoScroll() ? null : dom.messageStream.scrollTop;
  updateVisibleWindow(messages, { force: true, preserveScroll });
  if (shouldAutoScroll()) {
    scrollToBottom();
  }
}

export function updateMessage(message) {
  updateMessageElement(message);
}

export function updateStatus({ provider, model, token_usage }) {
  if (dom.providerLabel) {
    dom.providerLabel.textContent = provider || "—";
  }
  if (dom.modelLabel) {
    dom.modelLabel.textContent = model || "—";
  }
  if (dom.tokenUsage) {
    dom.tokenUsage.textContent = token_usage
      ? `Tokens: ${token_usage.total_tokens ?? "—"}`
      : "Tokens: —";
  }
}

export function setBackendBadge(baseUrl) {
  if (!dom.backendBadge || !baseUrl) return;
  let label = baseUrl;
  try {
    const url = new URL(baseUrl);
    label = url.host;
  } catch {
    label = baseUrl;
  }
  dom.backendBadge.textContent = "Online";
  dom.backendBadge.title = baseUrl;
  dom.backendBadge.dataset.host = label;
  dom.backendBadge.dataset.status = "online";
}

export function setUserSummary(user) {
  if (dom.userName) {
    dom.userName.textContent = user?.username || "Guest";
  }
  if (dom.userRoleBadge) {
    const rawRole = (user?.role || "member").toLowerCase();
    let label = "Member";
    if (rawRole === "admin") label = "Admin";
    if (rawRole === "vip") label = "VIP";
    dom.userRoleBadge.textContent = label;
    dom.userRoleBadge.dataset.role = rawRole;
  }
}

export function setPlanBadge(user) {
  if (!dom.planBadge) return;
  const rawRole = (user?.role || "free").toLowerCase();
  let label = "Free";
  if (rawRole === "admin") label = "Admin";
  if (rawRole === "vip") label = "VIP";
  dom.planBadge.textContent = `Plan: ${label}`;
  dom.planBadge.dataset.plan = label.toLowerCase();
}

export function renderProviders(providers) {
  if (!dom.providersPanel) return;
  dom.providersPanel.innerHTML = "";
  if (!providers || !providers.length) {
    dom.providersPanel.innerHTML = "<span class='muted'>No providers configured.</span>";
    return;
  }
  const activeProvider = getProviderSelection()?.providerId;
  providers.forEach((provider) => {
    const chip = document.createElement("span");
    chip.className = "provider-chip";
    let providerId = "";
    if (typeof provider === "string") {
      chip.textContent = provider;
      providerId = provider;
    } else {
      providerId = provider?.id || provider?.provider_id || provider?.label || "";
      chip.textContent = provider?.label || providerId || "Provider";
    }
    chip.title = providerId ? `Provider: ${providerId}` : "Provider";
    if (activeProvider && providerId && activeProvider === providerId) {
      chip.classList.add("active");
    }
    dom.providersPanel.appendChild(chip);
  });
}

export function renderProviderOptions(providers, activeProviderId) {
  const list = Array.isArray(providers) ? providers : [];
  const options = list
    .map((provider) => {
      if (typeof provider === "string") {
        return { id: provider, label: provider };
      }
      const id = provider?.id || provider?.provider_id || provider?.label || "";
      return { id, label: provider?.label || id || "Provider" };
    })
    .filter((item) => item.id);
  const selects = [dom.providerSelect, dom.settingsProviderSelect].filter(Boolean);
  selects.forEach((select) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    options.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.label;
      select.appendChild(opt);
    });
    const next = activeProviderId || current || options[0]?.id || "";
    if (next) {
      select.value = next;
    }
    select.disabled = options.length === 0;
  });
}

export function renderModelOptions(models, activeModel) {
  const list = Array.isArray(models) ? models.filter(Boolean) : [];
  const selects = [dom.modelSelect, dom.settingsModelSelect].filter(Boolean);
  selects.forEach((select) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    list.forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model;
      opt.textContent = model;
      select.appendChild(opt);
    });
    const next = activeModel || current || list[0] || "";
    if (next) {
      select.value = next;
    }
    select.disabled = list.length === 0;
  });
}

export function bindProviderSelectors(onChange) {
  [dom.providerSelect, dom.settingsProviderSelect].forEach((select) => {
    select?.addEventListener("change", () => {
      onChange?.(select.value);
    });
  });
}

export function bindModelSelectors(onChange) {
  [dom.modelSelect, dom.settingsModelSelect].forEach((select) => {
    select?.addEventListener("change", () => {
      onChange?.(select.value);
    });
  });
}

function parseNumber(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function bindSettingsControls(callbacks) {
  const notify = (key, value) => callbacks?.onChange?.({ [key]: value });
  dom.settingTemperature?.addEventListener("change", () => {
    notify("temperature", parseNumber(dom.settingTemperature.value));
  });
  dom.settingTopP?.addEventListener("change", () => {
    notify("top_p", parseNumber(dom.settingTopP.value));
  });
  dom.settingMaxTokens?.addEventListener("change", () => {
    notify("max_tokens", parseNumber(dom.settingMaxTokens.value));
  });
  dom.settingStreaming?.addEventListener("change", () => {
    notify("streaming", dom.settingStreaming.checked);
  });
  dom.settingTheme?.addEventListener("change", () => {
    notify("theme", dom.settingTheme.value);
  });
  dom.settingFontSize?.addEventListener("change", () => {
    notify("fontSize", dom.settingFontSize.value);
  });
  dom.settingCodeStyle?.addEventListener("change", () => {
    notify("codeStyle", dom.settingCodeStyle.value);
  });
  dom.settingDensity?.addEventListener("change", () => {
    notify("density", dom.settingDensity.value);
  });
  dom.settingSidebarCollapse?.addEventListener("change", () => {
    notify("sidebarAutoCollapse", dom.settingSidebarCollapse.checked);
  });
  dom.settingAutoScroll?.addEventListener("change", () => {
    notify("autoScroll", dom.settingAutoScroll.checked);
  });
  dom.settingShowTokens?.addEventListener("change", () => {
    notify("showTokenUsage", dom.settingShowTokens.checked);
  });
  dom.settingShowMeta?.addEventListener("change", () => {
    notify("showProviderMetadata", dom.settingShowMeta.checked);
  });
  dom.settingRetryBehavior?.addEventListener("change", () => {
    notify("retryBehavior", dom.settingRetryBehavior.value);
  });
  dom.settingTransport?.addEventListener("change", () => {
    notify("transportPreference", dom.settingTransport.value);
  });
  dom.settingDebug?.addEventListener("change", () => {
    notify("debugMode", dom.settingDebug.checked);
  });
  dom.settingsResetBtn?.addEventListener("click", () => callbacks?.onReset?.());
}

export function updateSettingsControls(settings) {
  if (!settings) return;
  if (dom.settingTemperature) {
    dom.settingTemperature.value = settings.temperature ?? "";
  }
  if (dom.settingTopP) {
    dom.settingTopP.value = settings.top_p ?? "";
  }
  if (dom.settingMaxTokens) {
    dom.settingMaxTokens.value = settings.max_tokens ?? "";
  }
  if (dom.settingStreaming) {
    dom.settingStreaming.checked = settings.streaming !== false;
  }
  if (dom.settingTheme) {
    dom.settingTheme.value = settings.theme || "dark";
  }
  if (dom.settingFontSize) {
    dom.settingFontSize.value = settings.fontSize || "md";
  }
  if (dom.settingCodeStyle) {
    dom.settingCodeStyle.value = settings.codeStyle || "contrast";
  }
  if (dom.settingDensity) {
    dom.settingDensity.value = settings.density || "comfortable";
  }
  if (dom.settingSidebarCollapse) {
    dom.settingSidebarCollapse.checked = Boolean(settings.sidebarAutoCollapse);
  }
  if (dom.settingAutoScroll) {
    dom.settingAutoScroll.checked = settings.autoScroll !== false;
  }
  if (dom.settingShowTokens) {
    dom.settingShowTokens.checked = settings.showTokenUsage !== false;
  }
  if (dom.settingShowMeta) {
    dom.settingShowMeta.checked = Boolean(settings.showProviderMetadata);
  }
  if (dom.settingRetryBehavior) {
    dom.settingRetryBehavior.value = settings.retryBehavior || "manual";
  }
  if (dom.settingTransport) {
    dom.settingTransport.value = settings.transportPreference || "sse";
  }
  if (dom.settingDebug) {
    dom.settingDebug.checked = Boolean(settings.debugMode);
  }
}

export function applySettingsToUI(settings) {
  if (!settings || typeof document === "undefined") return;
  document.body.dataset.theme = settings.theme || "dark";
  document.body.dataset.density = settings.density || "comfortable";
  document.body.dataset.codeStyle = settings.codeStyle || "contrast";
  document.body.dataset.fontSize = settings.fontSize || "md";
  document.body.dataset.showTokens = settings.showTokenUsage ? "on" : "off";
  document.body.dataset.showMeta = settings.showProviderMetadata ? "on" : "off";
  document.body.dataset.debug = settings.debugMode ? "on" : "off";
}

export function bindSettingsAccordion() {
  if (!dom.settingsGroups) return;
  const groups = dom.settingsGroups.querySelectorAll("details.settings-group");
  groups.forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (!detail.open) return;
      groups.forEach((other) => {
        if (other !== detail) {
          other.open = false;
        }
      });
    });
  });
}

export function openSettingsModal() {
  if (!dom.settingsModal) return;
  dom.settingsModal.classList.remove("hidden");
  dom.settingsModal.setAttribute("aria-hidden", "false");
  dom.settingsCloseBtn?.focus();
}

export function closeSettingsModal() {
  if (!dom.settingsModal) return;
  dom.settingsModal.classList.add("hidden");
  dom.settingsModal.setAttribute("aria-hidden", "true");
}

export function bindSettingsModal(callbacks) {
  dom.settingsOpenBtn?.addEventListener("click", () => callbacks?.onOpen?.());
  dom.settingsCloseBtn?.addEventListener("click", () => callbacks?.onClose?.());
  dom.settingsModal?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.matches("[data-close='settings']")) {
      callbacks?.onClose?.();
    }
  });
}

export function bindMessageActions(callbacks) {
  dom.messageStream?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const messageEl = button.closest(".message");
    const messageId = messageEl?.getAttribute("data-message-id");
    if (!messageId) return;
    if (action === "toggle-meta") {
      messageEl?.classList.toggle("meta-open");
      return;
    }
    const message = getState().messages.find((msg) => msg.id === messageId);
    if (!message) return;
    if (action === "copy-message") {
      const content = message.content || "";
      button.setAttribute("aria-busy", "true");
      if (!navigator?.clipboard) {
        button.textContent = "Error";
        const handle = setTimeout(() => {
          button.textContent = "Copy";
          button.removeAttribute("aria-busy");
        }, 1200);
        copyTimeouts.set(button, handle);
        return;
      }
      navigator.clipboard.writeText(content).then(
        () => {
          button.textContent = "Copied";
          clearTimeout(copyTimeouts.get(button));
          const handle = setTimeout(() => {
            button.textContent = "Copy";
            button.removeAttribute("aria-busy");
          }, 1200);
          copyTimeouts.set(button, handle);
        },
        () => {
          button.textContent = "Error";
          clearTimeout(copyTimeouts.get(button));
          const handle = setTimeout(() => {
            button.textContent = "Copy";
            button.removeAttribute("aria-busy");
          }, 1200);
          copyTimeouts.set(button, handle);
        }
      );
    }
    if (action === "retry-message") {
      callbacks?.onRetry?.(message);
    }
  });
}

export function clearMessages() {
  if (dom.messageStream) {
    dom.messageStream.innerHTML = "";
  }
}

export function bindConversationActions(onNew) {
  document.getElementById("newConvoBtn")?.addEventListener("click", onNew);
}

export function bindJumpButton(onClick) {
  dom.jumpButton?.addEventListener("click", () => {
    onClick?.();
  });
}

export function setJumpButtonVisibility(visible) {
  if (!dom.jumpButton) return;
  dom.jumpButton.classList.toggle("hidden", !visible);
}

export function bindResumeRetry(onRetry) {
  dom.resumeRetry?.addEventListener("click", () => {
    onRetry?.();
  });
}

export function showResumeNotice(message) {
  if (!dom.resumeNotice) return;
  dom.resumeNotice.classList.remove("hidden");
  const span = dom.resumeNotice.querySelector("span");
  if (span) {
    span.textContent = message;
  } else if (dom.resumeNotice.firstChild) {
    dom.resumeNotice.firstChild.textContent = message;
  }
}

export function hideResumeNotice() {
  if (!dom.resumeNotice) return;
  dom.resumeNotice.classList.add("hidden");
}

export function updateStreamBadge(status) {
  if (!dom.streamBadge) return;
  if (!status) {
    dom.streamBadge.classList.add("hidden");
    dom.streamBadge.textContent = "";
    setConnectionStatus("Online");
    return;
  }
  dom.streamBadge.classList.remove("hidden");
  dom.streamBadge.textContent = status;
  if (status.toLowerCase().includes("polling")) {
    setConnectionStatus("Polling");
  } else if (status.toLowerCase().includes("reconnect")) {
    setConnectionStatus("Reconnecting");
  } else if (status.toLowerCase().includes("disconnect")) {
    setConnectionStatus("Offline");
  } else {
    setConnectionStatus("Online");
  }
}

export function updateElapsedTime(seconds) {
  if (!dom.elapsedTime) return;
  if (!seconds) {
    dom.elapsedTime.classList.add("hidden");
    dom.elapsedTime.textContent = "";
    return;
  }
  dom.elapsedTime.classList.remove("hidden");
  const padded = String(seconds).padStart(2, "0");
  dom.elapsedTime.textContent = `Elapsed: ${padded}s`;
}

export function scrollToBottom() {
  if (!dom.messageStream) return;
  dom.messageStream.scrollTop = dom.messageStream.scrollHeight;
}

export function getMessageStreamElement() {
  return dom.messageStream;
}

export function setAdminToggleVisible(visible) {
  dom.adminToggle?.classList.toggle("hidden", !visible);
}

export function bindAdminToggle(onToggle) {
  dom.adminToggle?.addEventListener("click", () => onToggle?.());
}

export function showAdminPanel() {
  dom.adminPanel?.classList.remove("hidden");
}

export function hideAdminPanel() {
  dom.adminPanel?.classList.add("hidden");
}

export function bindAdminClose(onClose) {
  dom.adminCloseBtn?.addEventListener("click", () => {
    onClose?.();
  });
}

export function bindAdminRefreshButtons(callbacks) {
  dom.adminUsersRefresh?.addEventListener("click", () => callbacks?.onUsers?.());
  dom.adminUsageRefresh?.addEventListener("click", () => callbacks?.onUsage?.());
  dom.adminAuditRefresh?.addEventListener("click", () => callbacks?.onAudit?.());
}

export function bindAdminInviteForm(onSubmit) {
  dom.adminInvitesForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!dom.adminInvitesForm) return;
    const formData = new FormData(dom.adminInvitesForm);
    const payload = {
      expires_in_seconds: Number(formData.get("expires_in_seconds")) || 0,
      max_uses: Number(formData.get("max_uses")) || 1,
    };
    onSubmit?.(payload);
  });
}

export function renderAdminUsers(users) {
  if (!dom.adminUsersTable) return;
  dom.adminUsersTable.innerHTML = "";
  if (!users.length) {
    dom.adminUsersTable.innerHTML = "<div class='admin-empty-state'>No users yet. Create a conversation to invite people.</div>";
    return;
  }
  const table = document.createElement("table");
  table.className = "admin-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const selectHeader = document.createElement("th");
  selectHeader.className = "select-column";
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
  selectAll.className = "admin-select-all";
  selectAll.id = "adminSelectAllUsers";
  selectAll.setAttribute("aria-label", "Select all users");
  selectHeader.appendChild(selectAll);
  dom.adminSelectAllUsers = selectAll;
  headerRow.appendChild(selectHeader);
  ["User", "Role", "Status", "Messages/day", "Tokens/day", "Actions"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  const tbody = document.createElement("tbody");
  users.forEach((user) => {
    const row = document.createElement("tr");
    row.className = "admin-user-row";
    row.dataset.userId = user.id;
    row.tabIndex = 0;
    row.setAttribute("role", "row");
    row.setAttribute("aria-label", `${user.username || "user"} row`);
    const selectedIds = getSelectedAdminUsers();
    const isSelected = selectedIds.includes(user.id);
    if (isSelected) {
      row.classList.add("selected");
    }
    const userCell = document.createElement("td");
    userCell.innerHTML = `<strong>${user.username}</strong><br/><span class="metadata">${user.email || "—"}</span>`;
    const roleCell = document.createElement("td");
    roleCell.textContent = user.role;
    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `status-pill ${user.status}`;
    statusBadge.textContent = user.status;
    statusCell.appendChild(statusBadge);
    const selectCell = document.createElement("td");
    selectCell.className = "select-column";
    const userCheckbox = document.createElement("input");
    userCheckbox.type = "checkbox";
    userCheckbox.className = "admin-select-user";
    userCheckbox.dataset.userId = user.id;
    userCheckbox.checked = isSelected;
    selectCell.appendChild(userCheckbox);
    const messagesCell = document.createElement("td");
    const messagesInput = document.createElement("input");
    messagesInput.type = "number";
    messagesInput.min = "0";
    messagesInput.className = "admin-quota-input admin-quota-messages";
    messagesInput.value =
      user.quotas?.messages_per_day != null ? user.quotas.messages_per_day : "";
    const messagesHelper = document.createElement("div");
    messagesHelper.className = "admin-quota-helper";
    messagesHelper.textContent = "Leave blank for unlimited.";
    messagesCell.append(messagesInput, messagesHelper);
    const tokensCell = document.createElement("td");
    const tokensInput = document.createElement("input");
    tokensInput.type = "number";
    tokensInput.min = "0";
    tokensInput.className = "admin-quota-input admin-quota-tokens";
    tokensInput.value =
      user.quotas?.tokens_per_day != null ? user.quotas.tokens_per_day : "";
    const tokensHelper = document.createElement("div");
    tokensHelper.className = "admin-quota-helper";
    tokensHelper.textContent = "Leave blank for unlimited.";
    tokensCell.append(tokensInput, tokensHelper);
    const actionsCell = document.createElement("td");
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "link-btn";
    toggleBtn.dataset.action = "toggle-status";
    const nextStatus = user.status === "active" ? "disabled" : "active";
    toggleBtn.dataset.nextStatus = nextStatus;
    toggleBtn.textContent = user.status === "active" ? "Disable" : "Enable";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.dataset.action = "save-quotas";
    saveBtn.className = "link-btn";
    saveBtn.textContent = "Save quotas";
    actionsCell.append(toggleBtn, saveBtn);

    row.append(selectCell, userCell, roleCell, statusCell, messagesCell, tokensCell, actionsCell);
    tbody.appendChild(row);
  });
  table.append(thead, tbody);
  dom.adminUsersTable.appendChild(table);
}

function collectSelectedUserIds() {
  if (!dom.adminUsersTable) return [];
  return Array.from(dom.adminUsersTable.querySelectorAll(".admin-select-user:checked"))
    .map((input) => input.dataset.userId)
    .filter(Boolean);
}

function validateQuotaInput(input) {
  if (!input) return true;
  const value = input.value.trim();
  const helper = input.parentElement?.querySelector(".admin-quota-helper");
  const isInvalid = value && (Number(value) < 0 || Number.isNaN(Number(value)));
  const defaultText = "Leave blank for unlimited.";
  if (isInvalid) {
    input.classList.add("invalid");
    helper?.classList.add("invalid");
    if (helper) {
      helper.textContent = "Enter a number ≥ 0 (or leave blank).";
    }
    return false;
  }
  input.classList.remove("invalid");
  helper?.classList.remove("invalid");
  if (helper) {
    helper.textContent = defaultText;
  }
  return true;
}

export function updateSelectionSummary(count) {
  if (!dom.adminSelectionCount) return;
  if (count > 0) {
    dom.adminSelectionCount.textContent = `${count} selected`;
    dom.adminSelectionCount.classList.remove("hidden");
  } else {
    dom.adminSelectionCount.classList.add("hidden");
  }
}

export function syncSelectAllCheckbox(selectedCount, total) {
  if (!dom.adminSelectAllUsers) return;
  dom.adminSelectAllUsers.checked = selectedCount > 0 && selectedCount === total;
  dom.adminSelectAllUsers.indeterminate = selectedCount > 0 && selectedCount < total;
}

export function setBulkButtonsEnabled(enabled) {
  if (!dom.bulkEnableBtn || !dom.bulkDisableBtn) return;
  dom.bulkEnableBtn.disabled = !enabled;
  dom.bulkDisableBtn.disabled = !enabled;
}

export function bindAdminUserActions(callbacks) {
  const table = dom.adminUsersTable;
  table?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
    if (!button) return;
    const row = button.closest(".admin-user-row");
    const userId = row?.getAttribute("data-user-id");
    if (!userId) return;
    const action = button.getAttribute("data-action");
    if (action === "toggle-status") {
      const nextStatus = button.getAttribute("data-next-status");
      if (nextStatus) {
        callbacks?.onToggleStatus?.(userId, nextStatus);
      }
    }
    if (action === "save-quotas") {
      const messagesInput = row.querySelector(".admin-quota-messages");
      const tokensInput = row.querySelector(".admin-quota-tokens");
      if (!validateQuotaInput(messagesInput) || !validateQuotaInput(tokensInput)) {
        callbacks?.onValidationError?.("Invalid quota value");
        return;
      }
      callbacks?.onSaveQuotas?.(userId, {
        messages_per_day:
          messagesInput?.value ? Number(messagesInput.value) : null,
        tokens_per_day: tokensInput?.value ? Number(tokensInput.value) : null,
      });
    }
  });

  table?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches(".admin-select-user")) {
      const row = target.closest(".admin-user-row");
      if (row && target instanceof HTMLInputElement) {
        row.classList.toggle("selected", target.checked);
      }
      callbacks?.onSelectionChange?.(collectSelectedUserIds());
    }
    if (target.matches(".admin-select-all")) {
      const checked = target instanceof HTMLInputElement ? target.checked : false;
      const rows = table.querySelectorAll(".admin-user-row");
      rows.forEach((r) => {
        r.classList.toggle("selected", checked);
        const checkbox = r.querySelector(".admin-select-user");
        if (checkbox instanceof HTMLInputElement) {
          checkbox.checked = checked;
        }
      });
      callbacks?.onSelectionChange?.(collectSelectedUserIds());
    }
  });

  table?.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches(".admin-quota-input")) {
      validateQuotaInput(target);
    }
  });

  table?.addEventListener("keydown", (event) => {
    const target = event.target;
    const row = target instanceof Element ? target.closest(".admin-user-row") : null;
    if (!row) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusSibling(row, "next");
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusSibling(row, "prev");
    }
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      const checkbox = row.querySelector(".admin-select-user");
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = !checkbox.checked;
        row.classList.toggle("selected", checkbox.checked);
        callbacks?.onSelectionChange?.(collectSelectedUserIds());
      }
    }
  });
}

function focusSibling(row, direction) {
  let sibling =
    direction === "next" ? row.nextElementSibling : row.previousElementSibling;
  while (sibling && !sibling.classList.contains("admin-user-row")) {
    sibling =
      direction === "next" ? sibling.nextElementSibling : sibling.previousElementSibling;
  }
  if (sibling instanceof HTMLElement) {
    sibling.focus();
  }
}

export function bindAdminBulkButtons(callbacks) {
  dom.bulkEnableBtn?.addEventListener("click", () => callbacks?.onBulkEnable?.());
  dom.bulkDisableBtn?.addEventListener("click", () => callbacks?.onBulkDisable?.());
}

export function bindAdminExportControls(callbacks) {
  dom.adminExportUsers?.addEventListener("click", () => callbacks?.onExport?.("users"));
  dom.adminExportUsage?.addEventListener("click", () => callbacks?.onExport?.("usage"));
  dom.adminExportAudit?.addEventListener("click", () => callbacks?.onExport?.("audit"));
}

export function bindAdminAuditFilters(callbacks) {
  dom.adminAuditApply?.addEventListener("click", () => {
    callbacks?.onApply?.({
      event: dom.adminAuditEventFilter?.value || "",
      from: dom.adminAuditFromFilter?.value || "",
      to: dom.adminAuditToFilter?.value || "",
    });
  });
}

export function setAuditFilterControls(filters) {
  if (!filters) return;
  if (dom.adminAuditEventFilter) {
    dom.adminAuditEventFilter.value = filters.event || "";
  }
  if (dom.adminAuditFromFilter) {
    dom.adminAuditFromFilter.value = filters.from || "";
  }
  if (dom.adminAuditToFilter) {
    dom.adminAuditToFilter.value = filters.to || "";
  }
}

export function renderAdminUsage(entries, users = []) {
  if (!dom.adminUsageList) return;
  dom.adminUsageList.innerHTML = "";
  if (!entries.length) {
    dom.adminUsageList.innerHTML = "<div class='admin-empty-state'>Usage metrics will appear after stream completions.</div>";
    return;
  }

  const userQuotaMap = new Map();
  users.forEach((user) => {
    if (user?.id) {
      userQuotaMap.set(user.id, user.quotas || null);
    }
  });

  const calculatePercent = (used, limit) => {
    if (typeof limit === "number" && Number.isFinite(limit)) {
      if (limit <= 0) {
        return used > 0 ? 100 : 0;
      }
      return Math.min((used / limit) * 100, 100);
    }
    return 0;
  };

  const createSegment = (label, used, limit, percent) => {
    const segment = document.createElement("div");
    segment.className = "admin-usage-segment";
    const title = document.createElement("div");
    title.className = "admin-usage-segment-label";
    const badge = document.createElement("span");
    badge.className = "metadata";
    badge.textContent =
      limit == null
        ? `${label}: ${used} (unlimited)`
        : `${label}: ${used}/${limit}`;
    if (typeof limit === "number" && limit > 0) {
      badge.textContent += ` · ${Math.round(percent)}%`;
    } else if (limit === 0) {
      badge.textContent += " · capped";
    }
    title.appendChild(badge);
    const progress = document.createElement("div");
    progress.className = "admin-usage-progress";
    const fill = document.createElement("span");
    fill.className = "admin-usage-fill";
    fill.style.width = `${percent}%`;
    progress.appendChild(fill);
    segment.append(title, progress);
    return segment;
  };

  entries.forEach((entry) => {
    const block = document.createElement("div");
    block.className = "admin-usage-entry";
    const label = document.createElement("div");
    label.className = "admin-usage-label";
    label.textContent = `${entry.username || entry.user_id} · ${entry.date}`;

    const quotas = userQuotaMap.get(entry.user_id) || {};
    const messagesLimit =
      typeof quotas?.messages_per_day === "number"
        ? quotas.messages_per_day
        : null;
    const tokensLimit =
      typeof quotas?.tokens_per_day === "number"
        ? quotas.tokens_per_day
        : null;

    const messagesPercent = calculatePercent(entry.messages_used, messagesLimit);
    const tokensPercent = calculatePercent(entry.tokens_used, tokensLimit);

    const bars = document.createElement("div");
    bars.className = "admin-usage-bars";
    bars.append(
      createSegment("Messages", entry.messages_used, messagesLimit, messagesPercent),
      createSegment("Tokens", entry.tokens_used, tokensLimit, tokensPercent)
    );

    block.append(label, bars);
    dom.adminUsageList.appendChild(block);
  });
}

export function renderAdminAudit(entries) {
  if (!dom.adminAuditList) return;
  dom.adminAuditList.innerHTML = "";
  if (!entries.length) {
    dom.adminAuditList.innerHTML = "<div class='admin-empty-state'>Audit log is empty. Actions will appear here shortly.</div>";
    return;
  }
  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "admin-audit-entry";
    row.innerHTML = `
      <strong>${entry.action}</strong>
      <span class="metadata">
        ${entry.actor_user_id || "system"} · ${entry.created_at}
      </span>
    `;
    if (entry.details) {
      const details = document.createElement("pre");
      details.className = "admin-audit-details";
      details.textContent = JSON.stringify(entry.details, null, 2);
      row.appendChild(details);
    }
    dom.adminAuditList.appendChild(row);
  });
}

export function renderAdminInvites(invites) {
  if (!dom.adminInvitesList) return;
  dom.adminInvitesList.innerHTML = "";
  if (!invites.length) {
    dom.adminInvitesList.textContent = "No invites created yet.";
    return;
  }
  invites.forEach((invite) => {
    const entry = document.createElement("div");
    entry.className = "admin-invite-entry";
    entry.innerHTML = `
      <strong>${invite.code}</strong>
      <span class="metadata">Expires: ${invite.expires_at}</span>
      <span class="metadata">Uses: ${invite.use_count}/${invite.max_uses}</span>
    `;
    dom.adminInvitesList.appendChild(entry);
  });
}
