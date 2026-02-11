import { el } from "../dom.js";

export function MessageBubble({ role, content }) {
  const cls = role === "user" ? "bubble user" : role === "assistant" ? "bubble assistant" : "bubble error";
  return el("div", { class: cls }, content || "");
}
