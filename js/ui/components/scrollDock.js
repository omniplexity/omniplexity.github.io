import { el } from "../dom.js";

export function createScrollDock({ onClick }) {
  const badge = el("div", { class: "scrollDockBadge", style: { display: "none" } }, "0");
  const btn = el("button", { class: "scrollDockBtn", onClick }, "\u2193");
  const node = el("div", { class: "scrollDock" }, badge, btn);

  let unread = 0;

  function setUnread(n) {
    unread = Math.max(0, n | 0);
    if (unread > 0) {
      badge.style.display = "";
      badge.textContent = String(unread);
      node.classList.add("visible");
    } else {
      badge.style.display = "none";
      node.classList.toggle("visible", false);
    }
  }

  function show() { node.classList.add("visible"); }
  function hide() { node.classList.remove("visible"); }

  return { node, setUnread, show, hide };
}
