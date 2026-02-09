/**
 * Auth Gate - OmniAI
 * Checks authentication and redirects to appropriate page.
 */

import { loadConfig, apiBaseUrl } from "./config.js";

async function isAuthed() {
  try {
    const r = await fetch(`${apiBaseUrl()}/api/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

(async () => {
  await loadConfig();
  const ok = await isAuthed();
  window.location.replace(ok ? "./chat.html" : "./login.html");
})();
