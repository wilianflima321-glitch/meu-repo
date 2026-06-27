/**
 * Aethel Engine - WebGPU Core Context
 * 
 * Wave 9.0 implementation for accessing Vulkan/Metal/DirectX via WebGPU.
 * This class abstracts the adapter and device fetching to be used globally
 * by the rendering and compute pipelines.
 */
import { logger } from '@/lib/observability/logger';

export class WebGPUContext {
  private static adapter: GPUAdapter | null = null;
  private static device: GPUDevice | null = null;
  private static isInitialized = false;

  /**
   * Initializes the WebGPU context.
   * Throws an error if WebGPU is not supported by the current hardware/browser.
   */
  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!navigator.gpu) {
      throw new Error("WebGPU is not supported in this environment. Fallback to WebGL required.");
    }

    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!this.adapter) {
      throw new Error("Failed to acquire GPU adapter. No appropriate hardware found.");
    }

    this.device = await this.adapter.requestDevice({
      requiredLimits: {
        maxComputeWorkgroupsPerDimension: 65535,
        maxStorageBufferBindingSize: 256 * 1024 * 1024, // 256MB per buffer
      }
    });

    this.device.lost.then((info) => {
      logger.error(`WebGPU Device was lost: ${info.message}`);
      this.isInitialized = false;
      // TODO: Handle automatic context recovery
    });

    this.isInitialized = true;
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
    if (!this.device) throw new Error("WebGPU context not initialized.");
    return this.device;
  }
}
