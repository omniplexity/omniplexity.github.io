/**
 * Login Page Entry Point - OmniAI
 * Lightweight script for login.html — only loads auth dependencies.
 * chat.html uses app.js separately.
 */

import { loadConfig, apiBaseUrl } from "./config.js";
import { login, register } from "./auth.js";
import { getMe } from "./api.js";

function mapAuthNotice(reason) {
  if (reason === "expired") {
    return "Your session expired. Please sign in again.";
  }
  if (reason === "logout") {
    return "You have been signed out.";
  }
  if (reason === "unauthorized") {
    return "Please sign in to continue.";
  }
  return "";
}

function setBackendBadge(baseUrl) {
  const el = document.getElementById("backendBadge");
  if (!el || !baseUrl) return;
  try {
    el.textContent = `Backend: ${new URL(baseUrl).host}`;
    el.title = baseUrl;
  } catch {
    el.textContent = `Backend: ${baseUrl}`;
    el.title = baseUrl;
  }
}

async function handleLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginButton = document.getElementById("loginButton");
  const registerButton = document.getElementById("registerButton");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");
  const authNotice = document.getElementById("authNotice");
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-form]");

  try {
    const payload = await getMe();
    if (payload?.user) {
      window.location.replace("./chat.html");
      return;
    }
  } catch (err) {
    if (err?.code === "E_NETWORK") {
      if (authNotice) {
        authNotice.textContent = "Backend unavailable. Check your tunnel connection and try again.";
        authNotice.classList.remove("hidden");
      }
    }
  }

  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason");
  const notice = mapAuthNotice(reason);
  if (authNotice && notice) {
    authNotice.textContent = notice;
    authNotice.classList.remove("hidden");
  }

  const setAuthMode = (mode) => {
    tabs.forEach((tab) => {
      const active = tab.getAttribute("data-auth-tab") === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.getAttribute("data-auth-form") !== mode);
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthMode(tab.getAttribute("data-auth-tab"));
    });
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loginButton) {
      loginButton.disabled = true;
    }
    loginError?.classList.add("hidden");
    try {
      await login({
        username: loginForm.username?.value,
        password: loginForm.password?.value,
      });
      window.location.replace("./chat.html");
    } catch (err) {
      const message = err?.message || "Invalid credentials";
      if (loginError) {
        loginError.textContent = message;
        loginError.classList.remove("hidden");
      }
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
      }
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (registerButton) {
      registerButton.disabled = true;
    }
    registerError?.classList.add("hidden");
    try {
      await register({
        username: registerForm.username?.value,
        password: registerForm.password?.value,
        email: registerForm.email?.value || null,
        invite_code: registerForm.invite_code?.value || null,
      });
      try {
        const payload = await getMe();
        if (payload?.user) {
          window.location.replace("./chat.html");
          return;
        }
      } catch (_err) {
        // Fall through to show feedback if session not established.
      }
      if (registerError) {
        registerError.textContent =
          "Account created, but we could not start a session. Please log in and check your cookie settings.";
        registerError.classList.remove("hidden");
      }
    } catch (err) {
      const message = err?.message || "Registration failed";
      if (registerError) {
        registerError.textContent = message;
        registerError.classList.remove("hidden");
      }
    } finally {
      if (registerButton) {
        registerButton.disabled = false;
      }
    }
  });
}

(async () => {
  await loadConfig();
  setBackendBadge(apiBaseUrl());
  await handleLoginPage();
})();
