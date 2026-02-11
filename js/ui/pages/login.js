import { el, clear } from "../dom.js";
import * as Auth from "../../api/auth.js";

export function mountLogin(root, store, router) {
  clear(root);

  const user = el("input", { placeholder: "Username", style: inputStyle() });
  const pass = el("input", { placeholder: "Password", type: "password", style: inputStyle() });
  const status = el("div", { class: "small" }, "");

  const btn = el("button", { class: "btn primary", onClick: async () => {
    status.textContent = "Logging in…";
    try {
      await Auth.login(
        user.value.trim(),
        pass.value,
        (msg) => {
          status.textContent = msg;
        }
      );
      const meta = await Auth.meta();
      store.set({ authenticated: !!meta?.authenticated, meta, startupError: null });
      router.go("chat");
    } catch (e) {
      if (e?.code === "E2002") {
        status.textContent = "Login failed: [E2002] Session token mismatch after retry. Clear site cookies or use a private window, then try again.";
      } else {
        status.textContent = `Login failed: ${e?.message || String(e)}`;
      }
    }
  }}, "Login");

  root.appendChild(
    el("div", { style: { height: "100%", display: "grid", placeItems: "center", padding: "18px" } },
      el("div", {
        style: {
          width: "min(520px, 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "16px",
          background: "rgba(255,255,255,0.03)"
        }
      },
        el("div", { style: { fontWeight: "700", fontSize: "18px", marginBottom: "10px" } }, "Sign in"),
        el("div", { class: "small", style: { marginBottom: "10px" } }, "Secure cookie session + CSRF."),
        user,
        el("div", { style: { height: "10px" } }),
        pass,
        el("div", { style: { height: "12px" } }),
        el("div", { style: { display: "flex", justifyContent: "flex-end" } }, btn),
        el("div", { style: { height: "10px" } }),
        status
      )
    )
  );

  function inputStyle() {
    return {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
      color: "rgba(255,255,255,0.92)",
      outline: "none"
    };
  }

  return () => {};
}
