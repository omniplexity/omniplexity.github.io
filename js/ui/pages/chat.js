import { el, clear } from "../dom.js";
import { Sidebar } from "../components/sidebar.js";
import { Topbar } from "../components/topbar.js";
import { Composer } from "../components/composer.js";
import { MessageBubble } from "../components/messageBubble.js";

import * as Auth from "../../api/auth.js";
import * as Conv from "../../api/conversations.js";
import * as Chat from "../../api/chat.js";

function uuid() {
  return (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

export function mountChat(root, store, router) {
  clear(root);

  const layout = el("div", { class: "layout" });

  const sidebar = Sidebar({
    onNew: async () => {
      try {
        const created = await Conv.createConversation();
        const id = created.id || created.conversation_id || created.uuid;
        await refreshConversations();
        store.set({ activeConversationId: id, messages: [] });
        router.go(`chat/${id}`);
      } catch (e) {
        pushError(`Create conversation failed: ${e?.message || String(e)}`);
      }
    },
    onSelect: async (id) => {
      store.set({ activeConversationId: id, messages: [] });
      router.go(`chat/${id}`);
      await tryLoadHistory(id);
    },
    onLogout: async () => {
      try { await Auth.logout(); } catch {}
      store.set({ authenticated: false, conversations: [], activeConversationId: null, messages: [] });
      router.go("login");
    }
  });

  const main = el("div", { class: "main" });
  const top = Topbar();
  const messagesEl = el("div", { class: "messages" });
  const composer = Composer({
    onSend: (text) => send(text),
    onStop: () => stop(),
    onRetry: () => retry()
  });

  main.appendChild(top.node);
  main.appendChild(messagesEl);
  main.appendChild(composer.node);

  layout.appendChild(sidebar.node);
  layout.appendChild(main);
  root.appendChild(layout);

  let unsubscribe = store.subscribe(render);
  render(store.get());
  ensureInit().catch((e) => pushError(`Init failed: ${e?.message || String(e)}`));

  async function ensureInit() {
    await refreshConversations();

    const { routeId } = store.get();
    if (routeId) {
      store.set({ activeConversationId: routeId });
      await tryLoadHistory(routeId);
      return;
    }

    const first = store.get().conversations?.[0];
    const fid = first?.id || first?.conversation_id || first?.uuid;
    if (fid) {
      store.set({ activeConversationId: fid });
      router.go(`chat/${fid}`);
      await tryLoadHistory(fid);
    }
  }

  async function refreshConversations() {
    try {
      const list = await Conv.listConversations();
      store.set({ conversations: list });
    } catch (e) {
      if (e?.status === 401) {
        store.set({ authenticated: false });
        router.go("login");
        return;
      }
      throw e;
    }
  }

  async function tryLoadHistory(conversationId) {
    const data = await Conv.getConversation(conversationId);
    if (!data) return;

    const msgs = data.messages || data.items || data.history;
    if (Array.isArray(msgs)) {
      store.set({
        messages: msgs.map((m) => ({
          id: m.id || uuid(),
          role: m.role || m.author || "assistant",
          content: m.content || m.text || ""
        }))
      });
    }
  }

  function pushError(text) {
    store.update((st) => { st.messages.push({ id: uuid(), role: "error", content: text }); });
  }

  function render(s) {
    sidebar.setThreads(s.conversations, s.activeConversationId);
    top.setStatus(s.streaming.active ? "Streaming…" : "Ready");
    composer.setRetryEnabled(!s.streaming.active && !!s.streaming.last?.userText);
    composer.setStreaming(s.streaming.active);
    renderMessages(s.messages);
    if (s.streaming.active) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMessages(msgs) {
    clear(messagesEl);
    for (const m of msgs) messagesEl.appendChild(MessageBubble(m));
    queueMicrotask(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
  }

  async function ensureConversationId() {
    let id = store.get().activeConversationId;

    if (!id) {
      const created = await Conv.createConversation();
      id = created.id || created.conversation_id || created.uuid;
      await refreshConversations();
      store.set({ activeConversationId: id, messages: [] });
      router.go(`chat/${id}`);
    }
    return id;
  }

  async function send(userText, { isRetry = false } = {}) {
    if (store.get().streaming.active) return;

    const conversationId = await ensureConversationId();
    const clientMessageId = uuid();

    let assistantMsgId = uuid();

    store.update((st) => {
      if (!isRetry) {
        st.messages.push({ id: uuid(), role: "user", content: userText });
        st.messages.push({ id: assistantMsgId, role: "assistant", content: "" });
      } else {
        const last = st.streaming.last;
        if (last?.assistantMsgId) {
          const m = st.messages.find((x) => x.id === last.assistantMsgId);
          if (m) m.content = "";
          assistantMsgId = last.assistantMsgId;
        } else {
          st.messages.push({ id: assistantMsgId, role: "assistant", content: "" });
        }
      }

      st.streaming.active = true;
      st.streaming.runId = null;
      st.streaming.abort = new AbortController();
      st.streaming.last = { conversationId, userText, clientMessageId, assistantMsgId };
    });

    const getLastAssistantBubbleEl = () => {
      const bubbles = messagesEl.querySelectorAll(".bubble.assistant");
      return bubbles[bubbles.length - 1] || null;
    };
    let assistantEl = getLastAssistantBubbleEl();

    try {
      const run = await Chat.createChatRun({ conversationId, message: userText, clientMessageId, settings: {} });
      const runId = run.run_id || run.id || run.runId;
      if (!runId) throw new Error("Missing run_id from /v1/chat");

      store.update((st) => { st.streaming.runId = runId; });

      const signal = store.get().streaming.abort.signal;

      await Chat.streamChatRun({
        runId,
        signal,
        onData: (payload) => {
          const delta = Chat.extractDelta(payload);
          if (!delta) return;

          store.update((st) => {
            const m = st.messages.find((x) => x.id === assistantMsgId);
            if (m) m.content += delta;
          });

          if (!assistantEl) assistantEl = getLastAssistantBubbleEl();
          if (assistantEl) {
            const cur = store.get().messages.find((x) => x.id === assistantMsgId)?.content || "";
            assistantEl.textContent = cur;
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
        }
      });

    } catch (e) {
      if (e?.name !== "AbortError") pushError(`Chat failed: ${e?.message || String(e)}`);
    } finally {
      store.update((st) => {
        st.streaming.active = false;
        st.streaming.abort = null;
      });
    }
  }

  function stop() {
    const ac = store.get().streaming.abort;
    if (ac) ac.abort();
  }

  function retry() {
    const last = store.get().streaming.last;
    if (!last?.userText) return;
    send(last.userText, { isRetry: true }).catch((e) => pushError(`Retry failed: ${e?.message || String(e)}`));
  }

  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}
