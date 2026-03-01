import { NextRequest, NextResponse } from 'next/server'
import { buildAssetQualityReport, type AssetQualityReport } from '@/lib/server/asset-quality'

export const MAX_ASSET_SIZE_MB = 10

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm'])
const MODEL_EXTENSIONS = new Set(['glb', 'gltf'])

export interface AssetProcessingResult {
  success: boolean
  optimizedSize?: number
  originalSize: number
  path?: string
  error?: string
}

export interface ProcessedAssetBuffer {
  buffer: Buffer
  optimized: boolean
  processor: 'none' | 'sharp'
  reason?: string
}

export type AssetValidationResult = {
  valid: boolean
  error?: string
  assetClass?: 'image' | 'audio' | 'video' | 'model' | 'other'
  capabilityStatus?: 'IMPLEMENTED' | 'PARTIAL'
  warnings?: string[]
  quality?: AssetQualityReport
}

function extensionFromName(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

function detectAssetClass(file: File): 'image' | 'audio' | 'video' | 'model' | 'other' {
  const mime = (file.type || '').toLowerCase()
  const ext = extensionFromName(file.name)

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (mime.includes('gltf') || MODEL_EXTENSIONS.has(ext)) return 'model'
  return 'other'
}

async function validateModelSignature(file: File): Promise<string | null> {
  const ext = extensionFromName(file.name)
  if (ext !== 'glb') return null

  const signature = Buffer.from(await file.slice(0, 4).arrayBuffer()).toString('ascii')
  if (signature !== 'glTF') {
    return 'MODEL_SIGNATURE_INVALID: GLB header mismatch.'
  }
  return null
}

export class AssetProcessor {
  static async validate(file: File): Promise<AssetValidationResult> {
    if (file.size > MAX_ASSET_SIZE_MB * 1024 * 1024) {
      return {
        valid: false,
        error: `Asset exceeds maximum size of ${MAX_ASSET_SIZE_MB}MB. (Size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      }
    }

    const assetClass = detectAssetClass(file)
    if (assetClass === 'other') {
      return {
        valid: false,
        error: 'UNSUPPORTED_ASSET_TYPE: accepted classes are image/audio/video/model.',
      }
    }

    const warnings: string[] = []
    let capabilityStatus: 'IMPLEMENTED' | 'PARTIAL' = 'IMPLEMENTED'

    if (assetClass === 'model') {
      const signatureError = await validateModelSignature(file)
      if (signatureError) {
        return { valid: false, error: signatureError }
      }
      capabilityStatus = 'PARTIAL'
      warnings.push('MODEL_RUNTIME_VALIDATION_PARTIAL: topology/rig checks are not fully automated yet.')
    }

    if (assetClass === 'audio' || assetClass === 'video') {
      capabilityStatus = 'PARTIAL'
      warnings.push('MEDIA_PIPELINE_PARTIAL: transcode and continuity checks are not fully wired in this build.')
    }

    const quality = buildAssetQualityReport({
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      assetClass,
      warnings,
    })

    return { valid: true, assetClass, capabilityStatus, warnings, quality }
  }

  static async processImage(buffer: ArrayBuffer, _type: string): Promise<ProcessedAssetBuffer> {
    return {
      buffer: Buffer.from(buffer),
      optimized: false,
      processor: 'none',
      reason: 'IMAGE_OPTIMIZATION_BACKEND_NOT_CONFIGURED',
    }
  }
}

// Optional utility handler for integration tests and isolated upload flow checks.
export async function handleAssetUpload(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const validation = await AssetProcessor.validate(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const processed = await AssetProcessor.processImage(buffer, file.type)
    const assetId = crypto.randomUUID()

    return NextResponse.json({
      success: true,
      id: assetId,
      originalSize: file.size,
      optimizedSize: processed.buffer.byteLength,
      capabilityStatus: validation.capabilityStatus || 'IMPLEMENTED',
      validation: {
        assetClass: validation.assetClass,
        warnings: validation.warnings || [],
      },
      optimization: {
        enabled: processed.optimized,
        processor: processed.processor,
        reason: processed.reason || null,
      },
      message: processed.optimized ? 'Asset processed successfully' : 'Asset uploaded (optimization unavailable)',
    })
  } catch (error) {
    console.error('Asset upload failed', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
