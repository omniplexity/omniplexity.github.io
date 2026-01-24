import { triggerBackendHealthCheck, useAppState } from "../app/appState";

const formatTime = (value: number | null) => {
  if (!value) return "never";
  return new Date(value).toLocaleTimeString();
};

const formatRetry = (value: number | null) => {
  if (!value) return "";
  const seconds = Math.ceil(value / 1000);
  return `${seconds}s`;
};

const ProbeDebugPanel = () => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const { apiBaseUrl, configSource, backendStatus, lastHealthCheckAt, lastError, nextRetryMs } = useAppState();

  return (
    <div className="fixed bottom-4 right-4 w-80 rounded-xl border border-slate-200 bg-white/90 p-4 text-xs shadow-lg backdrop-blur">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Probe Debug</div>
      <div className="space-y-1">
        <div><span className="text-slate-500">apiBaseUrl:</span> <span className="break-all">{apiBaseUrl || "(unset)"}</span></div>
        <div><span className="text-slate-500">configSource:</span> {configSource}</div>
        <div><span className="text-slate-500">backendStatus:</span> {backendStatus}</div>
        <div><span className="text-slate-500">lastCheck:</span> {formatTime(lastHealthCheckAt)}</div>
        <div><span className="text-slate-500">lastError:</span> {lastError || "none"}</div>
        <div><span className="text-slate-500">nextRetry:</span> {nextRetryMs ? formatRetry(nextRetryMs) : "n/a"}</div>
      </div>
      <button
        type="button"
        onClick={() => triggerBackendHealthCheck()}
        className="mt-3 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
      >
        Recheck now
      </button>
    </div>
  );
};

export default ProbeDebugPanel;
