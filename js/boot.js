/**
 * Omniplexity Boot Loader
 * Uses versioned dynamic imports to prevent stale module graphs.
 */

const v = window.__OMNI_BUILD_ID__ || "dev";

// Determine entry point from body data attribute (defaults to "login")
const entry = document.body?.dataset?.entry || "login";

const entrypoints = {
  app: "/js/app.js",
  login: "/js/login.js",
};

/**
 * Load configuration before booting
 */
async function loadConfig() {
  try {
    const response = await fetch("/runtime-config.json");
    if (!response.ok) throw new Error("Config fetch failed");
    window.__OMNI_CONFIG__ = await response.json();
  } catch (e) {
    console.warn("Could not load runtime-config.json:", e);
    window.__OMNI_CONFIG__ = {};
  }
}

/**
 * Main boot function - dynamically imports the appropriate entry point
 */
async function boot() {
  await loadConfig();

  const entrypoint = entrypoints[entry] || entrypoints.login;
  const { boot: entryBoot } = await import(`${entrypoint}?v=${encodeURIComponent(v)}`);

  if (typeof entryBoot === "function") {
    await entryBoot();
  }
}

// Execute boot
boot();
