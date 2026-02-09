const RESUME_HINTS_KEY = "omni_stream_resume";

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
  streamSentAt: null,
  streamFirstTokenAt: null,
  streamTokenCount: 0,
  cancelRequested: false,
  autoScroll: true,
  lastErrorByConversation: {},
  editingConversationId: null,
  providerSelection: { providerId: null, model: null },
  streamStatusByConversation: {},
  resumeHints: loadResumeHints(),
  activeStreamMeta: null,
  currentUser: null,
  messageReceipts: {},
  messageInspectors: {},
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

export function setStreamSentAt(timestamp) {
  state.streamSentAt = timestamp;
}

export function getStreamSentAt() {
  return state.streamSentAt;
}

export function setStreamFirstTokenAt(timestamp) {
  state.streamFirstTokenAt = timestamp;
}

export function getStreamFirstTokenAt() {
  return state.streamFirstTokenAt;
}

export function incrementStreamTokenCount(count = 1) {
  state.streamTokenCount += count;
}

export function getStreamTokenCount() {
  return state.streamTokenCount;
}

export function resetStreamMetrics() {
  state.streamTokenCount = 0;
  state.streamFirstTokenAt = null;
  state.streamSentAt = null;
  state.cancelRequested = false;
}

export function setCancelRequested(requested) {
  state.cancelRequested = requested;
}

export function isCancelRequested() {
  return state.cancelRequested;
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

/* Inspector tracking for SSE events */
export function createInspector(messageId, data = {}) {
  state.messageInspectors[messageId] = {
    messageId,
    events: [],
    providerId: data.providerId || null,
    model: data.model || null,
    retryCount: 0,
    reconnectAttempts: 0,
    lastError: null,
    startedAt: data.startedAt || Date.now(),
    expanded: false,
  };
}

export function addInspectorEvent(messageId, eventType, eventData) {
  const inspector = state.messageInspectors[messageId];
  if (!inspector) return;
  inspector.events.push({
    type: eventType,
    data: eventData,
    timestamp: Date.now(),
  });
}

export function incrementInspectorRetry(messageId) {
  const inspector = state.messageInspectors[messageId];
  if (inspector) inspector.retryCount++;
}

export function incrementInspectorReconnect(messageId) {
  const inspector = state.messageInspectors[messageId];
  if (inspector) inspector.reconnectAttempts++;
}

export function setInspectorError(messageId, error) {
  const inspector = state.messageInspectors[messageId];
  if (inspector) inspector.lastError = error;
}

export function getInspector(messageId) {
  return state.messageInspectors[messageId];
}

export function setInspectorExpanded(messageId, expanded) {
  const inspector = state.messageInspectors[messageId];
  if (inspector) inspector.expanded = expanded;
}

/* Receipt management for streaming metrics */
export function createReceipt(messageId, data = {}) {
  state.messageReceipts[messageId] = {
    messageId,
    provider: data.provider || null,
    model: data.model || null,
    startedAt: data.startedAt || Date.now(),
    ttft: null,
    duration: null,
    tokens: 0,
    outcome: "streaming",
    partialLength: null,
    collapsed: true,
  };
}

export function updateReceipt(messageId, updates) {
  const receipt = state.messageReceipts[messageId];
  if (!receipt) return;
  Object.assign(receipt, updates);
}

export function getReceipt(messageId) {
  return state.messageReceipts[messageId];
}

export function setReceiptCollapsed(messageId, collapsed) {
  const receipt = state.messageReceipts[messageId];
  if (receipt) receipt.collapsed = collapsed;
}

export function getPendingAssistantContent(messageId) {
  const message = state.messages.find((m) => m.id === messageId);
  return message?.content || "";
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
  state.streamSentAt = null;
  state.streamFirstTokenAt = null;
  state.streamTokenCount = 0;
  state.cancelRequested = false;
  state.autoScroll = true;
  state.lastErrorByConversation = {};
  state.editingConversationId = null;
  state.providerSelection = { providerId: null, model: null };
  state.streamStatusByConversation = {};
  state.activeStreamMeta = null;
  state.currentUser = null;
  state.messageReceipts = {};
  state.messageInspectors = {};
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
