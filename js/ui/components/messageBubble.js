import { el } from "../dom.js";
import { renderMarkdown } from "./markdown.js";

function copyText(text) {
  const t = text || "";
  return navigator.clipboard.writeText(t).catch(() => {
    window.prompt("Copy:", t);
  });
}

export function MessageBubble({ role, content, markdown = false }) {
  const cls =
    role === "user" ? "bubble user" :
    role === "assistant" ? "bubble assistant" :
    "bubble error";

  const actions =
    (role === "user" || role === "assistant")
      ? el("div", { class: "msgActions" },
        el("button", { class: "btn msgBtn", onClick: () => copyText(content) }, "Copy")
      )
      : null;

  const body = el("div", { class: "msgBody" });

  if (markdown && role === "assistant" && (content || "").includes("```")) {
    renderMarkdown(body, content || "");
  } else {
    body.textContent = content || "";
  }

  return el("div", { class: cls }, actions, body);
}
