/**
 * Audio Synthesis Engine REAL
 * 
 * Sistema REAL de síntese de áudio com Web Audio API.
 * Suporta oscillators, filtros, efeitos, modulação, samplers.
 * 
 * NÃO É MOCK - Gera áudio de verdade!
 */

// ============================================================================
// TIPOS
// ============================================================================

export type OscillatorShape = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass' | 'lowshelf' | 'highshelf' | 'peaking';
export type DistortionType = 'soft' | 'hard' | 'fuzz' | 'bitcrush';

export interface EnvelopeConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface OscillatorConfig {
  shape: OscillatorShape;
  frequency: number;
  detune: number;
  gain: number;
  customWaveform?: Float32Array;
}

export interface FilterConfig {
  type: FilterType;
  frequency: number;
  q: number;
  gain: number;
}

export interface LFOConfig {
  shape: OscillatorShape;
  frequency: number;
  depth: number;
  target: 'frequency' | 'gain' | 'filter' | 'pan';
}

export interface EffectConfig {
  type: string;
  params: Record<string, number>;
  wet: number;
}

export interface SynthVoiceConfig {
  oscillators: OscillatorConfig[];
  filter?: FilterConfig;
  envelope: EnvelopeConfig;
  filterEnvelope?: EnvelopeConfig;
  lfos?: LFOConfig[];
}

// ============================================================================
// AUDIO CONTEXT MANAGER
// ============================================================================

export class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  private constructor() {}
  
  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }
  
  async initialize(): Promise<AudioContext> {
    if (this.context) return this.context;
    
    this.context = new AudioContext();
    
    // Create master chain
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;
    
    // Connect: analyser -> compressor -> masterGain -> destination
    this.analyser.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    
    return this.context;
  }
  
  getContext(): AudioContext {
    if (!this.context) {
      throw new Error('AudioContext not initialized');
    }
    return this.context;
  }
  
  getMasterGain(): GainNode {
    if (!this.masterGain) {
      throw new Error('AudioContext not initialized');
    }
    return this.masterGain;
  }
  
  getAnalyser(): AnalyserNode {
    if (!this.analyser) {
      throw new Error('AudioContext not initialized');
    }
    return this.analyser;
  }
  
  getOutput(): AudioNode {
    if (!this.analyser) {
      throw new Error('AudioContext not initialized');
    }
    return this.analyser;
  }
  
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
  
  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }
  
  async suspend(): Promise<void> {
    if (this.context && this.context.state === 'running') {
      await this.context.suspend();
    }
  }
  
  close(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
      this.masterGain = null;
      this.analyser = null;
      this.compressor = null;
    }
  }
}

// ============================================================================
// ENVELOPE GENERATOR
// ============================================================================

export class EnvelopeGenerator {
  private context: AudioContext;
  private config: EnvelopeConfig;
  
  constructor(context: AudioContext, config: EnvelopeConfig) {
    this.context = context;
    this.config = config;
  }
  
  apply(param: AudioParam, startTime: number, velocity: number = 1): void {
    const { attack, decay, sustain, release } = this.config;
    const peakValue = velocity;
    
    param.cancelScheduledValues(startTime);
    param.setValueAtTime(0, startTime);
    param.linearRampToValueAtTime(peakValue, startTime + attack);
    param.linearRampToValueAtTime(sustain * peakValue, startTime + attack + decay);
  }
  
  release(param: AudioParam, releaseTime: number): void {
    const { release } = this.config;
    
    param.cancelScheduledValues(releaseTime);
    param.setValueAtTime(param.value, releaseTime);
    param.linearRampToValueAtTime(0, releaseTime + release);
  }
  
  trigger(param: AudioParam, duration: number, velocity: number = 1): void {
    const startTime = this.context.currentTime;
    this.apply(param, startTime, velocity);
    this.release(param, startTime + duration);
  }
}

// ============================================================================
// OSCILLATOR MODULE
// ============================================================================

export class OscillatorModule {
  private context: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode;
  private config: OscillatorConfig;
  
