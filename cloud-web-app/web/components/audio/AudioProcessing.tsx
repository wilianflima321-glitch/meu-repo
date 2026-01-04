'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

// ============================================================================
// PROFESSIONAL AUDIO PROCESSING SYSTEM (DAW-level like Pro Tools / Logic)
// ============================================================================

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

// ============================================================================
// EQ VISUALIZER COMPONENT
// ============================================================================

interface EQVisualizerProps {
  bands: EQBand[]
  onChange: (bands: EQBand[]) => void
  width?: number
  height?: number
}

export function EQVisualizer({
  bands,
  onChange,
  width = 400,
  height = 200
}: EQVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  
  // Frequency to X position (logarithmic scale)
  const freqToX = useCallback((freq: number) => {
    const minLog = Math.log10(20)
    const maxLog = Math.log10(20000)
    const log = Math.log10(freq)
    return ((log - minLog) / (maxLog - minLog)) * width
  }, [width])
  
  // X position to frequency
  const xToFreq = useCallback((x: number) => {
    const minLog = Math.log10(20)
    const maxLog = Math.log10(20000)
    const log = minLog + (x / width) * (maxLog - minLog)
    return Math.pow(10, log)
  }, [width])
  
  // Gain to Y position
  const gainToY = useCallback((gain: number) => {
    return height / 2 - (gain / 24) * (height / 2)
  }, [height])
  
  // Y position to gain
  const yToGain = useCallback((y: number) => {
    return -((y - height / 2) / (height / 2)) * 24
  }, [height])
  
  // Draw EQ curve
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear
    ctx.fillStyle = '#1a1b1e'
    ctx.fillRect(0, 0, width, height)
    
    // Grid lines
    ctx.strokeStyle = '#2c2e33'
    ctx.lineWidth = 1
    
    // Frequency grid (logarithmic)
    const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
    freqs.forEach(freq => {
      const x = freqToX(freq)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
      
      // Label
      ctx.fillStyle = '#5c5f66'
      ctx.font = '9px system-ui'
      ctx.textAlign = 'center'
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`
      ctx.fillText(label, x, height - 4)
    })
    
    // Gain grid
    const gains = [-24, -12, 0, 12, 24]
    gains.forEach(gain => {
      const y = gainToY(gain)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      
      // Label
      ctx.fillStyle = '#5c5f66'
      ctx.font = '9px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText(`${gain > 0 ? '+' : ''}${gain}dB`, 4, y - 2)
    })
    
    // Draw response curve
    ctx.beginPath()
    ctx.strokeStyle = '#339af0'
    ctx.lineWidth = 2
    
    for (let x = 0; x < width; x++) {
      const freq = xToFreq(x)
      let totalGain = 0
      
      bands.forEach(band => {
        if (!band.enabled) return
        totalGain += calculateBandResponse(band, freq)
      })
      
      totalGain = Math.max(-24, Math.min(24, totalGain))
      const y = gainToY(totalGain)
      
      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    
    // Fill under curve
    ctx.lineTo(width, height / 2)
    ctx.lineTo(0, height / 2)
    ctx.closePath()
    ctx.fillStyle = 'rgba(51, 154, 240, 0.1)'
    ctx.fill()
    
    // Draw band control points
    bands.forEach(band => {
      if (!band.enabled) return
      
      const x = freqToX(band.frequency)
      const y = gainToY(band.gain)
      
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fillStyle = dragging === band.id ? '#228be6' : '#339af0'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Q indicator (width of the dot)
      const qWidth = Math.min(50, 100 / band.q)
      ctx.beginPath()
      ctx.ellipse(x, y, qWidth, 4, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(51, 154, 240, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    })
    
  }, [bands, width, height, freqToX, gainToY, xToFreq, dragging])
  
  // Mouse handlers for dragging bands
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Find closest band
    for (const band of bands) {
      if (!band.enabled) continue
      
      const bx = freqToX(band.frequency)
      const by = gainToY(band.gain)
      const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2)
      
      if (dist < 12) {
        setDragging(band.id)
        return
      }
    }
  }, [bands, freqToX, gainToY])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newFreq = Math.max(20, Math.min(20000, xToFreq(x)))
    const newGain = Math.max(-24, Math.min(24, yToGain(y)))
    
    onChange(bands.map(b =>
      b.id === dragging
        ? { ...b, frequency: Math.round(newFreq), gain: Math.round(newGain * 10) / 10 }
        : b
    ))
  }, [dragging, bands, xToFreq, yToGain, onChange])
  
  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        borderRadius: 4,
        cursor: dragging ? 'grabbing' : 'crosshair'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

function calculateBandResponse(band: EQBand, freq: number): number {
  const f0 = band.frequency
  const q = band.q
  const gain = band.gain
  
  const omega = freq / f0
  const logOmega = Math.log2(omega)
  
  switch (band.type) {
    case 'peaking':
      return gain * Math.exp(-Math.pow(logOmega * q, 2))
    case 'lowshelf':
      return gain * (1 / (1 + Math.pow(omega, 2)))
    case 'highshelf':
      return gain * (1 - 1 / (1 + Math.pow(omega, 2)))
    case 'lowpass':
      return freq > f0 ? -12 * Math.log2(omega) : 0
    case 'highpass':
      return freq < f0 ? -12 * Math.log2(1 / omega) : 0
    case 'bandpass':
      return -Math.abs(logOmega) * 12
    case 'notch':
      return Math.abs(logOmega) < 0.5 / q ? -24 : 0
    default:
      return 0
  }
}

// ============================================================================
// COMPRESSOR VISUALIZER
// ============================================================================

interface CompressorVisualizerProps {
  params: CompressorParams
  inputLevel: number    // dB
  outputLevel: number   // dB
  gainReduction: number // dB
}

export function CompressorVisualizer({
  params,
  inputLevel,
  outputLevel,
  gainReduction
}: CompressorVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const width = 200
  const height = 200
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.fillStyle = '#1a1b1e'
    ctx.fillRect(0, 0, width, height)
    
    // Grid
    ctx.strokeStyle = '#2c2e33'
    ctx.lineWidth = 1
    
    for (let db = 0; db >= -60; db -= 10) {
      const x = ((db + 60) / 60) * width
      const y = height - ((db + 60) / 60) * height
      
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Unity line
    ctx.strokeStyle = '#5c5f66'
    ctx.beginPath()
    ctx.moveTo(0, height)
    ctx.lineTo(width, 0)
    ctx.stroke()
    
    // Compression curve
    ctx.beginPath()
    ctx.strokeStyle = '#339af0'
    ctx.lineWidth = 2
    
    for (let input = -60; input <= 0; input += 0.5) {
      const x = ((input + 60) / 60) * width
      let output = input
      
      if (input > params.threshold) {
        const overshoot = input - params.threshold
        const compressed = overshoot / params.ratio
        output = params.threshold + compressed
      }
      
      output = Math.min(0, output + params.makeupGain)
      const y = height - ((output + 60) / 60) * height
      
      if (input === -60) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    
    // Threshold line
    const threshX = ((params.threshold + 60) / 60) * width
    ctx.strokeStyle = '#fa5252'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(threshX, 0)
    ctx.lineTo(threshX, height)
    ctx.stroke()
    ctx.setLineDash([])
    
    // Input level dot
    const inputX = ((inputLevel + 60) / 60) * width
    const inputY = height - ((outputLevel + 60) / 60) * height
    
    ctx.beginPath()
    ctx.arc(inputX, inputY, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#fab005'
    ctx.fill()
    
    // Gain reduction meter
    ctx.fillStyle = '#2c2e33'
    ctx.fillRect(width - 20, 0, 20, height)
    
    const grHeight = Math.min(height, (-gainReduction / 24) * height)
    ctx.fillStyle = '#fa5252'
    ctx.fillRect(width - 18, 0, 16, grHeight)
    
  }, [params, inputLevel, outputLevel, gainReduction])
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: 4 }}
    />
  )
}

// ============================================================================
// EFFECT RACK COMPONENT
// ============================================================================

interface EffectRackProps {
  effects: AudioEffect[]
  onChange: (effects: AudioEffect[]) => void
  onAdd: (type: AudioEffectType) => void
  onRemove: (id: string) => void
}

export function EffectRack({
  effects,
  onChange,
  onAdd,
  onRemove
}: EffectRackProps) {
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null)
  
  const effectTypes: { type: AudioEffectType; name: string; icon: string }[] = [
    { type: 'eq', name: 'Parametric EQ', icon: '📊' },
    { type: 'compressor', name: 'Compressor', icon: '📉' },
    { type: 'limiter', name: 'Limiter', icon: '🔒' },
    { type: 'reverb', name: 'Reverb', icon: '🏛️' },
    { type: 'delay', name: 'Delay', icon: '⏱️' },
    { type: 'chorus', name: 'Chorus', icon: '🎭' },
    { type: 'distortion', name: 'Distortion', icon: '⚡' },
    { type: 'filter', name: 'Filter', icon: '🎚️' },
    { type: 'gate', name: 'Gate', icon: '🚪' },
    { type: 'deEsser', name: 'De-Esser', icon: '🔇' },
  ]
  
  return (
    <div style={{ background: '#1a1b1e', borderRadius: 6, padding: 8 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottom: '1px solid #373a40'
      }}>
        <span style={{ color: '#c1c2c5', fontSize: 12, fontWeight: 600 }}>Effect Rack</span>
        
        {/* Add effect dropdown */}
        <select
          onChange={e => {
            if (e.target.value) {
              onAdd(e.target.value as AudioEffectType)
              e.target.value = ''
            }
          }}
          style={{
            background: '#25262b',
            border: '1px solid #373a40',
            borderRadius: 3,
            color: '#c1c2c5',
            padding: '2px 8px',
            fontSize: 11,
            cursor: 'pointer'
          }}
        >
          <option value="">+ Add Effect</option>
          {effectTypes.map(({ type, name, icon }) => (
            <option key={type} value={type}>{icon} {name}</option>
          ))}
        </select>
      </div>
      
      {/* Effect list */}
      {effects.length === 0 ? (
        <div style={{ color: '#5c5f66', fontSize: 11, textAlign: 'center', padding: 20 }}>
          No effects. Add one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {effects.map((effect, index) => (
            <div
              key={effect.id}
              style={{
                background: '#25262b',
                borderRadius: 4,
                border: '1px solid #373a40',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  gap: 8
                }}
                onClick={() => setExpandedEffect(expandedEffect === effect.id ? null : effect.id)}
              >
                <span style={{ color: '#868e96', fontSize: 10 }}>
                  {expandedEffect === effect.id ? '▼' : '▶'}
                </span>
                <span style={{ color: '#c1c2c5', fontSize: 11, flex: 1 }}>
                  {effectTypes.find(t => t.type === effect.type)?.icon} {effect.name}
                </span>
                
                {/* Bypass toggle */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onChange(effects.map(eff =>
                      eff.id === effect.id ? { ...eff, bypass: !eff.bypass } : eff
                    ))
                  }}
                  style={{
                    background: effect.bypass ? '#373a40' : '#339af0',
                    border: 'none',
                    borderRadius: 3,
                    color: '#fff',
                    padding: '2px 6px',
                    fontSize: 9,
                    cursor: 'pointer'
                  }}
                >
                  {effect.bypass ? 'OFF' : 'ON'}
                </button>
                
                {/* Remove button */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onRemove(effect.id)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#868e96',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  ✕
                </button>
              </div>
              
              {/* Expanded params */}
              {expandedEffect === effect.id && (
                <div style={{
                  padding: 8,
                  borderTop: '1px solid #373a40',
                  background: '#1e1f23'
                }}>
                  {effect.type === 'eq' && (
                    <EQVisualizer
                      bands={(effect.params as EQParams).bands}
                      onChange={bands => onChange(effects.map(eff =>
                        eff.id === effect.id ? { ...eff, params: { bands } } : eff
                      ))}
                      width={350}
                      height={150}
                    />
                  )}
                  
                  {effect.type === 'compressor' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(effect.params as CompressorParams).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#909296', fontSize: 10, minWidth: 70 }}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <input
                            type="range"
                            value={value}
                            onChange={e => onChange(effects.map(eff =>
                              eff.id === effect.id
                                ? { ...eff, params: { ...eff.params, [key]: parseFloat(e.target.value) } }
                                : eff
                            ))}
                            min={key === 'threshold' ? -60 : key === 'ratio' ? 1 : 0}
                            max={key === 'threshold' ? 0 : key === 'ratio' ? 20 : key === 'attack' ? 200 : key === 'release' ? 2000 : 40}
                            step={key === 'ratio' ? 0.5 : 1}
                            style={{ flex: 1 }}
                          />
                          <span style={{ color: '#c1c2c5', fontSize: 10, minWidth: 40 }}>
                            {typeof value === 'number' ? value.toFixed(1) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Generic params for other effects */}
                  {!['eq', 'compressor'].includes(effect.type) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(effect.params).map(([key, value]) => (
                        typeof value === 'number' && (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#909296', fontSize: 10, minWidth: 70 }}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <input
                              type="range"
                              value={value}
                              onChange={e => onChange(effects.map(eff =>
                                eff.id === effect.id
                                  ? { ...eff, params: { ...eff.params, [key]: parseFloat(e.target.value) } }
                                  : eff
                              ))}
                              min={0}
                              max={key.includes('time') || key.includes('delay') ? 2000 : 1}
                              step={key.includes('time') || key.includes('delay') ? 10 : 0.01}
                              style={{ flex: 1 }}
                            />
                            <span style={{ color: '#c1c2c5', fontSize: 10, minWidth: 40 }}>
                              {typeof value === 'number' ? value.toFixed(2) : value}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AudioEffectProcessor
