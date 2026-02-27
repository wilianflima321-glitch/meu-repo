'use client'

export type AudioEffectType =
  | 'eq'
  | 'compressor'
  | 'limiter'
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'distortion'
  | 'gain'
  | 'pan'
  | 'filter'
  | 'deEsser'
  | 'gate'

// ============================================================================
// EFFECT PARAMETERS
// ============================================================================

export interface EQBand {
  id: string
  type: 'lowshelf' | 'highshelf' | 'peaking' | 'lowpass' | 'highpass' | 'bandpass' | 'notch'
  frequency: number     // Hz
  gain: number          // dB (-24 to +24)
  q: number             // Quality factor (0.1 to 18)
  enabled: boolean
}

export interface EQParams {
  bands: EQBand[]
}

export interface CompressorParams {
  threshold: number     // dB (-60 to 0)
  ratio: number         // 1:1 to 20:1
  attack: number        // ms (0.1 to 200)
  release: number       // ms (10 to 2000)
  knee: number          // dB (0 to 40)
  makeupGain: number    // dB (0 to 24)
}

export interface LimiterParams {
  threshold: number     // dB (-30 to 0)
  release: number       // ms (10 to 500)
  lookahead: number     // ms (0 to 10)
}

export interface ReverbParams {
  roomSize: number      // 0-1
  damping: number       // 0-1
  wetLevel: number      // 0-1
  dryLevel: number      // 0-1
  preDelay: number      // ms (0 to 100)
  decay: number         // seconds (0.1 to 10)
}

export interface DelayParams {
  time: number          // ms (0 to 2000)
  feedback: number      // 0-1
  wetLevel: number      // 0-1
  pingPong: boolean
  sync: boolean         // Sync to tempo
  syncValue: '1/4' | '1/8' | '1/16' | '1/32' | 'dotted-1/8' | 'triplet-1/8'
}

export interface ChorusParams {
  rate: number          // Hz (0.1 to 10)
  depth: number         // 0-1
  delay: number         // ms (1 to 30)
  feedback: number      // 0-1
  mix: number           // 0-1
}

export interface DistortionParams {
  type: 'soft' | 'hard' | 'fuzz' | 'overdrive'
  drive: number         // 0-1
  tone: number          // 0-1
  mix: number           // 0-1
}

export interface GainParams {
  gain: number          // dB (-inf to +24)
  mute: boolean
}

export interface PanParams {
  pan: number           // -1 (left) to 1 (right)
}

export interface FilterParams {
  type: 'lowpass' | 'highpass' | 'bandpass'
  frequency: number     // Hz
  resonance: number     // Q (0.1 to 30)
}

export interface DeEsserParams {
  frequency: number     // Hz (2000 to 10000)
  threshold: number     // dB
  ratio: number         // 2:1 to 10:1
}

export interface GateParams {
  threshold: number     // dB (-80 to 0)
  attack: number        // ms
  hold: number          // ms
  release: number       // ms
  range: number         // dB (-80 to 0)
}

export type AudioEffectParams =
  | { type: 'eq'; params: EQParams }
  | { type: 'compressor'; params: CompressorParams }
  | { type: 'limiter'; params: LimiterParams }
  | { type: 'reverb'; params: ReverbParams }
  | { type: 'delay'; params: DelayParams }
  | { type: 'chorus'; params: ChorusParams }
  | { type: 'distortion'; params: DistortionParams }
  | { type: 'gain'; params: GainParams }
  | { type: 'pan'; params: PanParams }
  | { type: 'filter'; params: FilterParams }
  | { type: 'deEsser'; params: DeEsserParams }
  | { type: 'gate'; params: GateParams }

export interface AudioEffect {
  id: string
  type: AudioEffectType
  name: string
  params: AudioEffectParams['params']
  bypass: boolean
  order: number
}

// ============================================================================
// DEFAULT PRESETS
// ============================================================================

