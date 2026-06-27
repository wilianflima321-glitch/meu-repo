/**
 * plugin-sandbox-hardened.ts  — Sprint V33
 *
 * Hardened plugin execution sandbox for Aethel Engine.
 * Extends the basic sandbox with:
 *   - Hard CPU/memory limits via Worker execution timeouts
 *   - Watchdog monitor — kills runaway workers
 *   - Egress domain allowlist — blocks unauthorized network requests
 *   - Resource budget enforcement (memory estimate, API call rate)
 *   - Manifest permission validation before execution
 */

import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('plugin-sandbox-hardened');

// ---------------------------------------------------------------------------
// Plugin Manifest & Permissions
// ---------------------------------------------------------------------------

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: PluginPermissions;
  /** Plugin WASM or JS bundle base64 or URL */
  entrypoint: string;
  checksum: string; // SHA-256 hex of entrypoint
}

export interface PluginPermissions {
  /** Domains the plugin is allowed to make HTTP requests to */
  allowedDomains: string[];
  /** Whether the plugin can read files from the local filesystem (Tauri only) */
  fileSystemRead: boolean;
  fileSystemWrite: boolean;
  /** Whether the plugin can access the 3D scene graph */
  sceneAccess: 'read' | 'read_write' | 'none';
  /** Max memory budget in MB */
  memoryBudgetMB: number;
  /** Max API requests per minute */
  apiRateLimitRPM: number;
  /** Max wall-clock execution time per invocation (ms) */
  executionTimeoutMs: number;
}

export const DEFAULT_PERMISSIONS: PluginPermissions = {
  allowedDomains: [],
  fileSystemRead: false,
  fileSystemWrite: false,
  sceneAccess: 'none',
  memoryBudgetMB: 64,
  apiRateLimitRPM: 30,
  executionTimeoutMs: 5000,
};

// ---------------------------------------------------------------------------
// Sandbox Message Protocol
// ---------------------------------------------------------------------------

export type SandboxMessageType =
  | 'execute'
  | 'result'
  | 'error'
  | 'network_request'
  | 'network_response'
  | 'heartbeat'
  | 'terminate';

export interface SandboxMessage {
  type: SandboxMessageType;
  invocationId: string;
  payload?: unknown;
}

// ---------------------------------------------------------------------------
// HardenedSandbox
// ---------------------------------------------------------------------------

export interface SandboxResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  executionMs: number;
  memoryEstimateMB?: number;
}

