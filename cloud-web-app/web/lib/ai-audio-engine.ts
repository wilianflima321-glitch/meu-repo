export interface EmotionalContext {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  trust: number;
  anticipation: number;
  intensity: number;
  valence: number;
  arousal: number;
}
export interface SceneContext {
  type: 'combat' | 'exploration' | 'dialogue' | 'cutscene' | 'puzzle' | 'stealth' | 'chase' | 'boss' | 'victory' | 'defeat' | 'menu' | 'custom';
  environment: 'interior' | 'exterior' | 'underwater' | 'space' | 'cave' | 'forest' | 'city' | 'desert' | 'snow' | 'custom';
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  weather: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  emotion: EmotionalContext;
  characters: CharacterContext[];
  events: string[];
  metadata: Record<string, any>;
}
export interface CharacterContext {
  id: string;
  name: string;
  role: 'player' | 'ally' | 'enemy' | 'npc' | 'narrator';
  emotion: EmotionalContext;
  position?: { x: number; y: number; z: number };
  voiceProfile?: VoiceProfile;
}
export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  age: 'child' | 'young' | 'adult' | 'elderly';
  accent?: string;
  pitch: number;      // -12 to +12 semitones
  speed: number;      // 0.5 to 2.0
  breathiness: number; // 0-1
  roughness: number;  // 0-1
  emotionMod: {
    joyPitchMod: number;
    sadnessPitchMod: number;
    angerSpeedMod: number;
    fearBreathMod: number;
  };
}
export interface MusicParameters {
  genre: 'orchestral' | 'electronic' | 'ambient' | 'rock' | 'jazz' | 'folk' | 'world' | 'hybrid';
  tempo: number;
  key: string;           // e.g., "C major", "A minor"
  mode: 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian';
  instruments: InstrumentConfig[];
  dynamics: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
  articulation: 'legato' | 'staccato' | 'marcato' | 'tenuto' | 'accent';
  texture: 'sparse' | 'medium' | 'dense';
  repetition: number;    // 0-1
  variation: number;     // 0-1
}
export interface InstrumentConfig {
  type: string;          // e.g., "strings", "brass", "synth"
  family: 'strings' | 'brass' | 'woodwind' | 'percussion' | 'keys' | 'synth' | 'vocal' | 'other';
  volume: number;
  pan: number;
  enabled: boolean;
  layer?: string;
  filter?: {
    type: 'lowpass' | 'highpass' | 'bandpass';
    frequency: number;
    resonance: number;
  };
}
export interface MusicStem {
  id: string;
  name: string;
  category: 'melody' | 'harmony' | 'bass' | 'drums' | 'percussion' | 'ambient' | 'fx';
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  volume: number;
  pan: number;
  enabled: boolean;
  conditions?: {
    minIntensity?: number;
    maxIntensity?: number;
    emotions?: string[];
    events?: string[];
  };
}
export interface MusicComposition {
  id: string;
  name: string;
  description: string;
  parameters: MusicParameters;
  stems: MusicStem[];
  duration: number;
  loopStart?: number;
  loopEnd?: number;
  stingers: {
    start?: string;
    end?: string;
    victory?: string;
    defeat?: string;
    custom?: Record<string, string>;
  };
  emotionProfile: EmotionalContext;
  tags: string[];
}
export interface SFXParameters {
  category: 'footstep' | 'impact' | 'weapon' | 'explosion' | 'ambient' | 'ui' | 'foley' | 'creature' | 'vehicle' | 'magic' | 'custom';
  material?: 'wood' | 'metal' | 'stone' | 'dirt' | 'grass' | 'water' | 'snow' | 'sand' | 'glass' | 'flesh' | 'cloth';
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  intensity: number;     // 0-1
  distance: number;      // metros
  duration: number;      // segundos
  pitchVariation: number; // 0-1
  reverb: number;        // 0-1
  spatial: boolean;
  position?: { x: number; y: number; z: number };
}
export interface FoleyEvent {
  id: string;
  type: 'footstep' | 'cloth' | 'impact' | 'handle' | 'gesture' | 'breath' | 'custom';
  source: string;
  material: string;
  velocity: number;
  weight: number;
  timestamp: number;
  position?: { x: number; y: number; z: number };
}
export interface AmbientLayer {
  id: string;
  name: string;
  category: 'background' | 'weather' | 'wildlife' | 'urban' | 'indoor' | 'mechanical';
  mode: 'loop' | 'events';
  baseVolume: number;
  contextModulation: {
    timeOfDay: Record<string, number>;  // volume por período
    weather: Record<string, number>;    // volume por clima
    intensity: { min: number; max: number }; // range por intensidade da cena
  };
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  spatial?: {
    enabled: boolean;
    minDistance: number;
    maxDistance: number;
    positions?: { x: number; y: number; z: number }[];
  };
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
    console.log('[AIEmotionalAudio] Initialized');
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
    console.log('[AIEmotionalAudio] Context updated:', context.type, context.emotion);
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
        const emotionValue = (context.emotion as any)[e];
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
      console.warn(`[AIEmotionalAudio] No audio for stem: ${stem.id}`);
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
    switch (params.category) {
      case 'footstep':
        this.generateFootstepSFX(leftChannel, rightChannel, params);
        break;
      case 'impact':
        this.generateImpactSFX(leftChannel, rightChannel, params);
        break;
      case 'explosion':
        this.generateExplosionSFX(leftChannel, rightChannel, params);
        break;
      case 'ambient':
        this.generateAmbientSFX(leftChannel, rightChannel, params);
        break;
      case 'weapon':
        this.generateWeaponSFX(leftChannel, rightChannel, params);
        break;
      case 'magic':
        this.generateMagicSFX(leftChannel, rightChannel, params);
        break;
      default:
        this.generateGenericSFX(leftChannel, rightChannel, params);
    }
    return buffer;
  }
  private generateFootstepSFX(left: Float32Array, right: Float32Array, params: SFXParameters): void {
    const sampleRate = this.audioContext!.sampleRate;
    const length = left.length;
    let attack = 0.005;
    let decay = 0.1;
    let frequency = 200;
    let noiseAmount = 0.5;
    switch (params.material) {
      case 'wood':
        attack = 0.002;
        decay = 0.08;
        frequency = 300;
        noiseAmount = 0.3;
        break;
      case 'metal':
        attack = 0.001;
        decay = 0.15;
        frequency = 800;
        noiseAmount = 0.2;
        break;
      case 'stone':
        attack = 0.003;
        decay = 0.05;
        frequency = 400;
        noiseAmount = 0.6;
        break;
      case 'grass':
        attack = 0.01;
        decay = 0.1;
        frequency = 100;
        noiseAmount = 0.8;
        break;
      case 'water':
        attack = 0.01;
        decay = 0.2;
        frequency = 150;
        noiseAmount = 0.9;
        break;
      case 'snow':
        attack = 0.02;
        decay = 0.15;
        frequency = 80;
        noiseAmount = 0.7;
        break;
    }
    const intensityMod = params.intensity || 0.5;
    decay *= (1 + intensityMod);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let envelope = 0;
      if (t < attack) {
        envelope = t / attack;
      } else if (t < attack + decay) {
        envelope = 1 - ((t - attack) / decay);
      }
      envelope = Math.pow(envelope, 2);
      const tonal = Math.sin(2 * Math.PI * frequency * t) * (1 - noiseAmount);
      const noise = (Math.random() * 2 - 1) * noiseAmount;
      const pitchVar = 1 + (Math.random() - 0.5) * params.pitchVariation;
      const sample = (tonal + noise) * envelope * intensityMod * pitchVar;
      left[i] = sample;
      right[i] = sample * (0.9 + Math.random() * 0.2); // Slight stereo variation
    }
  }
  private generateImpactSFX(left: Float32Array, right: Float32Array, params: SFXParameters): void {
    const sampleRate = this.audioContext!.sampleRate;
    const length = left.length;
    const intensityMod = params.intensity || 0.5;
    const sizeMultiplier = this.sizeToMultiplier(params.size);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20 / sizeMultiplier) * intensityMod;
      const low = Math.sin(2 * Math.PI * 60 * sizeMultiplier * t);
      const mid = Math.sin(2 * Math.PI * 200 * t) * 0.5;
      const high = Math.sin(2 * Math.PI * 800 * t) * 0.3;
      const transient = i < sampleRate * 0.01 ? (Math.random() * 2 - 1) * 0.5 : 0;
      const sample = (low + mid + high + transient) * envelope;
      left[i] = sample;
      right[i] = sample;
    }
  }
  private generateExplosionSFX(left: Float32Array, right: Float32Array, params: SFXParameters): void {
    const sampleRate = this.audioContext!.sampleRate;
    const length = left.length;
    const intensityMod = params.intensity || 0.8;
    const sizeMultiplier = this.sizeToMultiplier(params.size);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let envelope: number;
      if (t < 0.02) {
        envelope = t / 0.02;
      } else {
        envelope = Math.exp(-(t - 0.02) * 3 / sizeMultiplier);
      }
      const rumble = Math.sin(2 * Math.PI * 30 * sizeMultiplier * t) * 0.6;
      const crackle = (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.4;
      const debris = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.3;
      const sample = (rumble + crackle + debris) * envelope * intensityMod;
      left[i] = sample;
      right[i] = sample * (0.95 + Math.random() * 0.1);
    }
  }
  private generateAmbientSFX(left: Float32Array, right: Float32Array, params: SFXParameters): void {
    const sampleRate = this.audioContext!.sampleRate;
    const length = left.length;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const lfo = Math.sin(2 * Math.PI * 0.1 * t) * 0.5 + 0.5;
      const noise = (Math.random() * 2 - 1) * 0.3;
      let envelope = 1;
      const fadeTime = 0.5;
      if (t < fadeTime) {
        envelope = t / fadeTime;
      } else if (t > params.duration - fadeTime) {
        envelope = (params.duration - t) / fadeTime;
      }
      const sample = noise * lfo * envelope * (params.intensity || 0.5);
      left[i] = sample;
      right[i] = sample * (0.8 + Math.random() * 0.4);
    }
  }
  private generateWeaponSFX(left: Float32Array, right: Float32Array, params: SFXParameters): void {
    const sampleRate = this.audioContext!.sampleRate;
    const length = left.length;
    const intensityMod = params.intensity || 0.9;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30) * intensityMod;
      const crack = i < sampleRate * 0.002 ? (Math.random() * 2 - 1) : 0;
      const body = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t * 15);
      const tail = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.2;
      const sample = (crack + body + tail) * envelope;
      left[i] = sample;
      right[i] = sample;
    }
  }
  private generateMagicSFX(left: Float32Array, right: Float32Array, params: SFXParameters): void {
    const sampleRate = this.audioContext!.sampleRate;
    const length = left.length;
    const intensityMod = params.intensity || 0.7;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / params.duration) * intensityMod;
      const pitchSweep = 200 + Math.sin(Math.PI * t / params.duration) * 600;
      const tone1 = Math.sin(2 * Math.PI * pitchSweep * t);
      const tone2 = Math.sin(2 * Math.PI * pitchSweep * 1.5 * t) * 0.5;
      const tone3 = Math.sin(2 * Math.PI * pitchSweep * 2 * t) * 0.25;
      const shimmer = Math.sin(2 * Math.PI * 2000 * t) * Math.sin(2 * Math.PI * 5 * t) * 0.1;
      const sample = (tone1 + tone2 + tone3 + shimmer) * envelope;
      const spread = Math.sin(2 * Math.PI * 2 * t) * 0.5;
      left[i] = sample * (1 - spread * 0.3);
      right[i] = sample * (1 + spread * 0.3);
    }
  }
  private generateGenericSFX(left: Float32Array, right: Float32Array, params: SFXParameters): void {
    const sampleRate = this.audioContext!.sampleRate;
    const length = left.length;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5) * (params.intensity || 0.5);
      const noise = (Math.random() * 2 - 1);
      const sample = noise * envelope;
      left[i] = sample;
      right[i] = sample;
    }
  }
  private sizeToMultiplier(size: string): number {
    switch (size) {
      case 'tiny': return 0.3;
      case 'small': return 0.6;
      case 'medium': return 1;
      case 'large': return 1.5;
      case 'huge': return 2.5;
      default: return 1;
    }
  }
  async processFoleyEvent(event: FoleyEvent): Promise<void> {
    const sfxParams: SFXParameters = {
      category: 'footstep',
      material: event.material as any,
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
  async generateVoice(text: string, profile: VoiceProfile, emotion?: EmotionalContext): Promise<AudioBuffer> {
    console.log(`[AIEmotionalAudio] Generating voice: "${text}" with emotion:`, emotion);
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
      console.warn(`[AIEmotionalAudio] No audio for ambient layer: ${layer.id}`);
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
export class EmotionAnalyzer {
  private emotionKeywords: Record<string, string[]> = {
    joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'love', 'celebrate', 'triumph'],
    sadness: ['sad', 'cry', 'tears', 'loss', 'grief', 'mourn', 'lonely', 'heartbreak'],
    anger: ['angry', 'rage', 'fury', 'hate', 'violent', 'attack', 'destroy', 'revenge'],
    fear: ['scared', 'afraid', 'terror', 'horror', 'panic', 'dread', 'danger', 'threat'],
    surprise: ['surprise', 'shock', 'unexpected', 'sudden', 'reveal', 'discover', 'twist'],
    anticipation: ['wait', 'expect', 'building', 'tension', 'suspense', 'approaching', 'imminent'],
  };
  analyzeText(text: string): EmotionalContext {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const scores: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      anticipation: 0,
    };
    for (const word of words) {
      for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
        if (keywords.some(kw => word.includes(kw))) {
          scores[emotion]++;
        }
      }
    }
    const maxScore = Math.max(...Object.values(scores), 1);
    for (const emotion of Object.keys(scores)) {
      scores[emotion] /= maxScore;
    }
    const valence = (scores.joy - scores.sadness - scores.anger - scores.fear) / 2;
    const arousal = (scores.anger + scores.fear + scores.surprise + scores.anticipation) / 4;
    const intensity = Math.max(...Object.values(scores));
    return {
      joy: scores.joy,
      sadness: scores.sadness,
      anger: scores.anger,
      fear: scores.fear,
      surprise: scores.surprise,
      disgust: 0,
      trust: 1 - scores.fear,
      anticipation: scores.anticipation,
      intensity,
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
    };
  }
  async analyzeVisual(_imageData: ImageData | HTMLCanvasElement): Promise<EmotionalContext> {
    return {
      joy: 0.3,
      sadness: 0.1,
      anger: 0,
      fear: 0,
      surprise: 0.1,
      disgust: 0,
      trust: 0.5,
      anticipation: 0.2,
      intensity: 0.3,
      valence: 0.2,
      arousal: 0.3,
    };
  }
}
export class ContextTracker {
  private history: SceneContext[] = [];
  private listeners: ((context: SceneContext) => void)[] = [];
  track(context: SceneContext): void {
    this.history.push(context);
    if (this.history.length > 60) {
      this.history.shift();
    }
    for (const listener of this.listeners) {
      listener(context);
    }
  }
  onContextChange(callback: (context: SceneContext) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  getAverageEmotion(): EmotionalContext {
    if (this.history.length === 0) {
      return {
        joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0,
        disgust: 0, trust: 0, anticipation: 0,
        intensity: 0, valence: 0, arousal: 0,
      };
    }
    const sum: EmotionalContext = {
      joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0,
      disgust: 0, trust: 0, anticipation: 0,
      intensity: 0, valence: 0, arousal: 0,
    };
    for (const ctx of this.history) {
      for (const key of Object.keys(sum) as (keyof EmotionalContext)[]) {
        sum[key] += ctx.emotion[key];
      }
    }
    for (const key of Object.keys(sum) as (keyof EmotionalContext)[]) {
      sum[key] /= this.history.length;
    }
    return sum;
  }
}
interface VoiceRequest {
  text: string;
  profile: VoiceProfile;
  emotion?: EmotionalContext;
  priority: number;
}
interface LipSyncData {
  duration: number;
  frameRate: number;
  keyframes: LipSyncKeyframe[];
}
interface LipSyncKeyframe {
  time: number;
  viseme: string;
  weight: number;
}
interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
}
let _instance: AIEmotionalAudioSystem | null = null;
export function getAIEmotionalAudioSystem(): AIEmotionalAudioSystem {
  if (!_instance) {
    _instance = new AIEmotionalAudioSystem();
  }
  return _instance;
}
export default AIEmotionalAudioSystem;
