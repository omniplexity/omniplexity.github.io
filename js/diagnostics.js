import { getState } from "./state.js";

const metrics = {
  nav: null,
  firstTokenLatencyMs: null,
  streamDurationMs: null,
  streamedMessages: 0,
  memoryIdle5m: null,
  memoryAfter20: null,
  eventListeners: {},
  scrollFps: null,
  samples: [],
};

let streamStartTime = null;
let firstTokenRecorded = false;
let diagnosticsEnabled = false;
let addListenerWrapped = false;
let scrollTarget = null;

function nowMs() {
  return performance?.now ? performance.now() : Date.now();
}

function getHeap() {
  return performance?.memory?.usedJSHeapSize ?? null;
}

function recordNavTiming() {
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  if (!nav) return null;
  return {
    domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
    loadMs: Math.round(nav.loadEventEnd),
    responseMs: Math.round(nav.responseEnd),
    transferSize: nav.transferSize ?? null,
  };
}

function wrapAddEventListener() {
  if (addListenerWrapped) return;
  const original = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type) {
      metrics.eventListeners[type] = (metrics.eventListeners[type] || 0) + 1;
    }
    return original.call(this, type, listener, options);
  };
  addListenerWrapped = true;
}

function sampleScrollFps(target, durationMs = 2000) {
  if (!target) return;
  let frames = 0;
  let start = null;
  let rafId = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    frames += 1;
    if (timestamp - start >= durationMs) {
      const fps = Math.round((frames * 1000) / (timestamp - start));
      metrics.scrollFps = fps;
      metrics.samples.push({ type: "scrollFps", fps, at: new Date().toISOString() });
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

export function initDiagnostics() {
  if (typeof document === "undefined") return;
  diagnosticsEnabled = document.body?.dataset?.debug === "on";
  if (!diagnosticsEnabled) return;
  metrics.nav = recordNavTiming();
  wrapAddEventListener();
  setTimeout(() => {
    metrics.memoryIdle5m = getHeap();
  }, 5 * 60 * 1000);
  window.__omniMetrics = metrics;
  window.__omniSnapshot = () => {
    return {
      ...metrics,
      capturedAt: new Date().toISOString(),
      heap: getHeap(),
      messageCount: getState().messages.length,
    };
  };
  window.__omniMeasureScrollFps = (durationMs) => sampleScrollFps(scrollTarget, durationMs);
}

export function bindScrollProbe(target) {
  if (!diagnosticsEnabled || !target) return;
  scrollTarget = target;
  let active = false;
  const handler = () => {
    if (active) return;
    active = true;
    sampleScrollFps(target);
    setTimeout(() => {
      active = false;
    }, 2500);
  };
  target.addEventListener("scroll", handler, { passive: true });
}

export function recordStreamStart() {
  if (!diagnosticsEnabled) return;
  streamStartTime = nowMs();
  firstTokenRecorded = false;
}

export function recordFirstToken() {
  if (!diagnosticsEnabled || !streamStartTime || firstTokenRecorded) return;
  metrics.firstTokenLatencyMs = Math.round(nowMs() - streamStartTime);
  metrics.samples.push({
    type: "firstTokenLatency",
    value: metrics.firstTokenLatencyMs,
    at: new Date().toISOString(),
  });
  firstTokenRecorded = true;
}

export function recordStreamEnd(status = "final") {
  if (!diagnosticsEnabled || !streamStartTime) return;
  metrics.streamDurationMs = Math.round(nowMs() - streamStartTime);
  metrics.samples.push({
    type: "streamEnd",
    status,
    durationMs: metrics.streamDurationMs,
    at: new Date().toISOString(),
  });
  streamStartTime = null;
}

export function recordStreamMessage() {
  if (!diagnosticsEnabled) return;
  metrics.streamedMessages += 1;
  if (metrics.streamedMessages === 20) {
    metrics.memoryAfter20 = getHeap();
  }
}
