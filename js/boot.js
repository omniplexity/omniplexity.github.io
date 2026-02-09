/**
 * Auth Gate - Omniplexity
 * Checks authentication and redirects to appropriate page
 */

const BACKEND = window.RUNTIME_CONFIG?.BACKEND_BASE_URL
  ?? "https://silent-eventually-movie-geometry.trycloudflare.com";

async function isAuthed() {
  try {
    const r = await fetch(`${BACKEND}/api/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

(async () => {
  const ok = await isAuthed();
  window.location.replace(ok ? "/chat.html" : "/login.html");
})();