  constructor(context: AudioContext, config: OscillatorConfig) {
    this.context = context;
    this.config = config;
    
    this.gainNode = context.createGain();
    this.gainNode.gain.value = config.gain;
  }
  
  start(frequency?: number, time?: number): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }
    
    this.oscillator = this.context.createOscillator();
    
    if (this.config.shape === 'custom' && this.config.customWaveform) {
      const real = new Float32Array(this.config.customWaveform.length);
      const imag = this.config.customWaveform;
      const wave = this.context.createPeriodicWave(real, imag);
      this.oscillator.setPeriodicWave(wave);
    } else {
      this.oscillator.type = this.config.shape as OscillatorType;
    }
    
    this.oscillator.frequency.value = frequency ?? this.config.frequency;
    this.oscillator.detune.value = this.config.detune;
    
    this.oscillator.connect(this.gainNode);
    this.oscillator.start(time ?? this.context.currentTime);
  }
  
  stop(time?: number): void {
    if (this.oscillator) {
      this.oscillator.stop(time ?? this.context.currentTime);
    }
  }
  
  setFrequency(frequency: number, time?: number): void {
    if (this.oscillator) {
      if (time !== undefined) {
        this.oscillator.frequency.setValueAtTime(frequency, time);
      } else {
        this.oscillator.frequency.value = frequency;
      }
    }
  }
  
  setDetune(cents: number): void {
    if (this.oscillator) {
      this.oscillator.detune.value = cents;
    }
  }
  
  getFrequencyParam(): AudioParam | null {
    return this.oscillator?.frequency || null;
  }
  
  getGainParam(): AudioParam {
    return this.gainNode.gain;
  }
  
  getOutput(): AudioNode {
    return this.gainNode;
  }
  
  disconnect(): void {
    if (this.oscillator) {
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    this.gainNode.disconnect();
  }
}

// ============================================================================
// FILTER MODULE
// ============================================================================

export class FilterModule {
  private context: AudioContext;
  private filter: BiquadFilterNode;
  
  constructor(context: AudioContext, config: FilterConfig) {
    this.context = context;
    this.filter = context.createBiquadFilter();
    this.filter.type = config.type;
    this.filter.frequency.value = config.frequency;
    this.filter.Q.value = config.q;
    this.filter.gain.value = config.gain;
  }
  
  getInput(): AudioNode {
    return this.filter;
  }
  
  getOutput(): AudioNode {
    return this.filter;
  }
  
  getFrequencyParam(): AudioParam {
    return this.filter.frequency;
  }
  
  getQParam(): AudioParam {
    return this.filter.Q;
  }
  
  getGainParam(): AudioParam {
    return this.filter.gain;
  }
  
  setType(type: FilterType): void {
    this.filter.type = type;
  }
  
  setFrequency(frequency: number): void {
    this.filter.frequency.value = frequency;
  }
  
  setQ(q: number): void {
    this.filter.Q.value = q;
  }
  
  disconnect(): void {
    this.filter.disconnect();
  }
}

// ============================================================================
// LFO MODULE
// ============================================================================

export class LFOModule {
  private context: AudioContext;
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  
  constructor(context: AudioContext, config: LFOConfig) {
    this.context = context;
    
    this.oscillator = context.createOscillator();
    this.oscillator.type = config.shape as OscillatorType;
    this.oscillator.frequency.value = config.frequency;
    
    this.gainNode = context.createGain();
    this.gainNode.gain.value = config.depth;
    
    this.oscillator.connect(this.gainNode);
  }
  
  start(time?: number): void {
    this.oscillator.start(time ?? this.context.currentTime);
  }
  
  stop(time?: number): void {
    this.oscillator.stop(time ?? this.context.currentTime);
  }
  
  connect(param: AudioParam): void {
    this.gainNode.connect(param);
  }
  
  setFrequency(frequency: number): void {
    this.oscillator.frequency.value = frequency;
  }
  
  setDepth(depth: number): void {
    this.gainNode.gain.value = depth;
  }
  
