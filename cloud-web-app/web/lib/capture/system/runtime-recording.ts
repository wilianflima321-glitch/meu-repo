import { logger } from '@/lib/observability/logger';

export async function getCaptureAudioStream(systemAudio: boolean, microphone: boolean): Promise<MediaStream | null> {
  try {
    if (systemAudio && 'getDisplayMedia' in navigator.mediaDevices) {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      const audioTracks = displayStream.getAudioTracks();
      displayStream.getVideoTracks().forEach((track) => track.stop());

      if (audioTracks.length > 0) {
        const stream = new MediaStream(audioTracks);
        if (microphone) {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach((track) => stream.addTrack(track));
        }
        return stream;
      }
    }

    if (microphone) return await navigator.mediaDevices.getUserMedia({ audio: true });
    return null;
  } catch (error) {
    logger.warn('Failed to get audio stream:', error);
    return null;
  }
}

export async function generateVideoThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    video.currentTime = 0.5;

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(video.src);
      resolve(thumbnail);
    };

    video.onerror = () => resolve('');
  });
}
