#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { PNG } from 'pngjs'

const ROOT = process.cwd()
const failures = []
const warnings = []

const requiredScreenshots = [
  {
    publicPath: 'public/screenshots/dashboard.png',
    capturedPath: 'output/playwright/v22-authenticated/desktop-dashboard.png',
    label: 'dashboard',
  },
  {
    publicPath: 'public/screenshots/editor.png',
    capturedPath: 'output/playwright/v22-authenticated/desktop-ide.png',
    label: 'ide',
    minTransitionRatio: 0.025,
  },
  {
    publicPath: 'public/screenshots/mobile.png',
    capturedPath: 'output/playwright/v22-authenticated/mobile-dashboard.png',
    label: 'mobile dashboard',
  },
  {
    publicPath: 'public/product-proof/studio-home.png',
    capturedPath: 'output/playwright/v22-authenticated/desktop-studio.png',
    label: 'landing product proof',
  },
]

function readBuffer(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return null
  }
  return fs.readFileSync(absolutePath)
}

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function pngStats(buffer, relativePath) {
  try {
    const image = PNG.sync.read(buffer)
    let transitions = 0
    let samples = 0
    const stepX = Math.max(1, Math.floor(image.width / 96))
    const stepY = Math.max(1, Math.floor(image.height / 54))
    for (let y = 0; y < image.height; y += stepY) {
      for (let x = 0; x + stepX < image.width; x += stepX) {
        const index = (image.width * y + x) << 2
        const nextIndex = (image.width * y + x + stepX) << 2
        const diff =
          Math.abs(image.data[index] - image.data[nextIndex]) +
          Math.abs(image.data[index + 1] - image.data[nextIndex + 1]) +
          Math.abs(image.data[index + 2] - image.data[nextIndex + 2])
        if (diff > 36) transitions += 1
        samples += 1
      }
    }
    return {
      width: image.width,
      height: image.height,
      transitionRatio: samples === 0 ? 0 : transitions / samples,
    }
  } catch (error) {
    failures.push(`${relativePath}: not a readable PNG (${error instanceof Error ? error.message : String(error)})`)
    return null
  }
}

const publicHashes = new Map()
for (const item of requiredScreenshots) {
  const buffer = readBuffer(item.publicPath)
  if (!buffer) continue
  const fileHash = hash(buffer)
  publicHashes.set(fileHash, [...(publicHashes.get(fileHash) ?? []), item.publicPath])

  if (buffer.length < 45_000) {
    failures.push(`${item.publicPath}: too small to be a real product screenshot (${buffer.length} bytes)`)
  }

  const stats = pngStats(buffer, item.publicPath)
  if (!stats) continue
  if (stats.width < 390 || stats.height < 700) {
    failures.push(`${item.publicPath}: dimensions ${stats.width}x${stats.height} are below product screenshot minimum`)
  }
  const minTransitionRatio = item.minTransitionRatio ?? 0.035
  if (stats.transitionRatio < minTransitionRatio) {
    failures.push(`${item.publicPath}: low visual transition ratio ${stats.transitionRatio.toFixed(3)} suggests logo/blank art, not product UI`)
  }

  const capturedBuffer = fs.existsSync(path.join(ROOT, item.capturedPath))
    ? fs.readFileSync(path.join(ROOT, item.capturedPath))
    : null
  if (capturedBuffer && hash(capturedBuffer) !== fileHash) {
    warnings.push(`${item.publicPath}: does not match latest authenticated capture ${item.capturedPath}`)
  }
}

for (const duplicates of publicHashes.values()) {
  if (duplicates.length > 1) {
    failures.push(`duplicate public screenshots detected: ${duplicates.join(', ')}`)
  }
}

const landing = fs.existsSync(path.join(ROOT, 'app/landing-v3.tsx'))
  ? fs.readFileSync(path.join(ROOT, 'app/landing-v3.tsx'), 'utf8')
  : ''
if (!landing.includes('/product-proof/studio-home.png')) {
  failures.push('app/landing-v3.tsx: landing proof must use the real captured studio-home.png asset')
}
if (landing.includes('/product-proof/studio-home.webp')) {
  failures.push('app/landing-v3.tsx: stale logo-only studio-home.webp proof is still referenced')
}

if (failures.length > 0) {
  console.error('[product-screenshot-evidence] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn('[product-screenshot-evidence] WARN')
  for (const warning of warnings) console.warn(`- ${warning}`)
}

console.log(`[product-screenshot-evidence] PASS screenshots=${requiredScreenshots.length}`)
