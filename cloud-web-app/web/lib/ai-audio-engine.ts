import {createComponentLogger, logger} from '@/lib/observability/logger'
import { assertAudibleVoiceBuffer } from '@/lib/audio/voice-waveform'
import { ContextTracker, EmotionAnalyzer } from './ai-audio-engine-analysis'
import { generateSfxChannels } from './ai-audio-engine-sfx'
import { createDefaultEmotion, createMusicStem, createNeutralEmotion, emotionToMusicParams, emotionToTags } from './ai-audio-engine-music'
import type {
  AmbientLayer,
  AudioAnalysisData,
  CharacterContext,
  EmotionalContext,
  FoleyEvent,
  InstrumentConfig,
  LipSyncData,
  LipSyncKeyframe,
  MusicComposition,
  MusicParameters,
  MusicStem,
  SceneContext,
  SFXParameters,
  VoiceProfile,
  VoiceRequest,
} from './ai-audio-engine-contracts'
export type {
  AmbientLayer,
  AudioAnalysisData,
  CharacterContext,
  EmotionalContext,
  FoleyEvent,
  InstrumentConfig,
  LipSyncData,
  LipSyncKeyframe,
  MusicComposition,
  MusicParameters,
  MusicStem,
  SceneContext,
  SFXParameters,
  VoiceProfile,
  VoiceRequest,
} from './ai-audio-engine-contracts'
export { ContextTracker, EmotionAnalyzer } from './ai-audio-engine-analysis'


const log = createComponentLogger('ai-audio-engine')
type EmotionSignal = keyof EmotionalContext;
type SfxMaterial = NonNullable<SFXParameters['material']>;

const SFX_MATERIALS = new Set<SfxMaterial>([
  'wood',
  'metal',
  'stone',
  'dirt',
  'grass',
  'water',
  'snow',
  'sand',
  'glass',
  'flesh',
  'cloth',
]);

/**
 * Audible formant voice (AUDIO-002) — never returns a zero-filled buffer.
 * Used when Bridge TTS is unavailable; lipsync receives real energy.
 */
export function synthesizeFormantVoiceBuffer(
  audioContext: BaseAudioContext,
  text: string,
  profile: VoiceProfile,
  emotion?: EmotionalContext,
): AudioBuffer {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordsPerSecond = Math.max(0.8, (profile.speed ?? 1) * 2.5);
  const duration = Math.max(0.35, words.length / wordsPerSecond);
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(duration * sampleRate);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  const baseF0 = 110 + (profile.pitch ?? 0.5) * 120;
  const intensity = Math.min(1, 0.35 + (emotion?.intensity ?? 0.4) * 0.4);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const wordIndex = Math.min(words.length - 1, Math.floor((t / duration) * words.length));
    const word = words[wordIndex] ?? 'a';
    const syllable = (word.charCodeAt(0) % 7) / 7;
    const f0 = baseF0 * (0.92 + syllable * 0.2);
    const formant1 = Math.sin(2 * Math.PI * f0 * t);
    const formant2 = Math.sin(2 * Math.PI * f0 * 2.2 * t) * 0.45;
    const formant3 = Math.sin(2 * Math.PI * f0 * 3.4 * t) * 0.2;
    const tremolo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 4.5 * t);
    const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, (t % (duration / Math.max(1, words.length))) / (duration / Math.max(1, words.length)))));
    const amp = intensity * tremolo * (0.25 + 0.75 * envelope);
    data[i] = (formant1 + formant2 + formant3) * amp * 0.35;
  }
  assertAudibleVoiceBuffer(data, 'synthesizeFormantVoiceBuffer');
  return buffer;
}


