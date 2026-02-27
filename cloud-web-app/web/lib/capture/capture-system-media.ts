import type {
  CapturedMedia,
  ScreenshotEffect,
  WatermarkConfig,
} from './capture-types';

function applyVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 2
  );

  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function applyGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 50;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermark: WatermarkConfig
): void {
  const margin = watermark.margin ?? 20;
  const opacity = watermark.opacity ?? 0.7;

  ctx.globalAlpha = opacity;

  let x = margin;
  let y = margin;

  switch (watermark.position) {
    case 'top-right':
      x = width - margin;
      break;
    case 'bottom-left':
      y = height - margin;
      break;
    case 'bottom-right':
      x = width - margin;
      y = height - margin;
      break;
    case 'center':
      x = width / 2;
      y = height / 2;
      break;
  }

  if (watermark.text) {
    ctx.font = `${watermark.fontSize ?? 16}px ${watermark.fontFamily ?? 'Arial'}`;
    ctx.fillStyle = watermark.fontColor ?? 'white';
    ctx.textAlign = watermark.position.includes('right') ? 'right'
      : watermark.position === 'center' ? 'center'
        : 'left';
    ctx.textBaseline = watermark.position.includes('bottom') ? 'bottom'
      : watermark.position === 'center' ? 'middle'
        : 'top';
    ctx.fillText(watermark.text, x, y);
  }

  ctx.globalAlpha = 1;
}

export function createProcessedCanvas(
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

  const filters = effects.map((effect) => {
    switch (effect.type) {
      case 'brightness':
        return `brightness(${effect.value})`;
      case 'contrast':
        return `contrast(${effect.value})`;
      case 'saturation':
        return `saturate(${effect.value})`;
      case 'blur':
        return `blur(${effect.value}px)`;
      case 'grayscale':
        return `grayscale(${effect.value})`;
      case 'sepia':
        return `sepia(${effect.value})`;
      default:
        return '';
    }
  }).filter(Boolean).join(' ');

  if (filters) {
    ctx.filter = filters;
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  ctx.filter = 'none';

  const vignette = effects.find((effect) => effect.type === 'vignette');
  if (vignette) {
    applyVignette(ctx, targetWidth, targetHeight, vignette.value);
  }

  const grain = effects.find((effect) => effect.type === 'grain');
  if (grain) {
    applyGrain(ctx, targetWidth, targetHeight, grain.value);
  }

  if (watermark) {
    applyWatermark(ctx, targetWidth, targetHeight, watermark);
  }

  return canvas;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
      type,
      quality
    );
  });
}

export function createMediaEntry(
  type: 'screenshot' | 'video' | 'gif',
  blob: Blob,
  data: {
    width: number;
    height: number;
    format: string;
    filename: string;
    duration?: number;
  }
): CapturedMedia {
  return {
    id: `capture_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    blob,
    url: URL.createObjectURL(blob),
    width: data.width,
    height: data.height,
    size: blob.size,
    timestamp: Date.now(),
    filename: data.filename,
    format: data.format,
    duration: data.duration,
  };
}

export function generateFilename(type: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${type}_${timestamp}.${extension}`;
}

export function flashCaptureScreen(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const flash = document.createElement('div');
  flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
      opacity: 0.8;
      pointer-events: none;
      z-index: 99999;
      animation: flash 0.15s ease-out forwards;
    `;

  const style = document.createElement('style');
  style.textContent = `
      @keyframes flash {
        to { opacity: 0; }
      }
    `;

  document.head.appendChild(style);
  document.body.appendChild(flash);

  setTimeout(() => {
    flash.remove();
    style.remove();
  }, 200);
}
