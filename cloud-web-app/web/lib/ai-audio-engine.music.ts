import type { EmotionalContext, InstrumentConfig, MusicParameters } from './ai-audio-engine.types';

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export function getDefaultEmotion(): EmotionalContext {
  return {
    joy: 0.5,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    trust: 0.5,
    anticipation: 0.3,
    intensity: 0.5,
    valence: 0.3,
    arousal: 0.4,
  };
}

export function emotionToTags(emotion: EmotionalContext): string[] {
  const tags: string[] = [];

  if (emotion.joy > 0.5) tags.push('happy', 'uplifting');
  if (emotion.sadness > 0.5) tags.push('sad', 'melancholic');
  if (emotion.anger > 0.5) tags.push('intense', 'aggressive');
  if (emotion.fear > 0.5) tags.push('tense', 'scary');
  if (emotion.surprise > 0.5) tags.push('dramatic', 'unexpected');
  if (emotion.anticipation > 0.5) tags.push('building', 'suspenseful');

  if (emotion.valence > 0.3) tags.push('positive');
  else if (emotion.valence < -0.3) tags.push('negative');

  if (emotion.arousal > 0.6) tags.push('energetic');
  else if (emotion.arousal < 0.4) tags.push('calm');

  return tags;
}

export function getInstrumentationForEmotion(emotion: EmotionalContext, genre: string): InstrumentConfig[] {
  const instruments: InstrumentConfig[] = [];

  if (genre === 'orchestral' || genre === 'hybrid') {
    instruments.push({
      type: 'strings',
      family: 'strings',
      volume: 0.7,
      pan: 0,
      enabled: true,
    });
  }

  if (emotion.sadness > 0.5) {
    instruments.push({
      type: 'cello',
      family: 'strings',
      volume: 0.6,
      pan: -0.2,
      enabled: true,
    });
    instruments.push({
      type: 'piano',
      family: 'keys',
      volume: 0.5,
      pan: 0.1,
      enabled: true,
    });
  }

  if (emotion.joy > 0.5) {
    instruments.push({
      type: 'brass',
      family: 'brass',
      volume: 0.5,
      pan: 0.3,
      enabled: true,
    });
  }

  if (emotion.anger > 0.5 || emotion.fear > 0.5) {
    instruments.push({
      type: 'percussion',
      family: 'percussion',
      volume: 0.8,
      pan: 0,
      enabled: true,
    });
    instruments.push({
      type: 'synth_bass',
      family: 'synth',
      volume: 0.7,
      pan: 0,
      enabled: true,
    });
  }

  if (emotion.anticipation > 0.5) {
    instruments.push({
      type: 'timpani',
      family: 'percussion',
      volume: 0.4,
      pan: 0,
      enabled: true,
    });
  }

  if (genre === 'ambient' || emotion.trust > 0.5) {
    instruments.push({
      type: 'pad',
      family: 'synth',
      volume: 0.4,
      pan: 0,
      enabled: true,
      filter: {
        type: 'lowpass',
        frequency: 2000,
        resonance: 0.3,
      },
    });
  }

  return instruments;
}

export function emotionToMusicParams(
  emotion: EmotionalContext,
  override: Partial<MusicParameters>
): MusicParameters {
  const tempo = mapRange(emotion.arousal, 0, 1, 60, 140);
  const mode: MusicParameters['mode'] = emotion.valence > 0 ? 'major' : 'minor';

  let genre: MusicParameters['genre'] = 'orchestral';
  if (emotion.fear > 0.5 || emotion.anger > 0.5) {
    genre = 'hybrid';
  } else if (emotion.joy > 0.6) {
    genre = emotion.arousal > 0.5 ? 'electronic' : 'folk';
  } else if (emotion.sadness > 0.5) {
    genre = 'ambient';
  }

  let dynamics: MusicParameters['dynamics'] = 'mf';
  if (emotion.intensity < 0.3) dynamics = 'p';
  else if (emotion.intensity < 0.5) dynamics = 'mp';
  else if (emotion.intensity < 0.7) dynamics = 'mf';
  else if (emotion.intensity < 0.9) dynamics = 'f';
  else dynamics = 'ff';

  const instruments = getInstrumentationForEmotion(emotion, genre);

  return {
    genre,
    tempo: Math.round(tempo),
    key: emotion.valence > 0 ? 'C major' : 'A minor',
    mode,
    instruments,
    dynamics,
    articulation: emotion.arousal > 0.6 ? 'staccato' : 'legato',
    texture: emotion.intensity < 0.4 ? 'sparse' : emotion.intensity > 0.7 ? 'dense' : 'medium',
    repetition: 0.5,
    variation: emotion.surprise * 0.5 + 0.3,
    ...override,
  };
}
