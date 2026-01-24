import { triggerBackendHealthCheck, useAppState } from "../app/appState";

const formatTime = (value: number | null) => {
  if (!value) return "never";
  return new Date(value).toLocaleTimeString();
};

const formatRetry = (value: number | null) => {
  if (!value) return "";
  const seconds = Math.ceil(value / 1000);
  return `Next retry in ${seconds}s`;
};

const BackendBanner = () => {
  const { apiBaseUrl, configSource, backendStatus, lastHealthCheckAt, lastError, nextRetryMs } = useAppState();
  const showBanner = configSource === "fallback" || backendStatus !== "ok";

  if (!showBanner) return null;

  return (
    <div className="bg-amber-100 text-amber-900 border-b border-amber-200">
      <div className="mx-auto flex flex-col gap-2 max-w-5xl px-6 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="font-medium">
            Backend status: {backendStatus}
            {configSource === "fallback" ? " (fallback config)" : ""}
          </div>
          <div className="text-xs text-amber-800">
            Last check: {formatTime(lastHealthCheckAt)}{lastError ? ` • ${lastError}` : ""}
            {nextRetryMs ? ` • ${formatRetry(nextRetryMs)}` : ""}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs sm:items-end">
          <span className="font-mono break-all">{apiBaseUrl || "(not set)"}</span>
          <button
            type="button"
            onClick={() => triggerBackendHealthCheck()}
            className="rounded border border-amber-300 bg-white px-3 py-1 text-amber-900 hover:bg-amber-50"
          >
            Recheck now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackendBanner;