  disconnect(): void {
    this.gainNode.disconnect();
    this.oscillator.disconnect();
  }
}

// ============================================================================
// EFFECTS
// ============================================================================

export class ReverbEffect {
  private context: AudioContext;
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private inputNode: GainNode;
  private outputNode: GainNode;
  
  constructor(context: AudioContext, impulseResponse?: AudioBuffer) {
    this.context = context;
    
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    this.convolver = context.createConvolver();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 0.5;
    
    // Routing
    this.inputNode.connect(this.convolver);
    this.inputNode.connect(this.dryGain);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
    this.dryGain.connect(this.outputNode);
    
    if (impulseResponse) {
      this.convolver.buffer = impulseResponse;
    } else {
      this.generateImpulseResponse(2, 2);
    }
  }
  
  async generateImpulseResponse(duration: number, decay: number): Promise<void> {
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * decay / 3));
      }
    }
    
    this.convolver.buffer = impulse;
  }
  
  setWet(value: number): void {
    this.wetGain.gain.value = value;
    this.dryGain.gain.value = 1 - value;
  }
  
  getInput(): AudioNode {
    return this.inputNode;
  }
  
  getOutput(): AudioNode {
    return this.outputNode;
  }
  
  disconnect(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.convolver.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}

export class DelayEffect {
  private context: AudioContext;
  private delay: DelayNode;
  private feedback: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private filter: BiquadFilterNode;
  
  constructor(context: AudioContext, time: number = 0.3, feedbackAmount: number = 0.5) {
    this.context = context;
    
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    this.delay = context.createDelay(5);
    this.feedback = context.createGain();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.filter = context.createBiquadFilter();
    
    this.delay.delayTime.value = time;
    this.feedback.gain.value = feedbackAmount;
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 0.5;
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 5000;
    
    // Routing
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delay);
    this.delay.connect(this.filter);
    this.filter.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.filter.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
    this.dryGain.connect(this.outputNode);
  }
  
  setTime(time: number): void {
    this.delay.delayTime.value = time;
  }
  
  setFeedback(amount: number): void {
    this.feedback.gain.value = Math.min(amount, 0.95);
  }
  
  setWet(value: number): void {
    this.wetGain.gain.value = value;
    this.dryGain.gain.value = 1 - value;
  }
  
  getInput(): AudioNode {
    return this.inputNode;
  }
  
  getOutput(): AudioNode {
    return this.outputNode;
  }
  
  disconnect(): void {
    this.inputNode.disconnect();
    this.delay.disconnect();
    this.feedback.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.outputNode.disconnect();
    this.filter.disconnect();
  }
}

export class DistortionEffect {
  private context: AudioContext;
  private waveshaper: WaveShaperNode;
  private inputGain: GainNode;
  private outputGain: GainNode;
  
  constructor(context: AudioContext, type: DistortionType = 'soft', amount: number = 50) {
    this.context = context;
    
    this.inputGain = context.createGain();
    this.outputGain = context.createGain();
    this.waveshaper = context.createWaveShaper();
    
    this.setDistortion(type, amount);
    
    this.inputGain.connect(this.waveshaper);
    this.waveshaper.connect(this.outputGain);
  }
  
  setDistortion(type: DistortionType, amount: number): void {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    switch (type) {
      case 'soft':
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = Math.tanh(x * amount / 10);
        }
        break;
        
      case 'hard':
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = Math.max(-1, Math.min(1, x * amount / 10));
        }
        break;
        
      case 'fuzz':
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 1 / (amount / 10 + 1));
        }
        break;
        
      case 'bitcrush':
        const bits = Math.max(1, 16 - Math.floor(amount / 10));
        const levels = Math.pow(2, bits);
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = Math.round(x * levels) / levels;
        }
        break;
    }
    
    this.waveshaper.curve = curve;
    this.waveshaper.oversample = '4x';
  }
  
  getInput(): AudioNode {
    return this.inputGain;
  }
  
  getOutput(): AudioNode {
    return this.outputGain;
  }
  
  disconnect(): void {
    this.inputGain.disconnect();
    this.waveshaper.disconnect();
    this.outputGain.disconnect();
  }
}

