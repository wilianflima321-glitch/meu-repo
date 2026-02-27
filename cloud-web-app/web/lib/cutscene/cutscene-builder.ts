import type {
  ClipData,
  CutsceneDefinition,
  EasingType,
  Track,
  TrackType,
} from './cutscene-types';

export class CutsceneBuilder {
  private definition: Partial<CutsceneDefinition> = {
    tracks: [],
    skippable: true,
    pausable: true,
  };

  private currentTrack: Track | null = null;

  static create(id: string): CutsceneBuilder {
    return new CutsceneBuilder().id(id);
  }

  id(id: string): this {
    this.definition.id = id;
    return this;
  }

  name(name: string): this {
    this.definition.name = name;
    return this;
  }

  duration(seconds: number): this {
    this.definition.duration = seconds;
    return this;
  }

  skippable(skippable = true): this {
    this.definition.skippable = skippable;
    return this;
  }

  pausable(pausable = true): this {
    this.definition.pausable = pausable;
    return this;
  }

  autoPlay(autoPlay = true): this {
    this.definition.autoPlay = autoPlay;
    return this;
  }

  onComplete(eventId: string): this {
    this.definition.onComplete = eventId;
    return this;
  }

  // Track building
  track(type: TrackType, targetId?: string): this {
    this.currentTrack = {
      id: `track_${this.definition.tracks!.length}`,
      type,
      targetId,
      clips: [],
      enabled: true,
    };
    this.definition.tracks!.push(this.currentTrack);
    return this;
  }

  cameraTrack(): this {
    return this.track('camera');
  }

  characterTrack(targetId: string): this {
    return this.track('character', targetId);
  }

  audioTrack(): this {
    return this.track('audio');
  }

  subtitleTrack(): this {
    return this.track('subtitle');
  }

  eventTrack(): this {
    return this.track('event');
  }

  fadeTrack(): this {
    return this.track('fade');
  }

  // Clip building
  clip(startTime: number, endTime: number, data: ClipData, easing?: EasingType): this {
    if (!this.currentTrack) {
      throw new Error('No track selected. Call track() first.');
    }

    this.currentTrack.clips.push({
      id: `clip_${this.currentTrack.clips.length}`,
      startTime,
      endTime,
      data,
      easing,
    });

    return this;
  }

  // Camera clips
  cameraMove(
    startTime: number,
    endTime: number,
    startPos: { x: number; y: number; z: number },
    endPos: { x: number; y: number; z: number },
    lookAt: { x: number; y: number; z: number },
    easing: EasingType = 'easeInOut'
  ): this {
    return this.clip(
      startTime,
      endTime,
      {
        type: 'camera',
        startPosition: startPos,
        endPosition: endPos,
        startLookAt: lookAt,
        endLookAt: lookAt,
      },
      easing
    );
  }

  cameraPan(
    startTime: number,
    endTime: number,
    startPos: { x: number; y: number; z: number },
    endPos: { x: number; y: number; z: number },
    startLookAt: { x: number; y: number; z: number },
    endLookAt: { x: number; y: number; z: number },
    easing: EasingType = 'easeInOut'
  ): this {
    return this.clip(
      startTime,
      endTime,
      {
        type: 'camera',
        startPosition: startPos,
        endPosition: endPos,
        startLookAt,
        endLookAt,
      },
      easing
    );
  }

  // Character clips
  characterMove(
    startTime: number,
    endTime: number,
    startPos: { x: number; y: number; z: number },
    endPos: { x: number; y: number; z: number },
    easing: EasingType = 'linear'
  ): this {
    return this.clip(
      startTime,
      endTime,
      {
        type: 'character',
        action: 'move',
        startValue: startPos,
        endValue: endPos,
      },
      easing
    );
  }

  // Audio clips
  playAudio(startTime: number, audioId: string, volume = 1): this {
    return this.clip(startTime, startTime + 0.1, {
      type: 'audio',
      action: 'play',
      audioId,
      volume,
    });
  }

  fadeInAudio(startTime: number, endTime: number, audioId: string, volume = 1): this {
    return this.clip(startTime, endTime, {
      type: 'audio',
      action: 'fade_in',
      audioId,
      volume,
    });
  }

  fadeOutAudio(startTime: number, endTime: number, audioId: string): this {
    return this.clip(startTime, endTime, {
      type: 'audio',
      action: 'fade_out',
      audioId,
    });
  }

  // Subtitle clips
  subtitle(
    startTime: number,
    endTime: number,
    text: string,
    speaker?: string,
    style: 'normal' | 'thought' | 'shout' | 'whisper' = 'normal'
  ): this {
    return this.clip(startTime, endTime, {
      type: 'subtitle',
      text,
      speaker,
      style,
    });
  }

  // Event clips
  event(time: number, eventId: string, data?: unknown): this {
    return this.clip(time, time + 0.1, {
      type: 'event',
      eventId,
      eventData: data,
    });
  }

  // Fade clips
  fadeIn(startTime: number, endTime: number, color = '#000000'): this {
    return this.clip(startTime, endTime, {
      type: 'fade',
      fadeType: 'in',
      color,
    });
  }

  fadeOut(startTime: number, endTime: number, color = '#000000'): this {
    return this.clip(startTime, endTime, {
      type: 'fade',
      fadeType: 'out',
      color,
    });
  }

  // Build
  build(): CutsceneDefinition {
    if (!this.definition.id) throw new Error('Cutscene ID is required');
    if (!this.definition.name) throw new Error('Cutscene name is required');
    if (!this.definition.duration) throw new Error('Duration is required');

    return this.definition as CutsceneDefinition;
  }
}
