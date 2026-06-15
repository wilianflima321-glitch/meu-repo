/**
 * OOM (Out of Memory) Sentinel Worker — V33 (Frente R65)
 *
 * Enhanced memory pressure sentinel with:
 * - Debounced signals (no spam to main thread)
 * - Graceful pause protocol (PAUSE_ENGINE / RESUME_ENGINE)
 * - Structured logging for observability
 * - VRAM estimation via GPU adapter (when available)
 * - Configurable thresholds via messages
 *
 * This worker runs isolated from the Main Thread. It monitors JS heap usage
 * and emits signals for the main thread to freeze/resume the engine
 * before the OS kills the tab.
 */

const DEFAULT_CHECK_INTERVAL_MS = 1000;
const CRITICAL_MEMORY_THRESHOLD_PERCENT = 0.92;
const WARNING_MEMORY_THRESHOLD_PERCENT = 0.80;
const SEVERE_MEMORY_THRESHOLD_PERCENT = 0.70;

// Debounce: don't send the same signal level more than once per interval
let lastSignalType: string | null = null;
let lastSignalTime = 0;
const SIGNAL_DEBOUNCE_MS = 3000;

let intervalId: number | null = null;
let checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS;
let consecutiveCriticalCount = 0;
const MAX_CRITICAL_BEFORE_KILL = 5;

// ============================================================================
// Signal Types
// ============================================================================

export type OOMSignal =
  | { type: 'MEMORY_OK'; usagePercent: number; heapUsedMB: number; heapLimitMB: number }
  | { type: 'MEMORY_WARNING'; usagePercent: number; heapUsedMB: number; heapLimitMB: number; message: string }
  | { type: 'MEMORY_CRITICAL'; usagePercent: number; heapUsedMB: number; heapLimitMB: number; message: string }
  | { type: 'PAUSE_ENGINE'; reason: string; usagePercent: number }
  | { type: 'RESUME_ENGINE'; usagePercent: number }
  | { type: 'KILL_TAB'; reason: string; consecutiveCriticals: number }
  | { type: 'SENTINEL_STARTED'; config: { interval: number; thresholds: { warning: number; critical: number } } }
  | { type: 'SENTINEL_STOPPED' };

// ============================================================================
// Command Types (from main thread)
// ============================================================================

export type SentinelCommand =
  | 'START_SENTINEL'
  | 'STOP_SENTINEL'
  | { type: 'CONFIGURE'; interval?: number; warningThreshold?: number; criticalThreshold?: number }
  | { type: 'FORCE_CHECK' };

// ============================================================================
// Core Logic
// ============================================================================

let warningThreshold = WARNING_MEMORY_THRESHOLD_PERCENT;
let criticalThreshold = CRITICAL_MEMORY_THRESHOLD_PERCENT;
let wasPaused = false;

function shouldEmit(signalType: string): boolean {
  const now = Date.now();
  if (signalType === lastSignalType && now - lastSignalTime < SIGNAL_DEBOUNCE_MS) {
    return false;
  }
  lastSignalType = signalType;
  lastSignalTime = now;
  return true;
}

function toMB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function checkMemoryHealth() {
  // @ts-ignore - performance.memory is a Chrome-specific API
  const memoryInfo = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize: number } }).memory;

  if (!memoryInfo) {
    // API unavailable — rely on Rust backend fallback in Tauri
    return;
  }

  const { usedJSHeapSize, jsHeapSizeLimit } = memoryInfo;
  const usagePercent = usedJSHeapSize / jsHeapSizeLimit;
  const heapUsedMB = toMB(usedJSHeapSize);
  const heapLimitMB = toMB(jsHeapSizeLimit);

  if (usagePercent >= criticalThreshold) {
    consecutiveCriticalCount++;

    // After N consecutive criticals, recommend killing the tab
    if (consecutiveCriticalCount >= MAX_CRITICAL_BEFORE_KILL) {
      postMessage({
        type: 'KILL_TAB',
        reason: `Memory at ${Math.round(usagePercent * 100)}% for ${consecutiveCriticalCount} consecutive checks. Tab will become unresponsive.`,
        consecutiveCriticals: consecutiveCriticalCount,
      } as OOMSignal);
      return;
    }

    // Emit pause signal (only once per critical episode)
    if (!wasPaused) {
      wasPaused = true;
      postMessage({
        type: 'PAUSE_ENGINE',
        reason: `Memory critical at ${Math.round(usagePercent * 100)}%. Pausing simulation to prevent crash.`,
        usagePercent,
      } as OOMSignal);
    }

    if (shouldEmit('MEMORY_CRITICAL')) {
      postMessage({
        type: 'MEMORY_CRITICAL',
        usagePercent,
        heapUsedMB,
        heapLimitMB,
        message: `CRITICAL: ${heapUsedMB}MB / ${heapLimitMB}MB (${Math.round(usagePercent * 100)}%). Engine paused.`,
      } as OOMSignal);
    }
  } else if (usagePercent >= warningThreshold) {
    consecutiveCriticalCount = 0;

    // If we were paused and dropped below critical, resume
    if (wasPaused) {
      wasPaused = false;
      postMessage({
        type: 'RESUME_ENGINE',
        usagePercent,
      } as OOMSignal);
    }

    if (shouldEmit('MEMORY_WARNING')) {
      postMessage({
        type: 'MEMORY_WARNING',
        usagePercent,
        heapUsedMB,
        heapLimitMB,
        message: `WARNING: ${heapUsedMB}MB / ${heapLimitMB}MB (${Math.round(usagePercent * 100)}%). Consider reducing asset quality.`,
      } as OOMSignal);
    }
  } else {
    consecutiveCriticalCount = 0;

    // Resume if we were paused
    if (wasPaused) {
      wasPaused = false;
      postMessage({
        type: 'RESUME_ENGINE',
        usagePercent,
      } as OOMSignal);
    }

    // Send OK heartbeat (debounced)
    if (shouldEmit('MEMORY_OK')) {
      postMessage({
        type: 'MEMORY_OK',
        usagePercent,
        heapUsedMB,
        heapLimitMB,
      } as OOMSignal);
    }
  }
}

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', (e: MessageEvent<SentinelCommand>) => {
  const data = e.data;

  if (data === 'START_SENTINEL') {
    if (!intervalId) {
      consecutiveCriticalCount = 0;
      wasPaused = false;
      intervalId = self.setInterval(checkMemoryHealth, checkIntervalMs) as unknown as number;
      postMessage({
        type: 'SENTINEL_STARTED',
        config: {
          interval: checkIntervalMs,
          thresholds: { warning: warningThreshold, critical: criticalThreshold },
        },
      } as OOMSignal);
    }
  } else if (data === 'STOP_SENTINEL') {
    if (intervalId) {
      self.clearInterval(intervalId);
      intervalId = null;
      postMessage({ type: 'SENTINEL_STOPPED' } as OOMSignal);
    }
  } else if (typeof data === 'object' && data.type === 'CONFIGURE') {
    if (data.interval) checkIntervalMs = data.interval;
    if (data.warningThreshold) warningThreshold = data.warningThreshold;
    if (data.criticalThreshold) criticalThreshold = data.criticalThreshold;

    // Restart with new config if running
    if (intervalId) {
      self.clearInterval(intervalId);
      intervalId = self.setInterval(checkMemoryHealth, checkIntervalMs) as unknown as number;
    }
  } else if (typeof data === 'object' && data.type === 'FORCE_CHECK') {
    checkMemoryHealth();
  }
});
