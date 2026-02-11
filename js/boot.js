import { createStore } from "./state/store.js";
import { createRouter } from "./router.js";
import { mountApp } from "./ui/app.js";

import { loadRuntimeConfig } from "./api/runtime.js";
import { setBackendBaseUrl } from "./api/client.js";
import * as Auth from "./api/auth.js";

(async () => {
  const store = createStore();
  const root = document.getElementById("app");

  const cfg = await loadRuntimeConfig();
  setBackendBaseUrl(cfg.BACKEND_BASE_URL);

  try {
    const meta = await Auth.meta();
    store.set({ meta, authenticated: !!meta?.authenticated });
  } catch (e) {
    store.set({ startupError: e?.message || String(e), authenticated: false });
  }

  const router = createRouter(store);
  mountApp({ root, store, router });
  router.start();
})();
