import { describe, expect, it } from 'vitest'
import { signAssetProvenance, verifyAssetProvenance } from '@/lib/marketplace/provenance'

describe('cryptographic provenance signatures', () => {
  const prompt = 'scifi airlock door, detailed metal panels'
  const assetHash = 'a4f89d1b0288cd3b3a9b8a9e7f8d6a4c28f11c750a9c8b7c6d5e4f3a2b1c0d9e'
  const model = 'aethel-mesh-generator-v2'

  it('generates a valid, verifiable signature with a timestamp', () => {
    const provenance = signAssetProvenance(prompt, assetHash, model)

    expect(provenance.signature).toHaveLength(64)
    expect(provenance.keyId).toBe('aethel-v1')
    expect(provenance.timestamp).toBeDefined()

    const isValid = verifyAssetProvenance(prompt, assetHash, model, provenance)
    expect(isValid).toBe(true)
  })

  it('detects prompt modification / tampering', () => {
    const provenance = signAssetProvenance(prompt, assetHash, model)
    const tamperedPrompt = prompt + ' nsfw bypass attempt'

    const isValid = verifyAssetProvenance(tamperedPrompt, assetHash, model, provenance)
    expect(isValid).toBe(false)
  })

  it('detects model spoofing', () => {
    const provenance = signAssetProvenance(prompt, assetHash, model)
    const tamperedModel = 'cheaper-unlicensed-model'

    const isValid = verifyAssetProvenance(prompt, assetHash, tamperedModel, provenance)
    expect(isValid).toBe(false)
  })

  it('detects asset hash spoofing', () => {
    const provenance = signAssetProvenance(prompt, assetHash, model)
    const tamperedHash = 'b5g90e2c1399de4c4b0c9b0f8g9e7b5d39g22d861b0d9c8d7e6f5a3b2c1d0e9f'

    const isValid = verifyAssetProvenance(prompt, tamperedHash, model, provenance)
    expect(isValid).toBe(false)
  })

  it('rejects invalid or missing signature payloads gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyAssetProvenance(prompt, assetHash, model, null as any)).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(verifyAssetProvenance(prompt, assetHash, model, {} as any)).toBe(false)
  })
})
