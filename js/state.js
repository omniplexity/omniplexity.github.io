const RESUME_HINTS_KEY = "omni_stream_resume";
const SETTINGS_KEY = "omni_ui_settings";
const UI_STATE_KEY = "omni_ui_state";

const defaultSettings = {
  defaultProviderId: null,
  defaultModel: null,
  temperature: 0.7,
  top_p: 1,
  max_tokens: null,
  streaming: true,
  theme: "dark",
  fontSize: "md",
  codeStyle: "contrast",
  density: "comfortable",
  sidebarAutoCollapse: false,
  autoScroll: true,
  showTokenUsage: true,
  showProviderMetadata: false,
  retryBehavior: "manual",
  transportPreference: "sse",
  debugMode: false,
};

const defaultUiState = {
  sidebarCollapsed: false,
};

function loadResumeHints() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RESUME_HINTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Unable to load resume hints", e);
    return {};
  }
}

function persistResumeHints() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RESUME_HINTS_KEY, JSON.stringify(state.resumeHints));
  } catch (e) {
    console.warn("Unable to persist resume hints", e);
  }
}

function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...defaultSettings };
  }
  const next = { ...defaultSettings };
  if (typeof raw.defaultProviderId === "string") next.defaultProviderId = raw.defaultProviderId;
  if (typeof raw.defaultModel === "string") next.defaultModel = raw.defaultModel;
  if (typeof raw.temperature === "number" && Number.isFinite(raw.temperature)) next.temperature = raw.temperature;
  if (typeof raw.top_p === "number" && Number.isFinite(raw.top_p)) next.top_p = raw.top_p;
  if (raw.max_tokens === null) {
    next.max_tokens = null;
  } else if (typeof raw.max_tokens === "number" && Number.isFinite(raw.max_tokens)) {
    next.max_tokens = raw.max_tokens;
  }
  if (typeof raw.streaming === "boolean") next.streaming = raw.streaming;
  if (typeof raw.theme === "string") next.theme = raw.theme;
  if (typeof raw.fontSize === "string") next.fontSize = raw.fontSize;
  if (typeof raw.codeStyle === "string") next.codeStyle = raw.codeStyle;
  if (typeof raw.density === "string") next.density = raw.density;
  if (typeof raw.sidebarAutoCollapse === "boolean") next.sidebarAutoCollapse = raw.sidebarAutoCollapse;
  if (typeof raw.autoScroll === "boolean") next.autoScroll = raw.autoScroll;
  if (typeof raw.showTokenUsage === "boolean") next.showTokenUsage = raw.showTokenUsage;
  if (typeof raw.showProviderMetadata === "boolean") next.showProviderMetadata = raw.showProviderMetadata;
  if (typeof raw.retryBehavior === "string") next.retryBehavior = raw.retryBehavior;
  if (typeof raw.transportPreference === "string") next.transportPreference = raw.transportPreference;
  if (typeof raw.debugMode === "boolean") next.debugMode = raw.debugMode;
  return next;
}

function loadSettings() {
  if (typeof window === "undefined") return { ...defaultSettings };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : {});
  } catch (e) {
    console.warn("Unable to load settings", e);
    return { ...defaultSettings };
  }
}

function persistSettings() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.warn("Unable to persist settings", e);
  }
}

function loadUiState() {
  if (typeof window === "undefined") return { ...defaultUiState };
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) return { ...defaultUiState };
    const parsed = JSON.parse(raw);
    return {
      ...defaultUiState,
      sidebarCollapsed: Boolean(parsed?.sidebarCollapsed),
    };
  } catch (e) {
    console.warn("Unable to load UI state", e);
    return { ...defaultUiState };
  }
}

function persistUiState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state.ui));
  } catch (e) {
    console.warn("Unable to persist UI state", e);
  }
}

const initialSettings = loadSettings();
const initialUiState = loadUiState();

