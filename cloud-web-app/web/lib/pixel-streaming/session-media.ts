export interface PixelStreamingMediaState {
  audioElement: HTMLAudioElement | null;
  videoElement: HTMLVideoElement | null;
}

export interface AttachIncomingTrackOptions extends PixelStreamingMediaState {
  audioEnabled: boolean;
  event: RTCTrackEvent;
  onAudioPlaybackError(error: unknown): void;
  onVideoPlaybackError(error: unknown): void;
}

export function attachIncomingPixelStreamTrack({
  audioElement,
  audioEnabled,
  event,
  onAudioPlaybackError,
  onVideoPlaybackError,
  videoElement,
}: AttachIncomingTrackOptions): PixelStreamingMediaState {
  const track = event.track;
  const stream = event.streams[0];

  if (track.kind === 'video') {
    const nextVideo = videoElement || createVideoElement();
    nextVideo.srcObject = stream;
    nextVideo.play().catch(onVideoPlaybackError);
    return { audioElement, videoElement: nextVideo };
  }

  if (track.kind === 'audio' && audioEnabled) {
    const nextAudio = audioElement || createAudioElement();
    nextAudio.srcObject = new MediaStream([track]);
    nextAudio.play().catch(onAudioPlaybackError);
    return { audioElement: nextAudio, videoElement };
  }

  return { audioElement, videoElement };
}

function createVideoElement(): HTMLVideoElement {
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  return video;
}

function createAudioElement(): HTMLAudioElement {
  const audio = document.createElement('audio');
  audio.autoplay = true;
  return audio;
}
