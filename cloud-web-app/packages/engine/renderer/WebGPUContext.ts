/**
 * Aethel Engine - WebGPU Core Context
 * 
 * Wave 9.0 implementation for accessing Vulkan/Metal/DirectX via WebGPU.
 * This class abstracts the adapter and device fetching to be used globally
 * by the rendering and compute pipelines.
 */
import { logger } from '../../../web/lib/observability/logger';

export interface WebGPUContextHealth {
  initialized: boolean;
  deviceLost: boolean;
  recoveryAttempts: number;
  recoveryInFlight: boolean;
  lastLossMessage: string | null;
}

export class WebGPUContext {
  private static adapter: GPUAdapter | null = null;
  private static device: GPUDevice | null = null;
  private static isInitialized = false;
  private static recoveryAttempts = 0;
  private static recoveryInFlight = false;
  private static lastLossMessage: string | null = null;
  /** In-flight init serialization: concurrent callers share one acquisition. */
  private static initPromise: Promise<void> | null = null;

  /**
   * Automatic recovery policy: exactly ONE re-init attempt after a device
   * loss. If it fails, the context stays fail-closed and callers must inspect
   * `getHealth()` and surface the degraded state — no silent infinite
   * re-acquisition loop, no context that claims initialized while dead.
   */
  private static readonly MAX_AUTO_RECOVERY_ATTEMPTS = 1;

  private static async attemptRecovery(): Promise<void> {
    if (this.recoveryInFlight || this.recoveryAttempts >= this.MAX_AUTO_RECOVERY_ATTEMPTS) {
      if (this.recoveryAttempts >= this.MAX_AUTO_RECOVERY_ATTEMPTS) {
        logger.warn(
          `WebGPU automatic recovery exhausted (${this.recoveryAttempts} attempt(s)) — manual re-initialization required (fail-closed)`,
        );
      }
      return;
    }
    this.recoveryInFlight = true;
    try {
      await this.init();
      this.recoveryAttempts += 1;
      logger.info(`WebGPU context recovered automatically (attempt ${this.recoveryAttempts})`);
    } catch (err) {
      this.recoveryAttempts += 1;
      logger.error('WebGPU automatic recovery failed — context stays fail-closed', err);
    } finally {
      this.recoveryInFlight = false;
    }
  }

  public static getHealth(): WebGPUContextHealth {
    return {
      initialized: this.isInitialized,
      deviceLost: this.lastLossMessage !== null,
      recoveryAttempts: this.recoveryAttempts,
      recoveryInFlight: this.recoveryInFlight,
      lastLossMessage: this.lastLossMessage,
    };
  }

  /**
   * Initializes the WebGPU context.
   * Throws an error if WebGPU is not supported by the current hardware/browser.
   * Concurrent calls are serialized: every caller joins the single in-flight
   * acquisition instead of racing to overwrite static state.
   */
  public static init(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private static async doInit(): Promise<void> {
    if (this.isInitialized) return;

    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this environment. Fallback to WebGL required.');
    }

    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!this.adapter) {
      throw new Error('Failed to acquire GPU adapter. No appropriate hardware found.');
    }

    this.device = await this.adapter.requestDevice({
      requiredLimits: {
        maxComputeWorkgroupsPerDimension: 65535,
        maxStorageBufferBindingSize: 256 * 1024 * 1024, // 256MB per buffer
      },
    });

    const acquiredDevice = this.device;
    acquiredDevice.lost.then((info) => {
      // Stale-handler guard: a superseded device (lost during a race with a
      // newer acquisition) must never null out the current healthy device.
      if (this.device !== acquiredDevice) return;
      logger.error(`WebGPU Device was lost: ${info.message}`);
      this.isInitialized = false;
      this.device = null;
      this.adapter = null;
      this.lastLossMessage = info.message;
      void this.attemptRecovery();
    });

    this.isInitialized = true;
    // A successful (re-)acquisition clears the historical loss: `deviceLost`
    // reflects the CURRENT device, not "ever lost".
    this.lastLossMessage = null;
    let deviceName = 'High-Performance GPU';
    const adapterAny = this.adapter as any;
    if (adapterAny.requestAdapterInfo) {
      try {
        const info = await adapterAny.requestAdapterInfo();
        if (info && info.device) {
          deviceName = info.device;
        }
      } catch (e) {
        logger.warn('requestAdapterInfo fallback failed', e);
      }
    }
    logger.info(`[Aethel Engine] WebGPU Initialized on: ${deviceName}`);
  }

  public static getDevice(): GPUDevice {
    if (!this.device || !this.isInitialized) {
      const health = this.getHealth();
      throw new Error(
        `WebGPU context not initialized (deviceLost=${health.deviceLost} recoveryAttempts=${health.recoveryAttempts} lastLoss=${health.lastLossMessage ?? 'n/a'}).`,
      );
    }
    return this.device;
  }

  /** Test seam — resets static state (vitest only; never call from product code). */
  public static __resetForTests(): void {
    this.adapter = null;
    this.device = null;
    this.isInitialized = false;
    this.recoveryAttempts = 0;
    this.recoveryInFlight = false;
    this.lastLossMessage = null;
    this.initPromise = null;
  }
}
