import type { CapturedMedia } from './types';

export function addCapturedMediaToGallery(params: {
  deleteMedia(id: string): void;
  gallery: Map<string, CapturedMedia>;
  maxGallerySize: number;
  media: CapturedMedia;
}): void {
  params.gallery.set(params.media.id, params.media);

  while (params.gallery.size > params.maxGallerySize) {
    const oldest = Array.from(params.gallery.values()).sort((a, b) => a.timestamp - b.timestamp)[0];
    params.deleteMedia(oldest.id);
  }
}

export function getSortedCapturedMedia(gallery: Map<string, CapturedMedia>): CapturedMedia[] {
  return Array.from(gallery.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export function revokeCapturedMediaUrls(gallery: Iterable<CapturedMedia>): void {
  for (const media of gallery) URL.revokeObjectURL(media.url);
}