export class ChorusEffect {
  private context: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private delays: DelayNode[] = [];
  private lfos: OscillatorNode[] = [];
  private lfoGains: GainNode[] = [];
  
  constructor(context: AudioContext, rate: number = 1.5, depth: number = 0.002, voices: number = 3) {
    this.context = context;
    
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    
    // Create delay lines with LFO modulation
    for (let i = 0; i < voices; i++) {
      const delay = context.createDelay(0.1);
      delay.delayTime.value = 0.02 + (i * 0.01);
      
      const lfo = context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = rate * (1 + i * 0.1);
      
      const lfoGain = context.createGain();
      lfoGain.gain.value = depth;
      
      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      lfo.start();
      
      this.inputNode.connect(delay);
      delay.connect(this.outputNode);
      
      this.delays.push(delay);
      this.lfos.push(lfo);
      this.lfoGains.push(lfoGain);
    }
    
    // Mix dry signal
    this.inputNode.connect(this.outputNode);
  }
  
  setRate(rate: number): void {
    this.lfos.forEach((lfo, i) => {
      lfo.frequency.value = rate * (1 + i * 0.1);
    });
  }
  
  setDepth(depth: number): void {
    this.lfoGains.forEach(gain => {
      gain.gain.value = depth;
    });
  }
  
  getInput(): AudioNode {
    return this.inputNode;
  }
  
  getOutput(): AudioNode {
    return this.outputNode;
  }
  
  disconnect(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.delays.forEach(d => d.disconnect());
    this.lfos.forEach(l => { l.stop(); l.disconnect(); });
    this.lfoGains.forEach(g => g.disconnect());
  }
}

// ============================================================================
// SYNTH VOICE
// ============================================================================

export class SynthVoice {
  private context: AudioContext;
  private config: SynthVoiceConfig;
  private oscillators: OscillatorModule[] = [];
  private filter: FilterModule | null = null;
  private ampEnvelope: EnvelopeGenerator;
  private filterEnvelope: EnvelopeGenerator | null = null;
  private lfos: LFOModule[] = [];
  private outputGain: GainNode;
  private isPlaying: boolean = false;
  private currentNote: number = -1;
  
  constructor(context: AudioContext, config: SynthVoiceConfig) {
    this.context = context;
    this.config = config;
    
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 0;
    
    this.ampEnvelope = new EnvelopeGenerator(context, config.envelope);
    
    if (config.filterEnvelope) {
      this.filterEnvelope = new EnvelopeGenerator(context, config.filterEnvelope);
    }
    
    // Create filter
    if (config.filter) {
      this.filter = new FilterModule(context, config.filter);
    }
    
    // Create oscillators
    for (const oscConfig of config.oscillators) {
      this.oscillators.push(new OscillatorModule(context, oscConfig));
    }
    
    // Create LFOs
    if (config.lfos) {
      for (const lfoConfig of config.lfos) {
        this.lfos.push(new LFOModule(context, lfoConfig));
      }
    }
    
    this.connectModules();
  }
  
  private connectModules(): void {
    const target = this.filter ? this.filter.getInput() : this.outputGain;
    
    for (const osc of this.oscillators) {
      osc.getOutput().connect(target);
    }
    
    if (this.filter) {
      this.filter.getOutput().connect(this.outputGain);
    }
  }
  
  noteOn(note: number, velocity: number = 1): void {
    if (this.isPlaying) {
      this.noteOff();
    }
    
    const frequency = this.midiToFrequency(note);
    const startTime = this.context.currentTime;
    
    // Start oscillators
    for (const osc of this.oscillators) {
      osc.start(frequency, startTime);
    }
    
    // Start LFOs
    for (const lfo of this.lfos) {
      lfo.start(startTime);
    }
    
    // Apply amplitude envelope
    this.ampEnvelope.apply(this.outputGain.gain, startTime, velocity);
    
    // Apply filter envelope
    if (this.filter && this.filterEnvelope) {
      const baseFreq = this.config.filter!.frequency;
      const envAmount = baseFreq * 4;
      this.filterEnvelope.apply(this.filter.getFrequencyParam(), startTime, envAmount);
    }
    
    this.isPlaying = true;
    this.currentNote = note;
  }
  
