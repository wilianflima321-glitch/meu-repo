import type { QualityPreset } from './useRenderPipeline.types';

/**
 * Detecta automaticamente a melhor qualidade baseada no hardware
 */
export function detectOptimalQuality(): QualityPreset {
  // Check if mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) return 'mobile';

  // Check memory
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return 'low';
  if (memory && memory < 8) return 'medium';

  // Check GPU via WebGL
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

  if (!gl) return 'low';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

    // High-end GPUs
    if (renderer.includes('rtx 40') || renderer.includes('rtx 30') ||
        renderer.includes('rx 7') || renderer.includes('rx 6')) {
      return 'ultra';
    }

    // Mid-range GPUs
    if (renderer.includes('rtx 20') || renderer.includes('gtx 16') ||
        renderer.includes('rx 5') || renderer.includes('gtx 1080') ||
        renderer.includes('gtx 1070')) {
      return 'high';
    }

    // Entry GPUs
    if (renderer.includes('gtx 1060') || renderer.includes('gtx 1050') ||
        renderer.includes('rx 580') || renderer.includes('rx 570')) {
      return 'medium';
    }

    // Integrated GPUs
    if (renderer.includes('intel') || renderer.includes('integrated')) {
      return 'low';
    }
  }

  // Default to medium
  return 'medium';
}

export default useRenderPipeline;

