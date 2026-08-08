/**
 * USD / glTF semantic import-export bridge (P2b BLOCKER 1-2 honesty fix).
 *
 * Root cause of the original bug: both `importSemanticAsset` and
 * `exportToIndustryStandard` were stubs — no WASM binary parser and no
 * ECS-to-node-hierarchy serializer exist yet — but they returned
 * `success: true` (import) / a bare empty `ArrayBuffer(0)` (export) instead
 * of failing closed. That is a direct Law XVI Zero-MVP violation
 * ("success: true + empty artifact"): a caller checking only `success`
 * would believe semantics were detected or a real payload was produced.
 *
 * Fix: never fabricate detection results or artifacts for an unimplemented
 * pipeline. Both methods now return a discriminated result and fail closed
 * with an honest `not_implemented` / `empty_payload` reason until the real
 * WASM parser (import) and ECS→node-hierarchy serializer (export) land.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('usd-gltf-exporter')

export interface SemanticImportOptions {
  autoRig: boolean
  inferPhysics: boolean
  extractMetadata: boolean
}

export type UniversalSceneManagerBlockReason = 'not_implemented' | 'empty_payload'

export interface SemanticImportSuccess {
  success: true
  semantics: {
    category: string
    confidence: number
    recommendedPhysics: string
  }
  entityPayload: Record<string, unknown>
}

export interface SemanticImportDenied {
  success: false
  blockedReason: UniversalSceneManagerBlockReason
  message: string
}

export type SemanticImportResult = SemanticImportSuccess | SemanticImportDenied

export interface SceneExportSuccess {
  success: true
  buffer: ArrayBuffer
  format: 'usdz' | 'gltf'
  byteLength: number
}

export interface SceneExportDenied {
  success: false
  blockedReason: UniversalSceneManagerBlockReason
  message: string
  format: 'usdz' | 'gltf'
}

export type SceneExportResult = SceneExportSuccess | SceneExportDenied

export class UniversalSceneManager {
  /**
   * Importa um arquivo .usd ou .gltf e aplica reconhecimento semântico.
   *
   * HELD: the binary WASM semantic parser is not implemented. This never
   * fabricates a detected category/physics recommendation for a buffer it
   * did not actually parse (Law XVI — no `success: true` + empty artifact).
   */
  static async importSemanticAsset(
    fileBuffer: ArrayBuffer,
    format: 'usd' | 'gltf',
    options: SemanticImportOptions
  ): Promise<SemanticImportResult> {
    if (fileBuffer.byteLength === 0) {
      log.warn('semantic_import_empty_payload', { format })
      return {
        success: false,
        blockedReason: 'empty_payload',
        message: `UniversalSceneManager.importSemanticAsset received an empty ${format} buffer — refusing to report success on nothing.`,
      }
    }

    log.warn('semantic_import_not_implemented', {
      format,
      byteLength: fileBuffer.byteLength,
      options,
    })

    return {
      success: false,
      blockedReason: 'not_implemented',
      message:
        'Semantic asset import (WASM binary parser) is HELD — no fabricated category/physics detection is returned for unparsed geometry.',
    }
  }

  /**
   * Exporta a cena (Gráfico de Cena Neural / Espaço Latente) para o padrão da indústria.
   *
   * HELD: ECS-linear → node-hierarchy serialization is not implemented.
   * Returning an empty `ArrayBuffer(0)` as a bare success would violate
   * Law XVI, so this fails closed with an explicit reason instead.
   */
  static async exportToIndustryStandard(
    sceneId: string,
    format: 'usdz' | 'gltf'
  ): Promise<SceneExportResult> {
    log.warn('scene_export_not_implemented', { sceneId, format })

    return {
      success: false,
      blockedReason: 'not_implemented',
      message: `Scene export to ${format} is HELD — ECS-to-node-hierarchy serialization is not implemented; no artifact was fabricated.`,
      format,
    }
  }
}
