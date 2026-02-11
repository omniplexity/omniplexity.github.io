import { el } from "../dom.js";

export function Composer({ onSend, onStop, onRetry }) {
  const ta = el("textarea", { placeholder: "Message… (Enter to send, Shift+Enter newline)" });

  function getText() { return ta.value.trim(); }
  function clearText() { ta.value = ""; }

  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = getText();
      if (!text) return;
      clearText();
      onSend(text);
    }
  });

  const stopBtn = el("button", { class: "btn danger", onClick: onStop, disabled: true }, "Stop");
  const retryBtn = el("button", { class: "btn", onClick: onRetry, disabled: true }, "Retry");
  const sendBtn = el("button", { class: "btn primary", onClick: () => {
    const text = getText();
    if (!text) return;
    clearText();
    onSend(text);
  }}, "Send");

  const node = el("div", { class: "composer" }, ta, stopBtn, retryBtn, sendBtn);

  return {
    node,
    setStreaming(active) {
      ta.disabled = !!active;
      stopBtn.disabled = !active;
    },
    setRetryEnabled(enabled) {
      retryBtn.disabled = !enabled;
    },
    focus() { ta.focus(); }
  };
}
