/**
 * Letter cg — Aethel Ocean FFT displacement (CPU radix-2).
 * Real height field from frequency-domain spectrum — not Gerstner-only claim.
 */

export const OCEAN_FFT_LETTER = 'cg' as const
export const OCEAN_FFT_WIRED = true as const

export interface Complex {
  re: number
  im: number
}

export interface OceanSpectrumParams {
  /** Power-of-two resolution (e.g. 16, 32). */
  resolution: number
  windSpeed: number
  /** Radians — dominant wind direction. */
  windAngle: number
  amplitude: number
  seed: number
}

/** Deterministic LCG — no Math.random in soak. */
function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function bitReverseIndex(i: number, bits: number): number {
  let r = 0
  for (let b = 0; b < bits; b++) {
    r = (r << 1) | (i & 1)
    i >>= 1
  }
  return r
}

/** In-place radix-2 Cooley–Tukey FFT (1D). */
export function fft1d(buf: Complex[], inverse = false): void {
  const n = buf.length
  if (n === 0 || (n & (n - 1)) !== 0) {
    throw new Error('fft1d requires power-of-two length')
  }
  const bits = Math.log2(n)
  for (let i = 0; i < n; i++) {
    const j = bitReverseIndex(i, bits)
    if (j > i) {
      const tmp = buf[i]!
      buf[i] = buf[j]!
      buf[j] = tmp
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len
    const wlen: Complex = { re: Math.cos(ang), im: Math.sin(ang) }
    for (let i = 0; i < n; i += len) {
      let w: Complex = { re: 1, im: 0 }
      for (let j = 0; j < len / 2; j++) {
        const u = buf[i + j]!
        const v = buf[i + j + len / 2]!
        const t: Complex = {
          re: w.re * v.re - w.im * v.im,
          im: w.re * v.im + w.im * v.re,
        }
        buf[i + j] = { re: u.re + t.re, im: u.im + t.im }
        buf[i + j + len / 2] = { re: u.re - t.re, im: u.im - t.im }
        const wn: Complex = {
          re: w.re * wlen.re - w.im * wlen.im,
          im: w.re * wlen.im + w.im * wlen.re,
        }
        w = wn
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      buf[i]!.re /= n
      buf[i]!.im /= n
    }
  }
}

/** 2D FFT via row-column. */
export function fft2d(grid: Complex[][], inverse = false): void {
  const n = grid.length
  for (let y = 0; y < n; y++) fft1d(grid[y]!, inverse)
  for (let x = 0; x < n; x++) {
    const col: Complex[] = []
    for (let y = 0; y < n; y++) col.push(grid[y]![x]!)
    fft1d(col, inverse)
    for (let y = 0; y < n; y++) grid[y]![x] = col[y]!
  }
}

/**
 * Build Phillips-like spectrum and inverse-FFT to displacement height map.
 */
export function generateOceanHeightField(params: OceanSpectrumParams): Float32Array {
  const n = params.resolution
  if (n < 4 || (n & (n - 1)) !== 0) {
    throw new Error('ocean resolution must be power-of-two >= 4')
  }
  const rand = lcg(params.seed)
  const spectrum: Complex[][] = []
  const windX = Math.cos(params.windAngle)
  const windZ = Math.sin(params.windAngle)

  for (let y = 0; y < n; y++) {
    const row: Complex[] = []
    for (let x = 0; x < n; x++) {
      const kx = ((x < n / 2 ? x : x - n) * (2 * Math.PI)) / n
      const kz = ((y < n / 2 ? y : y - n) * (2 * Math.PI)) / n
      const kLen = Math.hypot(kx, kz)
      if (kLen < 1e-6) {
        row.push({ re: 0, im: 0 })
        continue
      }
      const kHatX = kx / kLen
      const kHatZ = kz / kLen
      const align = Math.max(0, kHatX * windX + kHatZ * windZ)
      const phillips =
        (params.amplitude * Math.exp(-1 / (kLen * kLen * params.windSpeed * params.windSpeed))) /
        (kLen * kLen * kLen * kLen)
      const amp = Math.sqrt(Math.max(0, phillips)) * align
      const phase = rand() * Math.PI * 2
      row.push({
        re: amp * Math.cos(phase),
        im: amp * Math.sin(phase),
      })
    }
    spectrum.push(row)
  }

  fft2d(spectrum, true)

  const heights = new Float32Array(n * n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      heights[y * n + x] = spectrum[y]![x]!.re
    }
  }
  return heights
}

export function sampleOceanHeight(
  heights: Float32Array,
  resolution: number,
  u: number,
  v: number,
): number {
  const x = ((u % 1) + 1) % 1
  const z = ((v % 1) + 1) % 1
  const fx = x * (resolution - 1)
  const fz = z * (resolution - 1)
  const x0 = Math.floor(fx)
  const z0 = Math.floor(fz)
  const x1 = Math.min(resolution - 1, x0 + 1)
  const z1 = Math.min(resolution - 1, z0 + 1)
  const tx = fx - x0
  const tz = fz - z0
  const a = heights[z0 * resolution + x0]!
  const b = heights[z0 * resolution + x1]!
  const c = heights[z1 * resolution + x0]!
  const d = heights[z1 * resolution + x1]!
  const top = a + (b - a) * tx
  const bot = c + (d - c) * tx
  return top + (bot - top) * tz
}

export function proveOceanFft(): {
  passed: boolean
  letter: typeof OCEAN_FFT_LETTER
  resolution: number
  peakAbs: number
} {
  const resolution = 16
  const heights = generateOceanHeightField({
    resolution,
    windSpeed: 12,
    windAngle: 0.4,
    amplitude: 0.5,
    seed: 42,
  })
  let peakAbs = 0
  for (let i = 0; i < heights.length; i++) {
    peakAbs = Math.max(peakAbs, Math.abs(heights[i]!))
  }
  const same = generateOceanHeightField({
    resolution,
    windSpeed: 12,
    windAngle: 0.4,
    amplitude: 0.5,
    seed: 42,
  })
  let identical = true
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] !== same[i]) {
      identical = false
      break
    }
  }
  return {
    passed: OCEAN_FFT_WIRED && heights.length === resolution * resolution && peakAbs > 0 && identical,
    letter: OCEAN_FFT_LETTER,
    resolution,
    peakAbs,
  }
}
