import { logger } from '@/lib/observability/logger';
import type { CapturedMedia } from './types';

export function downloadCapturedMedia(media: CapturedMedia): void {
  const link = document.createElement('a');
  link.href = media.url;
  link.download = media.filename;
  link.click();
}

export async function shareCapturedMedia(media: CapturedMedia): Promise<boolean> {
  if (!navigator.share) {
    logger.warn('Web Share API not supported');
    return false;
  }

  try {
    const file = new File([media.blob], media.filename, { type: media.blob.type });
    await navigator.share({
      title: 'Game Capture',
      files: [file],
    });
    return true;
  } catch (error) {
    logger.error('Share failed:', error);
    return false;
  }
}

export async function copyScreenshotToClipboard(media: CapturedMedia): Promise<boolean> {
  if (media.type !== 'screenshot') return false;

  try {
    const item = new ClipboardItem({ [media.blob.type]: media.blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (error) {
    logger.error('Copy to clipboard failed:', error);
    return false;
  }
}

export function serializeGalleryMetadata(gallery: Iterable<CapturedMedia>): string {
  return JSON.stringify(Array.from(gallery).map((media) => ({
    id: media.id,
    type: media.type,
    filename: media.filename,
    timestamp: media.timestamp,
    width: media.width,
    height: media.height,
    size: media.size,
    format: media.format,
    duration: media.duration,
  })));
}