export const DEFAULT_EQ: EQParams = {
  bands: [
    { id: 'b1', type: 'highpass', frequency: 80, gain: 0, q: 0.7, enabled: true },
    { id: 'b2', type: 'lowshelf', frequency: 200, gain: 0, q: 1, enabled: true },
    { id: 'b3', type: 'peaking', frequency: 1000, gain: 0, q: 1, enabled: true },
    { id: 'b4', type: 'peaking', frequency: 4000, gain: 0, q: 1, enabled: true },
    { id: 'b5', type: 'highshelf', frequency: 8000, gain: 0, q: 1, enabled: true },
  ]
}

export const DEFAULT_COMPRESSOR: CompressorParams = {
  threshold: -18,
  ratio: 4,
  attack: 10,
  release: 100,
  knee: 6,
  makeupGain: 0
}

export const DEFAULT_LIMITER: LimiterParams = {
  threshold: -1,
  release: 50,
  lookahead: 3
}

export const DEFAULT_REVERB: ReverbParams = {
  roomSize: 0.5,
  damping: 0.5,
  wetLevel: 0.3,
  dryLevel: 0.7,
  preDelay: 10,
  decay: 2
}

export const DEFAULT_DELAY: DelayParams = {
  time: 250,
  feedback: 0.3,
  wetLevel: 0.3,
  pingPong: false,
  sync: false,
  syncValue: '1/4'
}

// ============================================================================
// AUDIO EFFECT PROCESSOR CLASS
// ============================================================================

export class AudioEffectProcessor {
  private audioContext: AudioContext
  private inputNode: GainNode
  private outputNode: GainNode
  private effectNodes: Map<string, AudioNode[]> = new Map()
  private analyserNode: AnalyserNode
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.inputNode = audioContext.createGain()
    this.outputNode = audioContext.createGain()
    this.analyserNode = audioContext.createAnalyser()
    this.analyserNode.fftSize = 2048
    
