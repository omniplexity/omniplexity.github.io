export function createStore() {
  const state = {
    route: "chat",
    routeId: null,
    authenticated: false,
    meta: null,
    startupError: null,

    conversations: [],
    activeConversationId: null,

    messages: [], // {id, role:'user'|'assistant'|'error', content}

    streaming: {
      active: false,
      runId: null,
      abort: null,
      last: null // { conversationId, userText, clientMessageId, assistantMsgId }
    }
  };

  const listeners = new Set();

  return {
    get() { return state; },
    set(patch) { Object.assign(state, patch); listeners.forEach((fn) => fn(state)); },
    update(fn) { fn(state); listeners.forEach((fn2) => fn2(state)); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}
