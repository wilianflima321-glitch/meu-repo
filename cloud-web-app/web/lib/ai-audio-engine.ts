import {createComponentLogger, logger} from '@/lib/observability/logger'
import { ContextTracker, EmotionAnalyzer } from './ai-audio-engine-analysis'
import { generateSfxChannels } from './ai-audio-engine-sfx'
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
    const context = emotion || this.currentContext?.emotion || this.getDefaultEmotion();
    const musicParams = this.emotionToMusicParams(context, params);
    const composition: MusicComposition = {
      id: `music-${Date.now()}`,
      name: `Generated Music - ${musicParams.genre}`,
      description: `AI-generated music based on emotional context`,
      parameters: musicParams,
      stems: [],
      duration: 120, // 2 minutos
      stingers: {}, // Stingers vazios por padrão
      emotionProfile: context,
      tags: this.emotionToTags(context),
    };
    for (const instrument of musicParams.instruments) {
      const stem = await this.generateMusicStem(instrument, musicParams, context);
      composition.stems.push(stem);
    }
    return composition;
  }
  private emotionToMusicParams(emotion: EmotionalContext, override: Partial<MusicParameters>): MusicParameters {
    const tempo = this.mapRange(emotion.arousal, 0, 1, 60, 140);
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
    const instruments = this.getInstrumentationForEmotion(emotion, genre);
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
  private getInstrumentationForEmotion(emotion: EmotionalContext, genre: string): InstrumentConfig[] {
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
  private async generateMusicStem(
    instrument: InstrumentConfig,
    params: MusicParameters,
    emotion: EmotionalContext
  ): Promise<MusicStem> {
    return {
      id: `stem-${instrument.type}-${Date.now()}`,
      name: instrument.type,
      category: this.instrumentToCategory(instrument.family),
      volume: instrument.volume,
      pan: instrument.pan,
      enabled: instrument.enabled,
      conditions: {
        minIntensity: emotion.intensity > 0.5 ? 0.5 : 0,
        maxIntensity: 1,
      },
    };
  }
  private instrumentToCategory(family: string): MusicStem['category'] {
    switch (family) {
      case 'strings':
      case 'woodwind':
        return 'melody';
      case 'keys':
        return 'harmony';
      case 'percussion':
        return 'drums';
      case 'synth':
        return 'ambient';
      default:
        return 'fx';
    }
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
    return signal in this.createNeutralEmotion();
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
    const wordsPerSecond = profile.speed * 2.5;
    const wordCount = text.split(/\s+/).length;
    const duration = wordCount / wordsPerSecond;
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    return buffer;
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
  private getDefaultEmotion(): EmotionalContext {
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
  private emotionToTags(emotion: EmotionalContext): string[] {
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
  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
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