const state = {
  conversations: [],
  messages: [],
  selectedConversation: null,
  providers: [],
  stream: null,
  activeStreamId: null,
  currentAssistantMessageId: null,
  streamActive: false,
  streamStartTime: null,
  autoScroll: initialSettings.autoScroll ?? true,
  lastErrorByConversation: {},
  editingConversationId: null,
  providerSelection: { providerId: null, model: null },
  streamStatusByConversation: {},
  resumeHints: loadResumeHints(),
  activeStreamMeta: null,
  currentUser: null,
  settings: initialSettings,
  ui: initialUiState,
  admin: {
    users: [],
    usage: [],
    audit: [],
    invites: [],
    selectedUserIds: [],
  },
};

const virtualization = {
  heights: {},
  averageHeight: 120,
  buffer: 6,
};

function recalcAverageHeight(newHeight) {
  if (!newHeight || newHeight <= 0) {
    return virtualization.averageHeight;
  }
  virtualization.averageHeight =
    virtualization.averageHeight * 0.85 + newHeight * 0.15;
  return virtualization.averageHeight;
}

export function updateConversations(list) {
  state.conversations = list;
}

export function setSelectedConversation(conversation) {
  state.selectedConversation = conversation;
}

export function updateMessages(list) {
  state.messages = list;
}