    // Default: input -> output
    this.inputNode.connect(this.outputNode)
    this.outputNode.connect(this.analyserNode)
  }
  
  get input(): GainNode {
    return this.inputNode
  }
  
  get output(): GainNode {
    return this.outputNode
  }
  
  get analyser(): AnalyserNode {
    return this.analyserNode
  }
  
  addEffect(effect: AudioEffect): void {
    const nodes = this.createEffectNodes(effect)
    if (nodes.length === 0) return
    
    this.effectNodes.set(effect.id, nodes)
    this.rebuildChain()
  }
  
  removeEffect(effectId: string): void {
    const nodes = this.effectNodes.get(effectId)
    if (nodes) {
      nodes.forEach(node => node.disconnect())
      this.effectNodes.delete(effectId)
      this.rebuildChain()
    }
  }
  
  updateEffect(effect: AudioEffect): void {
    this.removeEffect(effect.id)
    if (!effect.bypass) {
      this.addEffect(effect)
    }
  }
  
  private createEffectNodes(effect: AudioEffect): AudioNode[] {
    const ctx = this.audioContext
    
    switch (effect.type) {
      case 'eq': {
        const params = effect.params as EQParams
        return params.bands
          .filter(band => band.enabled)
          .map(band => {
            const filter = ctx.createBiquadFilter()
            filter.type = band.type
            filter.frequency.value = band.frequency
            filter.gain.value = band.gain
            filter.Q.value = band.q
            return filter
          })
      }
      
      case 'compressor': {
        const params = effect.params as CompressorParams
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = params.threshold
        comp.ratio.value = params.ratio
        comp.attack.value = params.attack / 1000
        comp.release.value = params.release / 1000
        comp.knee.value = params.knee
        
        const makeup = ctx.createGain()
        makeup.gain.value = Math.pow(10, params.makeupGain / 20)
        
        return [comp, makeup]
      }
      
      case 'limiter': {
        const params = effect.params as LimiterParams
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = params.threshold
        comp.ratio.value = 20
        comp.attack.value = 0.001
        comp.release.value = params.release / 1000
        comp.knee.value = 0
        return [comp]
      }
      
      case 'reverb': {
        const params = effect.params as ReverbParams
        // Create convolver with generated impulse response
        const convolver = ctx.createConvolver()
        convolver.buffer = this.generateReverbIR(params)
        
        const wetGain = ctx.createGain()
        wetGain.gain.value = params.wetLevel
        
        return [convolver, wetGain]
      }
      
      case 'delay': {
        const params = effect.params as DelayParams
        const delay = ctx.createDelay(3)
        delay.delayTime.value = params.time / 1000
        
        const feedback = ctx.createGain()
        feedback.gain.value = params.feedback
        
        const wet = ctx.createGain()
        wet.gain.value = params.wetLevel
        
        // Feedback loop
        delay.connect(feedback)
        feedback.connect(delay)
        
        return [delay, wet]
      }
      
      case 'gain': {
        const params = effect.params as GainParams
        const gain = ctx.createGain()
        gain.gain.value = params.mute ? 0 : Math.pow(10, params.gain / 20)
        return [gain]
      }
      
      case 'pan': {
        const params = effect.params as PanParams
        const panner = ctx.createStereoPanner()
        panner.pan.value = params.pan
        return [panner]
      }
      
      case 'filter': {
        const params = effect.params as FilterParams
        const filter = ctx.createBiquadFilter()
        filter.type = params.type
        filter.frequency.value = params.frequency
        filter.Q.value = params.resonance
        return [filter]
      }
      
      case 'distortion': {
        const params = effect.params as DistortionParams
        const waveshaper = ctx.createWaveShaper()
        waveshaper.curve = this.generateDistortionCurve(params)
        waveshaper.oversample = '4x'
        
        // Tone control
        const tone = ctx.createBiquadFilter()
        tone.type = 'lowpass'
        tone.frequency.value = 2000 + params.tone * 18000
        
        const mix = ctx.createGain()
        mix.gain.value = params.mix
        
        return [waveshaper, tone, mix]
      }
      
      default:
        return []
    }
  }
  
  private generateReverbIR(params: ReverbParams): AudioBuffer {
    const ctx = this.audioContext
    const sampleRate = ctx.sampleRate
    const length = Math.ceil(params.decay * sampleRate)
    const buffer = ctx.createBuffer(2, length, sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        // Exponential decay with room size affecting density
        const envelope = Math.exp(-t * (3 / params.decay))
        // Random noise with damping (high freq rolloff)
        const noise = (Math.random() * 2 - 1) * envelope
        // Apply damping as low pass effect (simplified)
        const damped = noise * (1 - params.damping * 0.8)
        data[i] = damped * params.roomSize
      }
    }
    
    return buffer
  }
  
  private generateDistortionCurve(params: DistortionParams): Float32Array<ArrayBuffer> {
    const samples = 44100
    const curve = new Float32Array(samples)
    const deg = Math.PI / 180
    const drive = params.drive * 100 + 1
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      
      switch (params.type) {
        case 'soft':
          curve[i] = Math.tanh(x * drive)
          break
        case 'hard':
          curve[i] = Math.max(-1, Math.min(1, x * drive))
          break
        case 'fuzz':
          curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.5 / drive)
          break
        case 'overdrive':
          curve[i] = (3 + drive) * x * 20 * deg / (Math.PI + drive * Math.abs(x))
          break
      }
    }
    
    return curve
  }
  
  private rebuildChain(): void {
    // Disconnect all
    this.inputNode.disconnect()
    this.effectNodes.forEach(nodes => nodes.forEach(n => n.disconnect()))
    
    // Rebuild chain: input -> effects -> output
    let lastNode: AudioNode = this.inputNode
    
    // Sort effects by order and connect
    const sortedEffects = Array.from(this.effectNodes.entries())
    
    for (const [, nodes] of sortedEffects) {
      for (const node of nodes) {
        lastNode.connect(node)
        lastNode = node
      }
    }
    
    lastNode.connect(this.outputNode)
    this.outputNode.connect(this.analyserNode)
  }
  
  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(data)
    return data
  }
  
  getTimeDomainData(): Uint8Array {
    const data = new Uint8Array(this.analyserNode.fftSize)
    this.analyserNode.getByteTimeDomainData(data)
    return data
  }
  
  dispose(): void {
    this.effectNodes.forEach(nodes => nodes.forEach(n => n.disconnect()))
    this.effectNodes.clear()
    this.inputNode.disconnect()
    this.outputNode.disconnect()
    this.analyserNode.disconnect()
  }
}

