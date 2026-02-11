import { el, clear } from "../dom.js";
import * as Auth from "../../api/auth.js";

export function mountLogin(root, store, router) {
  clear(root);

  const user = el("input", { placeholder: "Username", style: inputStyle() });
  const pass = el("input", { placeholder: "Password", type: "password", style: inputStyle() });
  const status = el("div", { class: "small" }, store.get().authFailureReason || "");
  let isSubmitting = false;

  function setSubmitting(active) {
    isSubmitting = active;
    user.disabled = active;
    pass.disabled = active;
    btn.disabled = active;
  }

  function formatAuthError(e) {
    const code = e?.code || "";
    const msg = e?.message || String(e);
    if (code === "E2002") {
      return "Login failed: [E2002] Session token mismatch after retry. Clear site cookies or use a private window, then try again.";
    }
    if (code === "E2003" || code === "E2004") {
      return `Login failed: [${code}] Origin/Referer policy rejected this request.`;
    }
    if (e?.status === 401 || e?.status === 403) {
      return `Login failed: [E_AUTH] ${msg}`;
    }
    if (e?.name === "AbortError") {
      return "Login failed: request timed out. Please try again.";
    }
    return `Login failed: ${msg}`;
  }

  const btn = el("button", { class: "btn primary", onClick: async () => {
    if (isSubmitting) return;
    store.set({ authFailureReason: null });
    setSubmitting(true);
    status.textContent = "Logging in…";

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);

    try {
      await Auth.login(
        user.value.trim(),
        pass.value,
        (msg) => {
          status.textContent = msg;
        },
        { signal: ac.signal }
      );

      // Optimistic auth transition to avoid login-page deadlock on cookie visibility race.
      store.set({ authenticated: true, startupError: null, authFailureReason: null });
      router.go("chat");
      status.textContent = "Validating session…";

      // Verify session in background with short retry window.
      void (async () => {
        const check = await Auth.verifySession({ attempts: 3, delayMs: 250 });
        if (check.authenticated) {
          store.set({ meta: check.meta || store.get().meta, authenticated: true, authFailureReason: null });
          return;
        }
        store.set({
          authenticated: false,
          authFailureReason:
            "Login did not persist. Browser may be blocking cross-site cookies. Allow third-party cookies for omniplexity.duckdns.org or use a compatible browser profile."
        });
        router.go("login");
      })();
    } catch (e) {
      const msg = formatAuthError(e);
      status.textContent = msg;
      store.set({ authFailureReason: msg, authenticated: false });
    } finally {
      clearTimeout(t);
      setSubmitting(false);
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
