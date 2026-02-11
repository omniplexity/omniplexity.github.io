import { el, clear } from "../dom.js";

function escapeText(s) {
  return (s ?? "").toString();
}

export function renderMarkdown(container, text) {
  clear(container);

  const lines = escapeText(text).split("\n");
  let inCode = false;
  let lang = "";
  let buf = [];
  let textBuf = [];

  function flushText() {
    if (!textBuf.length) return;
    const block = el("div", { class: "md-text" }, textBuf.join("\n"));
    container.appendChild(block);
    textBuf = [];
  }

  function flushCode() {
    const code = buf.join("\n");
    const header = el("div", { class: "codeHeader" },
      el("div", { class: "small mono" }, lang ? lang : "code"),
      el("button", {
        class: "btn codeCopy",
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(code);
            const old = header.lastChild.textContent;
            header.lastChild.textContent = "Copied";
            setTimeout(() => { header.lastChild.textContent = old; }, 1200);
          } catch {
            window.prompt("Copy code:", code);
          }
        }
      }, "Copy")
    );

    const pre = el("pre", { class: "codePre" },
      el("code", { class: "mono" }, code)
    );

    const wrap = el("div", { class: "codeWrap" }, header, pre);
    container.appendChild(wrap);

    buf = [];
    lang = "";
  }

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      if (!inCode) {
        flushText();
        inCode = true;
        lang = (fence[1] || "").trim();
      } else {
        inCode = false;
        flushCode();
      }
      continue;
    }

    if (inCode) buf.push(line);
    else textBuf.push(line);
  }

  if (inCode) flushCode();
  flushText();
}
