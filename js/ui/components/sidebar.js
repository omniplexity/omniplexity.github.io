import { el, clear } from "../dom.js";

export function Sidebar({ onNew, onSelect, onLogout }) {
  const list = el("div", { class: "threadList" });
  const footer = el("div", { class: "small" }, "");

  const node = el("div", { class: "sidebar" },
    el("div", {},
      el("div", { style: { fontWeight: "700", fontSize: "16px" } }, "Omniplexity"),
      el("div", { class: "small" }, "GPT-style chat")
    ),
    el("div", { class: "row" },
      el("button", { class: "btn primary", onClick: onNew }, "New chat"),
      el("button", { class: "btn", onClick: onLogout }, "Logout")
    ),
    list,
    footer
  );

  function setThreads(threads, activeId) {
    clear(list);
    for (const c of threads || []) {
      const id = c.id || c.conversation_id || c.uuid;
      const title = c.title || c.name || "Untitled";
      const item = el("div", {
        class: `threadItem ${id === activeId ? "active" : ""}`,
        onClick: () => onSelect(id)
      }, title);
      list.appendChild(item);
    }
    footer.textContent = activeId ? `Active: ${activeId}` : "No conversation selected";
  }

  return { node, setThreads };
}