  noteOff(): void {
    if (!this.isPlaying) return;
    
    const releaseTime = this.context.currentTime;
    
    // Release amplitude envelope
    this.ampEnvelope.release(this.outputGain.gain, releaseTime);
    
    // Release filter envelope
    if (this.filter && this.filterEnvelope) {
      this.filterEnvelope.release(this.filter.getFrequencyParam(), releaseTime);
    }
    
    // Schedule stop
    const stopTime = releaseTime + this.config.envelope.release + 0.1;
    
    for (const osc of this.oscillators) {
      osc.stop(stopTime);
    }
    
    for (const lfo of this.lfos) {
      lfo.stop(stopTime);
    }
    
    this.isPlaying = false;
    this.currentNote = -1;
  }
  
  setFrequency(frequency: number): void {
    for (const osc of this.oscillators) {
      osc.setFrequency(frequency);
    }
  }
  
  setFilterCutoff(frequency: number): void {
    if (this.filter) {
      this.filter.setFrequency(frequency);
    }
  }
  
  getOutput(): AudioNode {
    return this.outputGain;
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  getCurrentNote(): number {
    return this.currentNote;
  }
  
  private midiToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }
  
  disconnect(): void {
    for (const osc of this.oscillators) {
      osc.disconnect();
    }
    if (this.filter) {
      this.filter.disconnect();
    }
    for (const lfo of this.lfos) {
      lfo.disconnect();
    }
    this.outputGain.disconnect();
  }
}

// ============================================================================
// POLYPHONIC SYNTHESIZER
// ============================================================================

export class PolySynth {
  private context: AudioContext;
  private voiceConfig: SynthVoiceConfig;
  private voices: SynthVoice[] = [];
  private maxVoices: number;
  private outputGain: GainNode;
  private effects: (ReverbEffect | DelayEffect | DistortionEffect | ChorusEffect)[] = [];
  
  constructor(context: AudioContext, config: SynthVoiceConfig, maxVoices: number = 8) {
    this.context = context;
    this.voiceConfig = config;
    this.maxVoices = maxVoices;
    
    this.outputGain = context.createGain();
    
    // Pre-create voices
    for (let i = 0; i < maxVoices; i++) {
      const voice = new SynthVoice(context, config);
      voice.getOutput().connect(this.outputGain);
      this.voices.push(voice);
    }
  }
  
  noteOn(note: number, velocity: number = 1): void {
    // Find free voice or steal oldest
    let voice = this.voices.find(v => !v.getIsPlaying());
    
    if (!voice) {
      // Steal voice (simple: take first)
      voice = this.voices[0];
      voice.noteOff();
    }
    
    voice.noteOn(note, velocity);
  }
  
  noteOff(note: number): void {
    const voice = this.voices.find(v => v.getCurrentNote() === note);
    if (voice) {
      voice.noteOff();
    }
  }
  
  allNotesOff(): void {
    for (const voice of this.voices) {
      voice.noteOff();
    }
  }
  
  addEffect(effect: ReverbEffect | DelayEffect | DistortionEffect | ChorusEffect): void {
    // Disconnect output from previous target
    this.outputGain.disconnect();
    
    // Connect through effects chain
    let lastOutput: AudioNode = this.outputGain;
    
    for (const fx of this.effects) {
      lastOutput.connect(fx.getInput());
      lastOutput = fx.getOutput();
    }
    
    // Add new effect
    lastOutput.connect(effect.getInput());
    this.effects.push(effect);
  }
  
