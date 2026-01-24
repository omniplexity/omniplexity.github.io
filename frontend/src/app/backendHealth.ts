export type BackendStatus = "unknown" | "ok" | "down" | "degraded";

export type BackendHealthSnapshot = {
  status: BackendStatus;
  lastCheckedAt: number | null;
  lastError: string | null;
  nextRetryMs: number | null;
};

type Listener = () => void;

type ProbeController = {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => BackendHealthSnapshot;
  trigger: () => void;
};

const HEALTH_TIMEOUT_MS = 2000;
const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000;
const OK_POLL_MS = 60000;

export function computeBackoffMs(attempt: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const delay = INITIAL_BACKOFF_MS * Math.pow(2, safeAttempt);
  return Math.min(delay, MAX_BACKOFF_MS);
}

export function startBackendHealthProbe(getBaseUrl: () => string): ProbeController {
  let snapshot: BackendHealthSnapshot = {
    status: "unknown",
    lastCheckedAt: null,
    lastError: null,
    nextRetryMs: null,
  };
  let listeners = new Set<Listener>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let inFlight = false;

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const updateSnapshot = (next: Partial<BackendHealthSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    notify();
  };

  const schedule = (delayMs: number) => {
    if (timer) {
      clearTimeout(timer);
    }
    updateSnapshot({ nextRetryMs: delayMs });
    timer = setTimeout(() => {
      runProbe();
    }, delayMs);
  };

  const runProbe = async () => {
    if (inFlight) return;
    inFlight = true;

    const baseUrl = getBaseUrl()?.replace(/\/+$/, "");
    if (!baseUrl) {
      updateSnapshot({
        status: "down",
        lastCheckedAt: Date.now(),
        lastError: "Missing API base URL",
      });
      const delay = computeBackoffMs(attempt);
      schedule(delay);
      attempt += 1;
      inFlight = false;
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      const res = await fetch(`${baseUrl}/health`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (res.ok) {
        updateSnapshot({
          status: "ok",
          lastCheckedAt: Date.now(),
          lastError: null,
        });
        attempt = 0;
        schedule(OK_POLL_MS);
      } else {
        updateSnapshot({
          status: "degraded",
          lastCheckedAt: Date.now(),
          lastError: `HTTP ${res.status}`,
        });
        const delay = computeBackoffMs(attempt);
        schedule(delay);
        attempt += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      updateSnapshot({
        status: "down",
        lastCheckedAt: Date.now(),
        lastError: message,
      });
      const delay = computeBackoffMs(attempt);
      schedule(delay);
      attempt += 1;
    } finally {
      clearTimeout(timeout);
      inFlight = false;
    }
  };

  const trigger = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    runProbe();
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => snapshot;

  // Start immediately without blocking render
  trigger();

  return { subscribe, getSnapshot, trigger };
}
