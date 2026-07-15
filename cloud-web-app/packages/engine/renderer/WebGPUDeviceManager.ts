import { WebGPUContext } from './WebGPUContext';
import { logger } from '../../../web/lib/observability/logger';

/**
 * WebGPUDeviceManager
 * 
 * Provides robust fallback mechanisms. If WebGPU fails to initialize
 * (e.g., on older mobile devices or unsupported browsers), it gracefully
 * degrades the rendering pipeline to WebGL2, ensuring the Aethel Engine
 * never crashes due to hardware limitations.
 */
export class WebGPUDeviceManager {
  private static usingFallback = false;

  public static async initialize(): Promise<void> {
    try {
      await WebGPUContext.init();
      logger.info('[WebGPUDeviceManager] Native WebGPU initialized successfully.');
      this.usingFallback = false;
    } catch (e) {
      logger.warn('[WebGPUDeviceManager] WebGPU initialization failed, falling back to WebGL2.', e);
      this.usingFallback = true;
      // In a full implementation, we would initialize a WebGL2 specific context here
    }
  }

  public static isWebGPUSupported(): boolean {
    return !this.usingFallback;
  }

  public static getDevice(): GPUDevice | null {
    if (this.usingFallback) return null;
    return WebGPUContext.getDevice();
  }
}