export class AIEmotionalAudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentContext: SceneContext | null = null;
  private emotionHistory: EmotionalContext[] = [];
  private currentComposition: MusicComposition | null = null;
  private stemPlayers = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
  private musicAnalyzer: AnalyserNode | null = null;
  private sfxPool: AudioBufferSourceNode[] = [];
  private ambientLayers = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
  private voiceQueue: VoiceRequest[] = [];
  private currentVoice: AudioBufferSourceNode | null = null;
  private emotionAnalyzer: EmotionAnalyzer;
  private contextTracker: ContextTracker;
  constructor() {
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.contextTracker = new ContextTracker();
  }
  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.musicAnalyzer = this.audioContext.createAnalyser();
    this.musicAnalyzer.fftSize = 2048;
    this.musicAnalyzer.connect(this.masterGain);
    log.info('[AIEmotionalAudio] Initialized');
  }
  dispose(): void {
    this.stopAllAudio();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
  updateSceneContext(context: SceneContext): void {
    const previousContext = this.currentContext;
    this.currentContext = context;
    this.emotionHistory.push(context.emotion);
    if (this.emotionHistory.length > 30) {
      this.emotionHistory.shift();
    }
    this.updateMusicForContext(context, previousContext);
    this.updateAmbientForContext(context);
    this.contextTracker.track(context);
    log.info('[AIEmotionalAudio] Context updated:', context.type, context.emotion);
  }
  analyzeScript(script: string): EmotionalContext {
    return this.emotionAnalyzer.analyzeText(script);
  }
  async analyzeVisual(imageData: ImageData | HTMLCanvasElement): Promise<EmotionalContext> {
    return this.emotionAnalyzer.analyzeVisual(imageData);
  }
  async generateMusic(params: Partial<MusicParameters>, emotion?: EmotionalContext): Promise<MusicComposition> {
    const context = emotion || this.currentContext?.emotion || createDefaultEmotion();
    const musicParams = emotionToMusicParams(context, params);
    const composition: MusicComposition = {
      id: `music-${Date.now()}`,
      name: `Generated Music - ${musicParams.genre}`,
      description: `AI-generated music based on emotional context`,
      parameters: musicParams,
      stems: [],
      duration: 120, // 2 minutos
      stingers: {}, // Stingers vazios por padrão
      emotionProfile: context,
      tags: emotionToTags(context),
    };
    for (const instrument of musicParams.instruments) {
      const stem = createMusicStem(instrument, context);
      composition.stems.push(stem);
    }
    return composition;
  }
  async playComposition(composition: MusicComposition, fadeInDuration = 2): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;
    if (this.currentComposition) {
      await this.fadeOutCurrentMusic(fadeInDuration);
    }
    this.currentComposition = composition;
    for (const stem of composition.stems) {
      if (stem.enabled) {
        await this.playStem(stem, fadeInDuration);
      }
    }
  }
  private updateMusicForContext(context: SceneContext, _previous: SceneContext | null): void {
    if (!this.currentComposition) return;
    for (const stem of this.currentComposition.stems) {
      const shouldEnable = this.shouldStemBeEnabled(stem, context);
      if (shouldEnable !== stem.enabled) {
        this.setStemEnabled(stem.id, shouldEnable);
      }
    }
  }
  private shouldStemBeEnabled(stem: MusicStem, context: SceneContext): boolean {
    if (!stem.conditions) return true;
    const { minIntensity, maxIntensity, emotions, events } = stem.conditions;
    if (minIntensity !== undefined && context.emotion.intensity < minIntensity) {
      return false;
    }
    if (maxIntensity !== undefined && context.emotion.intensity > maxIntensity) {
      return false;
    }
    if (emotions && emotions.length > 0) {
      const hasMatchingEmotion = emotions.some(e => {
        const emotionValue = this.readEmotionSignal(context.emotion, e);
        return emotionValue > 0.5;
      });
      if (!hasMatchingEmotion) return false;
    }
    if (events && events.length > 0) {
      const hasMatchingEvent = events.some(e => context.events.includes(e));
      if (!hasMatchingEvent) return false;
    }
    return true;
  }
  private readEmotionSignal(emotion: EmotionalContext, signal: string): number {
    if (!this.isEmotionSignal(signal)) {
      return 0;
    }

    return emotion[signal];
  }
  private isEmotionSignal(signal: string): signal is EmotionSignal {
    return signal in createNeutralEmotion();
  }
  private createNeutralEmotion(): EmotionalContext {
    return {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      trust: 0,
      anticipation: 0,
      intensity: 0,
      valence: 0,
      arousal: 0,
    };
  }
  setStemEnabled(stemId: string, enabled: boolean, fadeDuration = 0.5): void {
    const player = this.stemPlayers.get(stemId);
    if (!player || !this.audioContext) return;
    const targetVolume = enabled ? 1 : 0;
    player.gain.gain.linearRampToValueAtTime(
      targetVolume,
      this.audioContext.currentTime + fadeDuration
    );
    const stem = this.currentComposition?.stems.find(s => s.id === stemId);
    if (stem) {
      stem.enabled = enabled;
    }
  }
  private async playStem(stem: MusicStem, fadeIn: number): Promise<void> {
    if (!this.audioContext || !this.musicAnalyzer) return;
    let buffer = stem.audioBuffer;
    if (!buffer && stem.audioUrl) {
      buffer = await this.loadAudioBuffer(stem.audioUrl);
    }
    if (!buffer) {
      logger.warn(`[AIEmotionalAudio] No audio for stem: ${stem.id}`);
      return;
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.audioContext.createGain();
    gain.gain.value = 0;
    const panner = this.audioContext.createStereoPanner();
    panner.pan.value = stem.pan;
    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.musicAnalyzer);
    source.start();
    gain.gain.linearRampToValueAtTime(
      stem.volume,
      this.audioContext.currentTime + fadeIn
    );
    this.stemPlayers.set(stem.id, { source, gain });
  }
  private async fadeOutCurrentMusic(duration: number): Promise<void> {
    if (!this.audioContext) return;
    const promises: Promise<void>[] = [];
    for (const [_id, player] of this.stemPlayers) {
      player.gain.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + duration
      );
      promises.push(new Promise(resolve => {
        setTimeout(() => {
          player.source.stop();
          player.source.disconnect();
          player.gain.disconnect();
          resolve();
        }, duration * 1000);
      }));
    }
    await Promise.all(promises);
    this.stemPlayers.clear();
  }
  async generateSFX(params: SFXParameters): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(params.duration * sampleRate);
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);
    generateSfxChannels(leftChannel, rightChannel, params, sampleRate);
    return buffer;
  }
  async processFoleyEvent(event: FoleyEvent): Promise<void> {
    const sfxParams: SFXParameters = {
      category: 'footstep',
      material: this.toSfxMaterial(event.material),
      size: 'medium',
      intensity: event.velocity,
      distance: 1,
      duration: 0.2,
      pitchVariation: 0.1,
      reverb: 0.3,
      spatial: true,
      position: event.position,
    };
    switch (event.type) {
      case 'footstep':
        sfxParams.category = 'footstep';
        sfxParams.duration = 0.15 + event.weight * 0.1;
        break;
      case 'cloth':
        sfxParams.category = 'foley';
        sfxParams.duration = 0.1;
        sfxParams.intensity *= 0.3;
        break;
      case 'impact':
        sfxParams.category = 'impact';
        sfxParams.duration = 0.2 + event.weight * 0.2;
        break;
    }
    const buffer = await this.generateSFX(sfxParams);
    this.playSFX(buffer, sfxParams);
  }
  private toSfxMaterial(material: string): SfxMaterial | undefined {
    return SFX_MATERIALS.has(material as SfxMaterial) ? (material as SfxMaterial) : undefined;
  }
  async generateVoice(text: string, profile: VoiceProfile, emotion?: EmotionalContext): Promise<AudioBuffer> {
    log.info(`[AIEmotionalAudio] Generating voice: "${text}" with emotion:`, emotion);
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Prefer Bridge/HTTP TTS when available (Plan B speech — #64). Fail soft to local formant synth.
    try {
      const remote = await this.fetchBridgeVoiceBuffer(text, profile);
      if (remote && remote.duration > 0.05) {
        return remote;
      }
    } catch (error) {
      log.warn('[AIEmotionalAudio] Bridge TTS unavailable — using audible formant synth', error);
    }

    return synthesizeFormantVoiceBuffer(this.audioContext, text, profile, emotion);
  }

  /** Decode `/api/ai/voice/generate` audio when session/provider allows; else null. */
  private async fetchBridgeVoiceBuffer(
    text: string,
    profile: VoiceProfile,
  ): Promise<AudioBuffer | null> {
    if (typeof fetch !== 'function') return null;
    const response = await fetch('/api/ai/voice/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: profile.id ?? profile.name ?? 'default',
        provider: 'auto',
      }),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = (await response.json()) as { audioUrl?: string; audioBase64?: string };
      if (json.audioUrl) {
        const audioRes = await fetch(json.audioUrl);
        if (!audioRes.ok) return null;
        const ab = await audioRes.arrayBuffer();
        return this.audioContext!.decodeAudioData(ab.slice(0));
      }
      if (json.audioBase64) {
        const binary = atob(json.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return this.audioContext!.decodeAudioData(bytes.buffer.slice(0));
      }
      return null;
    }
    const ab = await response.arrayBuffer();
    if (ab.byteLength < 64) return null;
    return this.audioContext!.decodeAudioData(ab.slice(0));
  }
  async generateLipSync(audioBuffer: AudioBuffer): Promise<LipSyncData> {
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const frameRate = 60;
    const frameCount = Math.floor(duration * frameRate);
    const keyframes: LipSyncKeyframe[] = [];
    for (let i = 0; i < frameCount; i++) {
      const time = i / frameRate;
      const sampleIndex = Math.floor(time * sampleRate);
      const windowSize = Math.floor(sampleRate / frameRate);
      let energy = 0;
      const channelData = audioBuffer.getChannelData(0);
      for (let j = 0; j < windowSize && sampleIndex + j < channelData.length; j++) {
        energy += Math.abs(channelData[sampleIndex + j]);
      }
      energy /= windowSize;
      const viseme = this.energyToViseme(energy);
      keyframes.push({
        time,
        viseme,
        weight: Math.min(energy * 10, 1),
      });
    }
    return {
      duration,
      frameRate,
      keyframes,
    };
  }
  private energyToViseme(energy: number): string {
    if (energy < 0.01) return 'sil'; // Silence
    if (energy < 0.05) return 'PP'; // p, b, m
    if (energy < 0.1) return 'FF'; // f, v
    if (energy < 0.2) return 'TH'; // th
    if (energy < 0.3) return 'DD'; // t, d
    if (energy < 0.4) return 'kk'; // k, g
    if (energy < 0.5) return 'CH'; // ch, j, sh
    if (energy < 0.6) return 'SS'; // s, z
    if (energy < 0.7) return 'nn'; // n, l
    if (energy < 0.8) return 'RR'; // r
    return 'aa'; // Open vowel
  }
  async loadAmbientLayer(layer: AmbientLayer): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;
    let buffer: AudioBuffer | undefined;
    if (layer.audioUrl) {
      buffer = await this.loadAudioBuffer(layer.audioUrl);
    } else if (layer.audioBuffer) {
      buffer = layer.audioBuffer;
    }
    if (!buffer) {
      logger.warn(`[AIEmotionalAudio] No audio for ambient layer: ${layer.id}`);
      return;
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = layer.mode === 'loop';
    const gain = this.audioContext.createGain();
    gain.gain.value = layer.baseVolume;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    this.ambientLayers.set(layer.id, { source, gain });
  }
  private updateAmbientForContext(context: SceneContext): void {
    for (const [_id, layer] of this.ambientLayers) {
    }
  }
  removeAmbientLayer(layerId: string): void {
    const layer = this.ambientLayers.get(layerId);
    if (layer) {
      layer.source.stop();
      layer.source.disconnect();
      layer.gain.disconnect();
      this.ambientLayers.delete(layerId);
    }
  }
  playSFX(buffer: AudioBuffer, params?: Partial<SFXParameters>): string {
    if (!this.audioContext || !this.masterGain) {
      return '';
    }
    const id = `sfx-${Date.now()}`;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const gain = this.audioContext.createGain();
    gain.gain.value = params?.intensity || 1;
    if (params?.spatial && params.position) {
      const panner = this.audioContext.createPanner();
      panner.setPosition(params.position.x, params.position.y, params.position.z);
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = params.distance || 100;
      source.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      source.connect(gain);
      gain.connect(this.masterGain);
    }
    source.start();
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    return id;
  }
  stopAllAudio(): void {
    for (const [_id, player] of this.stemPlayers) {
      player.source.stop();
      player.source.disconnect();
      player.gain.disconnect();
    }
    this.stemPlayers.clear();
    for (const [_id, layer] of this.ambientLayers) {
      layer.source.stop();
      layer.source.disconnect();
      layer.gain.disconnect();
    }
    this.ambientLayers.clear();
    if (this.currentVoice) {
      this.currentVoice.stop();
      this.currentVoice = null;
    }
  }
  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }
  getAnalysisData(): AudioAnalysisData {
    if (!this.musicAnalyzer) {
      return { frequencyData: new Uint8Array(0), timeData: new Uint8Array(0) };
    }
    const frequencyData = new Uint8Array(this.musicAnalyzer.frequencyBinCount);
    const timeData = new Uint8Array(this.musicAnalyzer.frequencyBinCount);
    this.musicAnalyzer.getByteFrequencyData(frequencyData);
    this.musicAnalyzer.getByteTimeDomainData(timeData);
    return { frequencyData, timeData };
  }
}
let _instance: AIEmotionalAudioSystem | null = null;
export function getAIEmotionalAudioSystem(): AIEmotionalAudioSystem {
  if (!_instance) {
    _instance = new AIEmotionalAudioSystem();
  }
  return _instance;
}
export default AIEmotionalAudioSystem;