  getOutput(): AudioNode {
    if (this.effects.length > 0) {
      return this.effects[this.effects.length - 1].getOutput();
    }
    return this.outputGain;
  }
  
  setVolume(volume: number): void {
    this.outputGain.gain.value = volume;
  }
  
  disconnect(): void {
    for (const voice of this.voices) {
      voice.disconnect();
    }
    for (const effect of this.effects) {
      effect.disconnect();
    }
    this.outputGain.disconnect();
  }
}

// ============================================================================
// SAMPLER
// ============================================================================

export class Sampler {
  private context: AudioContext;
  private samples: Map<number, AudioBuffer> = new Map();
  private activeSources: Map<number, AudioBufferSourceNode> = new Map();
  private outputGain: GainNode;
  private baseNote: number = 60; // Middle C
  
  constructor(context: AudioContext) {
    this.context = context;
    this.outputGain = context.createGain();
  }
  
  async loadSample(note: number, url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.samples.set(note, audioBuffer);
  }
  
  async loadSampleFromBuffer(note: number, buffer: ArrayBuffer): Promise<void> {
    const audioBuffer = await this.context.decodeAudioData(buffer);
    this.samples.set(note, audioBuffer);
  }
  
  setSampleBuffer(note: number, buffer: AudioBuffer): void {
    this.samples.set(note, buffer);
  }
  
  noteOn(note: number, velocity: number = 1): void {
    // Find closest sample
    let closestNote = this.baseNote;
    let minDist = Infinity;
    
    for (const sampleNote of this.samples.keys()) {
      const dist = Math.abs(note - sampleNote);
      if (dist < minDist) {
        minDist = dist;
        closestNote = sampleNote;
      }
    }
    
    const buffer = this.samples.get(closestNote);
    if (!buffer) return;
    
    // Stop existing note
    this.noteOff(note);
    
    // Create source
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    
    // Calculate playback rate for pitch shift
    const semitones = note - closestNote;
    source.playbackRate.value = Math.pow(2, semitones / 12);
    
    // Apply velocity
    const velocityGain = this.context.createGain();
    velocityGain.gain.value = velocity;
    
    source.connect(velocityGain);
    velocityGain.connect(this.outputGain);
    
    source.start();
    this.activeSources.set(note, source);
    
    source.onended = () => {
      this.activeSources.delete(note);
    };
  }
  
  noteOff(note: number): void {
    const source = this.activeSources.get(note);
    if (source) {
      source.stop();
      this.activeSources.delete(note);
    }
  }
  
  allNotesOff(): void {
    for (const [note, _source] of this.activeSources) {
      this.noteOff(note);
    }
  }
  
  setBaseNote(note: number): void {
    this.baseNote = note;
  }
  
  getOutput(): AudioNode {
    return this.outputGain;
  }
  
  disconnect(): void {
    this.allNotesOff();
    this.outputGain.disconnect();
  }
}

// ============================================================================
// DRUM MACHINE
// ============================================================================

export interface DrumPattern {
  bpm: number;
  steps: number;
  tracks: {
    name: string;
    sample: string;
    pattern: boolean[];
    volume: number;
  }[];
}

export class DrumMachine {
  private context: AudioContext;
  private samples: Map<string, AudioBuffer> = new Map();
  private pattern: DrumPattern | null = null;
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  private intervalId: number | null = null;
  private outputGain: GainNode;
  
  constructor(context: AudioContext) {
    this.context = context;
    this.outputGain = context.createGain();
  }
  
  async loadSample(name: string, url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.samples.set(name, audioBuffer);
  }
  
  setPattern(pattern: DrumPattern): void {
    this.pattern = pattern;
  }
  
