/**
 * Minimal Web Audio doubles for Node/Vitest (no real AudioContext in jsdom).
 */

export class MockAudioBuffer {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number
  readonly duration: number
  private channels: Float32Array[]

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels
    this.length = length
    this.sampleRate = sampleRate
    this.duration = length / sampleRate
    this.channels = Array.from({ length: channels }, () => new Float32Array(length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel] ?? this.channels[0]
  }
}

class MockGainNode {
  gain = { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }
  connect() {
    return this
  }
}

class MockConvolverNode {
  buffer: MockAudioBuffer | null = null
  connect() {
    return this
  }
}

class MockOscillatorNode {
  frequency = { value: 440 }
  type = 'sine'
  connect() {
    return this
  }
  start() {}
  stop() {}
}

class MockBufferSource {
  buffer: MockAudioBuffer | null = null
  loop = false
  playbackRate = { value: 1 }
  onended: (() => void) | null = null
  connect() {
    return this
  }
  start() {}
  stop() {
    this.onended?.()
  }
}

export class MockAudioContext {
  readonly sampleRate = 44100
  state: AudioContextState = 'running'
  destination = {}

  createGain() {
    return new MockGainNode() as unknown as GainNode
  }
  createConvolver() {
    return new MockConvolverNode() as unknown as ConvolverNode
  }
  createOscillator() {
    return new MockOscillatorNode() as unknown as OscillatorNode
  }
  createBufferSource() {
    return new MockBufferSource() as unknown as AudioBufferSourceNode
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate) as unknown as AudioBuffer
  }
  createPanner() {
    return {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 100,
      rolloffFactor: 1,
      coneInnerAngle: 360,
      coneOuterAngle: 360,
      coneOuterGain: 0,
      setPosition() {},
      connect() {
        return this
      },
    } as unknown as PannerNode
  }
  async resume() {
    this.state = 'running'
  }
  async close() {
    this.state = 'closed'
  }
}

export function installMockAudioContext(): void {
  ;(globalThis as { AudioContext?: unknown }).AudioContext = MockAudioContext
}
