/**
 * P2b BLOCKER 1-2 honesty fix — `usd-gltf-exporter.ts`.
 *
 * Original bug: `UniversalSceneManager.importSemanticAsset` returned
 * `success: true` with a fabricated semantic detection and an empty
 * `entityPayload: {}` for a buffer that was never actually parsed (no WASM
 * parser exists), and `exportToIndustryStandard` returned a bare empty
 * `ArrayBuffer(0)` with no error signal at all — both are direct Law XVI
 * Zero-MVP violations ("success: true" + empty artifact). This suite proves
 * the fail-closed contract: neither method can report success without a
 * real, non-empty artifact.
 */

import { describe, expect, it } from 'vitest'

import { UniversalSceneManager } from '@/lib/production/usd-gltf-exporter'

describe('UniversalSceneManager — Law XVI Zero-MVP honesty (P2b BLOCKER 1-2)', () => {
  describe('importSemanticAsset', () => {
    it('never reports success: true for an unparsed non-empty buffer (no WASM parser yet)', async () => {
      const fileBuffer = new ArrayBuffer(64)
      const result = await UniversalSceneManager.importSemanticAsset(fileBuffer, 'gltf', {
        autoRig: true,
        inferPhysics: true,
        extractMetadata: true,
      })

      // The original bug: this used to be `success: true` with a fabricated
      // `semantics` object and an empty `entityPayload: {}`.
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.blockedReason).toBe('not_implemented')
      expect(result.message.length).toBeGreaterThan(0)
    })

    it('fails closed on an explicitly empty buffer with a distinct reason', async () => {
      const result = await UniversalSceneManager.importSemanticAsset(new ArrayBuffer(0), 'usd', {
        autoRig: false,
        inferPhysics: false,
        extractMetadata: false,
      })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.blockedReason).toBe('empty_payload')
    })

    it('regression guard: no code path returns success:true with an empty entityPayload', async () => {
      const buffers = [new ArrayBuffer(0), new ArrayBuffer(128)]
      for (const buffer of buffers) {
        const result = await UniversalSceneManager.importSemanticAsset(buffer, 'gltf', {
          autoRig: false,
          inferPhysics: false,
          extractMetadata: false,
        })
        if (result.success) {
          expect(Object.keys(result.entityPayload).length).toBeGreaterThan(0)
        } else {
          expect(result.success).toBe(false)
        }
      }
    })
  })

  describe('exportToIndustryStandard', () => {
    it('never reports success on an empty ArrayBuffer(0) — fails closed instead (HELD)', async () => {
      const result = await UniversalSceneManager.exportToIndustryStandard('scene-1', 'usdz')

      // The original bug: this used to resolve `new ArrayBuffer(0)` directly
      // with no success/failure signal at all — any caller checking
      // `success: true` semantics on this could not even detect the empty
      // payload since there was no discriminant field.
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.blockedReason).toBe('not_implemented')
      expect(result.format).toBe('usdz')
    })

    it('regression guard: any success result must carry a non-empty buffer', async () => {
      const result = await UniversalSceneManager.exportToIndustryStandard('scene-2', 'gltf')

      if (result.success) {
        expect(result.byteLength).toBeGreaterThan(0)
        expect(result.buffer.byteLength).toBeGreaterThan(0)
      } else {
        expect(result.success).toBe(false)
        expect(result.blockedReason).toBeTruthy()
      }
    })
  })
})