  start(): void {
    if (!this.pattern || this.isPlaying) return;
    
    this.isPlaying = true;
    this.currentStep = 0;
    
    const stepDuration = (60 / this.pattern.bpm) * 1000 / 4; // 16th notes
    
    this.intervalId = window.setInterval(() => {
      this.playStep();
      this.currentStep = (this.currentStep + 1) % this.pattern!.steps;
    }, stepDuration);
  }
  
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
    this.currentStep = 0;
  }
  
  private playStep(): void {
    if (!this.pattern) return;
    
    for (const track of this.pattern.tracks) {
      if (track.pattern[this.currentStep]) {
        this.triggerSample(track.sample, track.volume);
      }
    }
  }
  
  triggerSample(name: string, volume: number = 1): void {
    const buffer = this.samples.get(name);
    if (!buffer) return;
    
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(this.outputGain);
    source.start();
  }
  
  getCurrentStep(): number {
    return this.currentStep;
  }
  
  getOutput(): AudioNode {
    return this.outputGain;
  }
  
  disconnect(): void {
    this.stop();
    this.outputGain.disconnect();
  }
}

// ============================================================================
// PRESET SYNTHS
// ============================================================================

export const SynthPresets = {
  lead: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sawtooth', frequency: 440, detune: 0, gain: 0.5 },
      { shape: 'sawtooth', frequency: 440, detune: 7, gain: 0.5 },
    ],
    filter: { type: 'lowpass', frequency: 2000, q: 2, gain: 0 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
  }),
  
  pad: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sine', frequency: 440, detune: 0, gain: 0.4 },
      { shape: 'triangle', frequency: 440, detune: 5, gain: 0.3 },
      { shape: 'sine', frequency: 880, detune: 0, gain: 0.15 },
    ],
    filter: { type: 'lowpass', frequency: 3000, q: 0.5, gain: 0 },
    envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.5 },
  }),
  
  bass: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sawtooth', frequency: 110, detune: 0, gain: 0.6 },
      { shape: 'square', frequency: 110, detune: -5, gain: 0.4 },
    ],
    filter: { type: 'lowpass', frequency: 800, q: 4, gain: 0 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
    filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.2 },
  }),
  
  pluck: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'triangle', frequency: 440, detune: 0, gain: 0.8 },
    ],
    filter: { type: 'lowpass', frequency: 5000, q: 1, gain: 0 },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    filterEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.1 },
  }),
  
  organ: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sine', frequency: 440, detune: 0, gain: 0.5 },
      { shape: 'sine', frequency: 880, detune: 0, gain: 0.25 },
      { shape: 'sine', frequency: 1320, detune: 0, gain: 0.125 },
      { shape: 'sine', frequency: 1760, detune: 0, gain: 0.0625 },
    ],
    envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.1 },
  }),
  
  strings: (): SynthVoiceConfig => ({
    oscillators: [
      { shape: 'sawtooth', frequency: 440, detune: 0, gain: 0.3 },
      { shape: 'sawtooth', frequency: 440, detune: 10, gain: 0.3 },
      { shape: 'sawtooth', frequency: 440, detune: -10, gain: 0.3 },
    ],
    filter: { type: 'lowpass', frequency: 4000, q: 1, gain: 0 },
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 0.5 },
    lfos: [
      { shape: 'sine', frequency: 5, depth: 3, target: 'frequency' },
    ],
  }),
};

// ============================================================================
// EXPORTS
// ============================================================================

export function createAudioContext(): Promise<AudioContext> {
  return AudioContextManager.getInstance().initialize();
}

export function createPolySynth(context: AudioContext, preset: keyof typeof SynthPresets): PolySynth {
  return new PolySynth(context, SynthPresets[preset]());
}

export function createSampler(context: AudioContext): Sampler {
  return new Sampler(context);
}

export function createDrumMachine(context: AudioContext): DrumMachine {
  return new DrumMachine(context);
}

export function createReverb(context: AudioContext): ReverbEffect {
  return new ReverbEffect(context);
}

export function createDelay(context: AudioContext, time?: number, feedback?: number): DelayEffect {
  return new DelayEffect(context, time, feedback);
}

export function createDistortion(context: AudioContext, type?: DistortionType, amount?: number): DistortionEffect {
  return new DistortionEffect(context, type, amount);
}

export function createChorus(context: AudioContext): ChorusEffect {
  return new ChorusEffect(context);
}