function ensureMessageId(message) {
  if (message.id) return message.id;
  return `${message.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pushMessage(message) {
  const msgWithId = { ...message, id: ensureMessageId(message) };
  state.messages = [...state.messages, msgWithId];
  return msgWithId;
}

export function updateMessageById(id, updates) {
  state.messages = state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg));
  const updated = state.messages.find((msg) => msg.id === id);
  return updated;
}

export function getLastMessage() {
  return state.messages[state.messages.length - 1];
}

export function setProviders(list) {
  state.providers = Array.isArray(list) ? list : [];
}

export function getState() {
  return state;
}

export function getSettings() {
  return state.settings;
}

export function updateSettings(partial) {
  state.settings = normalizeSettings({ ...state.settings, ...partial });
  persistSettings();
  return state.settings;
}

export function resetSettings() {
  state.settings = { ...defaultSettings };
  persistSettings();
  return state.settings;
}

export function getUiState() {
  return state.ui;
}

export function setSidebarCollapsed(collapsed) {
  state.ui.sidebarCollapsed = Boolean(collapsed);
  persistUiState();
}

export function isSidebarCollapsed() {
  return Boolean(state.ui.sidebarCollapsed);
}

export function resetUiState() {
  state.ui = { ...defaultUiState };
  persistUiState();
}

export function attachStream(stream) {
  state.stream = stream;
}

export function detachStream() {
  state.stream = null;

  state.activeStreamId = null;
}

export function setActiveStreamId(id) {
  state.activeStreamId = id;
}

export function getActiveStreamId() {
  return state.activeStreamId;
}

export function setCurrentAssistantMessageId(id) {
  state.currentAssistantMessageId = id;
}

export function getCurrentAssistantMessageId() {
  return state.currentAssistantMessageId;
}

export function clearCurrentAssistantMessageId() {
  state.currentAssistantMessageId = null;
}

export function setStreamStatus(conversationId, status) {
  if (!conversationId) return;
  state.streamStatusByConversation[conversationId] = status;
}

export function getStreamStatus(conversationId) {
  return state.streamStatusByConversation[conversationId];
}

export function setActiveStreamMeta(meta) {
  if (!meta?.conversationId) return;
  state.activeStreamMeta = { ...meta };
  state.resumeHints[meta.conversationId] = {
    conversationId: meta.conversationId,
    assistantMessageId: meta.assistantMessageId,
    providerId: meta.providerId,
    model: meta.model,
    partialLength: meta.partialLength ?? 0,
    startedAt: meta.startedAt || Date.now(),
    interrupted: false,
  };
  persistResumeHints();
}

export function getActiveStreamMeta() {
  return state.activeStreamMeta;
}

export function updateActiveStreamMeta(updates) {
  if (!state.activeStreamMeta?.conversationId) return;
  state.activeStreamMeta = { ...state.activeStreamMeta, ...updates };
  const convoId = state.activeStreamMeta.conversationId;
  state.resumeHints[convoId] = { ...state.activeStreamMeta, interrupted: state.resumeHints[convoId]?.interrupted || false };
  persistResumeHints();
}

export function markStreamInterrupted(conversationId) {
  const hint = state.resumeHints[conversationId];
  if (!hint) return;
  hint.interrupted = true;
  persistResumeHints();
}

export function clearActiveStreamMeta() {
  if (state.activeStreamMeta?.conversationId) {
    delete state.resumeHints[state.activeStreamMeta.conversationId];
    persistResumeHints();
  }
  state.activeStreamMeta = null;
}

export function getResumeHint(conversationId) {
  return state.resumeHints[conversationId];
}

export function setStreaming(active) {
  state.streamActive = active;
  state.streamStartTime = active ? Date.now() : null;
}

export function isStreaming() {
  return state.streamActive;
}

export function setAutoScroll(value) {
  state.autoScroll = value;
}

export function shouldAutoScroll() {
  return state.autoScroll;
}

export function setConversationError(conversationId, error) {
  if (!conversationId) return;
  state.lastErrorByConversation[conversationId] = error;
}

export function getConversationError(conversationId) {
  return state.lastErrorByConversation[conversationId];
}

export function clearConversationError(conversationId) {
  if (!conversationId) return;
  delete state.lastErrorByConversation[conversationId];
}

export function setEditingConversation(id) {
  state.editingConversationId = id;
}

export function getEditingConversation() {
  return state.editingConversationId;
}

export function setProviderSelection(selection) {
  state.providerSelection = {
    ...state.providerSelection,
    ...selection,
  };
}

export function getProviderSelection() {
  return state.providerSelection;
}

export function resetProviderSelection() {
  state.providerSelection = { providerId: null, model: null };
}

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function getCurrentUser() {
  return state.currentUser;
}

export function setAdminUsers(list) {
  state.admin.users = list;
}

export function getAdminUsers() {
  return state.admin.users;
}

export function setAdminUsage(list) {
  state.admin.usage = list;
}

export function getAdminUsage() {
  return state.admin.usage;
}

export function setAdminAudit(list) {
  state.admin.audit = list;
}

export function getAdminAudit() {
  return state.admin.audit;
}

export function setAdminInvites(list) {
  state.admin.invites = list;
}

export function getSelectedAdminUsers() {
  return state.admin.selectedUserIds || [];
}

export function setSelectedAdminUsers(ids) {
  state.admin.selectedUserIds = Array.from(new Set(ids.filter(Boolean)));
}

export function toggleAdminUserSelection(id, selected) {
  const current = new Set(state.admin.selectedUserIds || []);
  if (selected) {
    current.add(id);
  } else {
    current.delete(id);
  }
  state.admin.selectedUserIds = Array.from(current);
}

export function clearSelectedAdminUsers() {
  state.admin.selectedUserIds = [];
}

export function recordMessageHeight(id, height) {
  if (!id || height <= 0) return;
  virtualization.heights[id] = height;
  recalcAverageHeight(height);
}

export function getAverageMessageHeight() {
  return virtualization.averageHeight;
}

export function getVirtualBuffer() {
  return virtualization.buffer;
}

export function resetVirtualMeasurements() {
  virtualization.heights = {};
  virtualization.averageHeight = 120;
}

export function getAdminInvites() {
  return state.admin.invites;
}

export function resetAppState() {
  state.conversations = [];
  state.messages = [];
  state.selectedConversation = null;
  state.providers = [];
  state.stream = null;
  state.activeStreamId = null;
  state.currentAssistantMessageId = null;
  state.streamActive = false;
  state.streamStartTime = null;
  state.autoScroll = state.settings?.autoScroll ?? true;
  state.lastErrorByConversation = {};
  state.editingConversationId = null;
  state.providerSelection = { providerId: null, model: null };
  state.streamStatusByConversation = {};
  state.activeStreamMeta = null;
  state.currentUser = null;
  state.admin = {
    users: [],
    usage: [],
    audit: [],
    invites: [],
    selectedUserIds: [],
  };
  state.resumeHints = {};
  persistResumeHints();
  virtualization.heights = {};
  virtualization.averageHeight = 120;
  virtualization.buffer = 6;
}
