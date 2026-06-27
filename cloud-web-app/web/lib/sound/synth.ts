/**
 * Aethel Sound Synthesizer — opt-in micro-feedback audio.
 *
 * Emits short, tasteful sounds on UI interactions without any external audio
 * assets.  All synthesis is done via the Web Audio API oscillator graph.
 *
 * Enable / disable globally via:
 *   synth.enable()   — persists to localStorage
 *   synth.disable()  — persists to localStorage
 *   synth.isEnabled  — read current state
 *
 * Available sounds:
 *   synth.click()      — short mechanical click (toggles, checkboxes)
 *   synth.confirm()    — held "charging" tone + release chord (hold CTAs)
 *   synth.success()    — soft triad chord (sandbox validation pass, save)
 *   synth.error()      — brief descending buzz (validation fail)
 *   synth.notify()     — gentle ping (new message, agent event)
 */

const STORAGE_KEY = 'aethel_sound_enabled'

type SoundName = 'click' | 'confirm' | 'success' | 'error' | 'notify'

class AethelSynth {
  private _ctx: AudioContext | null = null
  private _enabled: boolean

  constructor() {
    this._enabled = this._readStorage()
  }

  // ---------------------------------------------------------------------------
  // Enable / disable
  // ---------------------------------------------------------------------------

  get isEnabled(): boolean {
    return this._enabled
  }

  enable(): void {
    this._enabled = true
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  disable(): void {
    this._enabled = false
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '0')
    }
  }

  toggle(): boolean {
    if (this._enabled) { this.disable(); return false }
    this.enable(); return true
  }

  private _readStorage(): boolean {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === null ? false : stored === '1'
  }

  // ---------------------------------------------------------------------------
  // Audio context (lazy)
  // ---------------------------------------------------------------------------

  private _getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this._ctx) {
      try {
        this._ctx = new AudioContext()
      } catch {
        return null
      }
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {/* best-effort */})
    }
    return this._ctx
  }

  // ---------------------------------------------------------------------------
  // Primitive helpers
  // ---------------------------------------------------------------------------

  private _osc(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    peakGain = 0.18,
    attackMs = 4,
    releaseMs = 80,
  ): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)
    const atk = startTime + attackMs / 1000
    const end = startTime + duration
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(peakGain, atk)
    gain.gain.setValueAtTime(peakGain, end - releaseMs / 1000)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.start(startTime)
    osc.stop(end + 0.01)
  }

  // ---------------------------------------------------------------------------
  // Sound library
  // ---------------------------------------------------------------------------

  /** Short mechanical click — use on toggles, checkboxes, nav items. */
  click(): void {
    if (!this._enabled) return
    const ctx = this._getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    // Noise burst for click body
    const bufSize = ctx.sampleRate * 0.02
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 3200
    filter.Q.value = 1.4
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.07, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    src.start(t)
    src.stop(t + 0.025)
  }

  /**
   * Confirm resonance — play while button is held, release on mouseup.
   * Returns a stop function to call on pointer-up.
   */
  confirm(): () => void {
    if (!this._enabled) return () => {/* no-op */}
    const ctx = this._getCtx()
    if (!ctx) return () => {/* no-op */}
    const t = ctx.currentTime
    // Slow-building pulsing tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.linearRampToValueAtTime(440, t + 1.5)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.12, t + 0.08)
    osc.start(t)

    return () => {
      const now = ctx.currentTime
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
      osc.stop(now + 0.14)
      // Release chord
      this.success()
    }
  }

  /** Soft major triad — save success, agent task complete, sandbox pass. */
  success(): void {
    if (!this._enabled) return
    const ctx = this._getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    // Major triad: root, major-third, perfect-fifth
    const freqs = [523.25, 659.25, 783.99] // C5, E5, G5
    freqs.forEach((f, i) => {
      this._osc(ctx, f, 'sine', t + i * 0.04, t + i * 0.04 + 0.45, 0.10, 6, 280)
    })
  }

  /** Descending buzz — validation fail, destructive action blocked. */
  error(): void {
    if (!this._enabled) return
    const ctx = this._getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(320, t)
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.18)
    gain.gain.setValueAtTime(0.09, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20)
    osc.start(t)
    osc.stop(t + 0.22)
  }

  /** Gentle ping — new notification, agent event, heartbeat. */
  notify(): void {
    if (!this._enabled) return
    const ctx = this._getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    this._osc(ctx, 880, 'sine', t, t + 0.32, 0.08, 3, 260)
    this._osc(ctx, 1320, 'sine', t + 0.06, t + 0.32, 0.04, 3, 260)
  }

  /** Convenience dispatcher for use with event-driven UI systems. */
  play(sound: SoundName): void {
    switch (sound) {
      case 'click': return this.click()
      case 'success': return this.success()
      case 'error': return this.error()
      case 'notify': return this.notify()
      case 'confirm': this.confirm(); return
    }
  }
}

/** Singleton — import and use directly anywhere in the app. */
export const synth = new AethelSynth()
export type { SoundName }
