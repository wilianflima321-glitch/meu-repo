import {
  applyGrain,
  applyVignette,
  applyWatermark,
} from './canvas-utils';
import type { ScreenshotEffect, WatermarkConfig } from './types';

export function createProcessedCaptureCanvas(
  source: HTMLCanvasElement,
  width?: number,
  height?: number,
  effects: ScreenshotEffect[] = [],
  watermark?: WatermarkConfig
): HTMLCanvasElement {
  const targetWidth = width || source.width;
  const targetHeight = height || source.height;
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d')!;
  const filters = effects.map(getCanvasFilter).filter(Boolean).join(' ');
  if (filters) ctx.filter = filters;

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  ctx.filter = 'none';

  const vignette = effects.find((effect) => effect.type === 'vignette');
  if (vignette) applyVignette(ctx, targetWidth, targetHeight, vignette.value);

  const grain = effects.find((effect) => effect.type === 'grain');
  if (grain) applyGrain(ctx, targetWidth, targetHeight, grain.value);

  if (watermark) applyWatermark(ctx, targetWidth, targetHeight, watermark);

  return canvas;
}

function getCanvasFilter(effect: ScreenshotEffect): string {
  switch (effect.type) {
    case 'brightness': return `brightness(${effect.value})`;
    case 'contrast': return `contrast(${effect.value})`;
    case 'saturation': return `saturate(${effect.value})`;
    case 'blur': return `blur(${effect.value}px)`;
    case 'grayscale': return `grayscale(${effect.value})`;
    case 'sepia': return `sepia(${effect.value})`;
    default: return '';
  }
}
