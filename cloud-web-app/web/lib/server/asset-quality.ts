type AssetClass = 'image' | 'audio' | 'video' | 'model' | 'other'

type AssetQualityTier = 'studio' | 'good' | 'risky'

export type AssetQualityReport = {
  score: number
  tier: AssetQualityTier
  reasons: string[]
  recommendedActions: string[]
}

type AssetQualityInput = {
  name: string
  sizeBytes: number
  mimeType?: string | null
  assetClass: AssetClass
  warnings?: string[]
}

const CLASS_SIZE_TARGET_MB: Record<Exclude<AssetClass, 'other'>, number> = {
  image: 20,
  audio: 50,
  video: 200,
  model: 120,
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function extensionFromName(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

function expectedClassFromExtension(ext: string): AssetClass {
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'tga', 'hdr', 'exr'].includes(ext)) return 'image'
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return 'audio'
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
  if (['glb', 'gltf', 'fbx', 'obj', 'blend', 'dae', 'stl'].includes(ext)) return 'model'
  return 'other'
}

function inferTier(score: number): AssetQualityTier {
  if (score >= 85) return 'studio'
  if (score >= 65) return 'good'
  return 'risky'
}

export function buildAssetQualityReport(input: AssetQualityInput): AssetQualityReport {
  const warnings = input.warnings ?? []
  const reasons: string[] = []
  const recommendedActions: string[] = []
  let score = 82

  if (input.assetClass === 'other') {
    score -= 30
    reasons.push('asset class outside approved pipeline')
    recommendedActions.push('use approved classes: image/audio/video/model')
  }

  if (input.assetClass !== 'other') {
    const sizeMb = input.sizeBytes / (1024 * 1024)
    const targetMb = CLASS_SIZE_TARGET_MB[input.assetClass]
    if (sizeMb > targetMb) {
      const overflowRatio = sizeMb / targetMb
      const penalty = Math.min(25, Math.round((overflowRatio - 1) * 14))
      score -= penalty
      reasons.push(`size above recommended target for ${input.assetClass}`)
      recommendedActions.push(`compress/optimize to <= ${targetMb}MB when possible`)
    } else {
      score += 3
    }
  }

  const ext = extensionFromName(input.name)
  const expected = expectedClassFromExtension(ext)
  if (expected !== 'other' && input.assetClass !== 'other' && expected !== input.assetClass) {
    score -= 12
    reasons.push('file extension does not match inferred asset class')
    recommendedActions.push('normalize extension and declared type before publish')
  }

  const mime = (input.mimeType || '').toLowerCase()
  if (!mime) {
    score -= 4
    reasons.push('mime type missing')
  } else if (mime === 'application/octet-stream' && input.assetClass !== 'model') {
    score -= 6
    reasons.push('generic mime type reduces validation confidence')
    recommendedActions.push('send explicit mime type from client uploader')
  }

  for (const warning of warnings) {
    if (warning.includes('PARTIAL')) {
      score -= 6
    } else {
      score -= 3
    }
  }

  if (warnings.length > 0) {
    reasons.push('pipeline has partial validations')
    recommendedActions.push('run extended validation pipeline before production release')
  }

  score = clamp(0, score, 100)
  const tier = inferTier(score)

  if (recommendedActions.length === 0) {
    recommendedActions.push('ready for current pipeline constraints')
  }

  return {
    score,
    tier,
    reasons,
    recommendedActions,
  }
}

export function inferAssetClassFromNameAndMime(name: string, mimeType?: string | null): AssetClass {
  const extClass = expectedClassFromExtension(extensionFromName(name))
  if (extClass !== 'other') return extClass
  const mime = (mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime.includes('gltf') || mime.includes('model/')) return 'model'
  return 'other'
}
