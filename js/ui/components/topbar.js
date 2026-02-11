import { el } from "../dom.js";

export function Topbar() {
  const title = el("div", {}, "Chat");
  const status = el("div", { class: "small" }, "");
  return {
    node: el("div", { class: "topbar" }, title, status),
    setStatus(text) { status.textContent = text || ""; },
    setTitle(text) { title.textContent = text || "Chat"; }
  };
}