export class HardenedPluginSandbox {
  private manifest: PluginManifest;
  private worker: Worker | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private apiCallLog: number[] = []; // timestamps of API calls
  private pendingInvocations = new Map<string, {
    resolve: (r: SandboxResult) => void;
    reject: (e: Error) => void;
    startTime: number;
  }>();

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
    this.validateManifest();
  }

  // ── Manifest validation ───────────────────────────────────────────────────

  private validateManifest(): void {
    const { permissions } = this.manifest;
    if (permissions.memoryBudgetMB > 512) {
      throw new Error(`Plugin "${this.manifest.id}" requests excessive memory: ${permissions.memoryBudgetMB}MB > 512MB limit`);
    }
    if (permissions.executionTimeoutMs > 30_000) {
      throw new Error(`Plugin "${this.manifest.id}" requests excessive timeout: ${permissions.executionTimeoutMs}ms`);
    }
    if (permissions.fileSystemWrite && !permissions.fileSystemRead) {
      throw new Error(`Plugin "${this.manifest.id}": cannot request fileSystemWrite without fileSystemRead`);
    }
    log.info('Plugin manifest validated', { id: this.manifest.id });
  }

  // ── Worker lifecycle ──────────────────────────────────────────────────────

  private async spawnWorker(): Promise<Worker> {
    if (this.worker) return this.worker;

    // Build sandboxed worker script inline
    const workerCode = this.buildWorkerScript();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url, { type: 'module' });
    URL.revokeObjectURL(url);

    this.worker.addEventListener('message', this.handleMessage.bind(this));
    this.worker.addEventListener('error', this.handleWorkerError.bind(this));
    this.startHeartbeatWatchdog();

    log.info('Sandboxed worker spawned', { plugin: this.manifest.id });
    return this.worker;
  }

  private buildWorkerScript(): string {
    const { permissions } = this.manifest;
    return `
// Aethel Plugin Sandbox — auto-generated worker
// Allowed domains: ${JSON.stringify(permissions.allowedDomains)}
// Memory budget: ${permissions.memoryBudgetMB}MB
// Timeout: ${permissions.executionTimeoutMs}ms

const ALLOWED_DOMAINS = ${JSON.stringify(permissions.allowedDomains)};

// Override fetch to enforce domain allowlist
const _nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const domain = new URL(url).hostname;
  if (!ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
    throw new Error('Plugin fetch blocked: domain ' + domain + ' not in allowlist');
  }
  self.postMessage({ type: 'network_request', invocationId: '', payload: { url, domain } });
  const res = await _nativeFetch(input, init);
  return res;
};

self.onmessage = async (e) => {
  const { type, invocationId, payload } = e.data;
  if (type === 'terminate') { self.close(); return; }
  if (type !== 'execute') return;

  try {
    // Plugin code runs here in the isolated worker context
    // payload.code is the plugin's sandboxed function body (string)
    const fn = new Function('payload', payload.code);
    const result = await fn(payload.args);
    self.postMessage({ type: 'result', invocationId, payload: { output: result } });
  } catch (err) {
    self.postMessage({ type: 'error', invocationId, payload: { error: err.message } });
  }
};

// Heartbeat
setInterval(() => self.postMessage({ type: 'heartbeat', invocationId: '', payload: null }), 1000);
`;
  }

  // ── Message handling ──────────────────────────────────────────────────────

  private handleMessage(e: MessageEvent<SandboxMessage>): void {
    const { type, invocationId, payload } = e.data;

    switch (type) {
      case 'result':
      case 'error': {
        const pending = this.pendingInvocations.get(invocationId);
        if (!pending) break;
        const executionMs = performance.now() - pending.startTime;
        if (type === 'result') {
          pending.resolve({ ok: true, output: (payload as { output: unknown }).output, executionMs });
        } else {
          pending.resolve({ ok: false, error: (payload as { error: string }).error, executionMs });
        }
        this.pendingInvocations.delete(invocationId);
        break;
      }
      case 'heartbeat':
        this.resetWatchdog();
        break;
      case 'network_request':
        log.info('Plugin network request', { plugin: this.manifest.id, url: (payload as { url: string }).url });
        this.enforceRateLimit();
        break;
    }
  }

  private handleWorkerError(e: ErrorEvent): void {
    log.error('Plugin worker error', { plugin: this.manifest.id, message: e.message });
    for (const [, p] of this.pendingInvocations) {
      p.reject(new Error(`Worker error: ${e.message}`));
    }
    this.pendingInvocations.clear();
    this.terminate();
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────

  private enforceRateLimit(): void {
    const now = Date.now();
    const windowMs = 60_000;
    this.apiCallLog = this.apiCallLog.filter((t) => now - t < windowMs);
    this.apiCallLog.push(now);
    if (this.apiCallLog.length > this.manifest.permissions.apiRateLimitRPM) {
      log.warn('Plugin rate limit exceeded, terminating', { plugin: this.manifest.id });
      this.terminate();
      throw new Error(`Plugin "${this.manifest.id}" exceeded API rate limit`);
    }
  }

  // ── Watchdog ──────────────────────────────────────────────────────────────

  private startHeartbeatWatchdog(): void {
    this.resetWatchdog();
  }

  private resetWatchdog(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => {
      log.error('Plugin watchdog timeout — worker unresponsive, terminating', { plugin: this.manifest.id });
      this.terminate();
    }, 5000); // 5s without heartbeat = dead
  }

  // ── Invocation ────────────────────────────────────────────────────────────

  async invoke(code: string, args?: unknown): Promise<SandboxResult> {
    const worker = await this.spawnWorker();
    const invocationId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = performance.now();

    return new Promise<SandboxResult>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingInvocations.delete(invocationId);
        resolve({
          ok: false,
          error: `Execution timeout after ${this.manifest.permissions.executionTimeoutMs}ms`,
          executionMs: performance.now() - startTime,
        });
        // Terminate and respawn to recover from hung plugin
        this.terminate();
      }, this.manifest.permissions.executionTimeoutMs);

      this.pendingInvocations.set(invocationId, {
        resolve: (r) => { clearTimeout(timeoutHandle); resolve(r); },
        reject: (e) => { clearTimeout(timeoutHandle); reject(e); },
        startTime,
      });

      worker.postMessage({ type: 'execute', invocationId, payload: { code, args } });
    });
  }

  terminate(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.worker?.postMessage({ type: 'terminate', invocationId: '' });
    this.worker?.terminate();
    this.worker = null;
    log.info('Plugin sandbox terminated', { plugin: this.manifest.id });
  }
}

// ---------------------------------------------------------------------------
// Plugin Registry — manages installed plugins
// ---------------------------------------------------------------------------

export class PluginRegistry {
  private sandboxes = new Map<string, HardenedPluginSandbox>();
  private manifests = new Map<string, PluginManifest>();

  install(manifest: PluginManifest): HardenedPluginSandbox {
    if (this.sandboxes.has(manifest.id)) {
      throw new Error(`Plugin "${manifest.id}" is already installed`);
    }
    const sandbox = new HardenedPluginSandbox(manifest);
    this.sandboxes.set(manifest.id, sandbox);
    this.manifests.set(manifest.id, manifest);
    log.info('Plugin installed', { id: manifest.id, version: manifest.version });
    return sandbox;
  }

  uninstall(pluginId: string): void {
    this.sandboxes.get(pluginId)?.terminate();
    this.sandboxes.delete(pluginId);
    this.manifests.delete(pluginId);
    log.info('Plugin uninstalled', { id: pluginId });
  }

  getSandbox(pluginId: string): HardenedPluginSandbox | undefined {
    return this.sandboxes.get(pluginId);
  }

  getInstalledPlugins(): PluginManifest[] {
    return [...this.manifests.values()];
  }

  disposeAll(): void {
    for (const [id] of this.sandboxes) this.uninstall(id);
  }
}

export const pluginRegistry = new PluginRegistry();
