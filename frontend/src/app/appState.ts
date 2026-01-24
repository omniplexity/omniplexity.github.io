import { useSyncExternalStore } from "react";
import type { BackendStatus } from "./backendHealth";

export type ConfigSource = "runtime-config" | "env" | "fallback";

export type AppState = {
  apiBaseUrl: string;
  configSource: ConfigSource;
  backendStatus: BackendStatus;
  lastHealthCheckAt: number | null;
  lastError: string | null;
  nextRetryMs: number | null;
};

const listeners = new Set<() => void>();
let backendHealthTrigger: (() => void) | null = null;

let state: AppState = {
  apiBaseUrl: "",
  configSource: "fallback",
  backendStatus: "unknown",
  lastHealthCheckAt: null,
  lastError: null,
  nextRetryMs: null,
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

export function setConfig(apiBaseUrl: string, source: ConfigSource) {
  state = { ...state, apiBaseUrl, configSource: source };
  notify();
  if (backendHealthTrigger) {
    backendHealthTrigger();
  }
}

export function setBackendStatus(
  status: BackendStatus,
  info: { checkedAt: number; error?: string | null; nextRetryMs?: number | null }
) {
  state = {
    ...state,
    backendStatus: status,
    lastHealthCheckAt: info.checkedAt,
    lastError: info.error ?? null,
    nextRetryMs: info.nextRetryMs ?? null,
  };
  notify();
}

export function setBackendHealthTrigger(trigger: (() => void) | null) {
  backendHealthTrigger = trigger;
}

export function triggerBackendHealthCheck() {
  if (backendHealthTrigger) {
    backendHealthTrigger();
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
