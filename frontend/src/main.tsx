import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { loadRuntimeConfig } from "./app/runtimeConfig";
import { startBackendHealthProbe } from "./app/backendHealth";
import { initApi } from "./lib/apiClient";
import { getSnapshot, setBackendHealthTrigger, setBackendStatus, setConfig } from "./app/appState";
import "./styles/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

async function bootstrap() {
  const config = await loadRuntimeConfig();
  initApi(config.apiBaseUrl);
  setConfig(config.apiBaseUrl, config.source);

  const probe = startBackendHealthProbe(() => getSnapshot().apiBaseUrl);
  setBackendHealthTrigger(() => probe.trigger());
  const syncSnapshot = () => {
    const snapshot = probe.getSnapshot();
    setBackendStatus(snapshot.status, {
      checkedAt: snapshot.lastCheckedAt ?? Date.now(),
      error: snapshot.lastError,
      nextRetryMs: snapshot.nextRetryMs,
    });
  };
  syncSnapshot();
  probe.subscribe(syncSnapshot);

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
