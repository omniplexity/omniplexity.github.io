import { el } from "../dom.js";
import { renderMarkdown } from "./markdown.js";

export function MessageBubble({ role, content, markdown = false }) {
  const cls =
    role === "user" ? "bubble user" :
    role === "assistant" ? "bubble assistant" :
    "bubble error";

  const node = el("div", { class: cls });

  if (markdown && role === "assistant" && (content || "").includes("```")) {
    renderMarkdown(node, content || "");
  } else {
    node.textContent = content || "";
  }

  return node;
}
