// @aethel-heavy-async-boundary
/**
 * Letter bt — Cascade + Virtual Shadow Map hybrid (VRAM-honest).
 *
 * Critiques prior single 2048² orthographic path: one huge map burns VRAM and
 * serrates at distance. Hybrid keeps small cascades for near contact + optional
 * VSM atlas (paged conceptually as a single atlas RT) scaled by Law XV budget.
 * GT730 / webgl2: cascade-only, 512² — no VSM melt.
 */

import { THREE } from './pbr-three-namespace'
import {
  estimateShadowVramMb,
  type RadianceCapabilityBudget,
} from '@/lib/radiance/radiance-capability-budget'

export type ShadowTechnique = 'cascade' | 'cascade-vsm-hybrid'

export interface CascadeShadowConfig {
  cascades: number
  mapSize: number
  /** 0 disables VSM atlas (cascade-only). */
  vsmAtlasSize: number
  technique: ShadowTechnique
}

export interface ShadowMapHonesty {
  technique: ShadowTechnique | 'legacy-single'
  cascades: number
  mapSize: number
  vsmAtlasSize: number
  estimatedVramMb: number
  serrationMitigated: boolean
  vsmPaged: boolean
  notes: string[]
}

/** Legacy single-map renderer — preserved for callers; prefer CascadeVsmShadowRuntime. */
export class ShadowMapRenderer {
  private shadowMap: THREE.WebGLRenderTarget
  private shadowCamera: THREE.OrthographicCamera
  private depthMaterial: THREE.MeshDepthMaterial
  private shadowMatrix: THREE.Matrix4
  constructor(
    private renderer: THREE.WebGLRenderer,
    size: number = 2048,
  ) {
    this.shadowMap = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })
    this.shadowCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 500)
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    })
    this.shadowMatrix = new THREE.Matrix4()
  }
  render(scene: THREE.Scene, light: THREE.DirectionalLight): void {
    this.shadowCamera.position.copy(light.position)
    this.shadowCamera.lookAt(light.target.position)
    this.shadowCamera.updateMatrixWorld()
    this.shadowMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0,
    )
    this.shadowMatrix.multiply(this.shadowCamera.projectionMatrix)
    this.shadowMatrix.multiply(this.shadowCamera.matrixWorldInverse)
    const currentRenderTarget = this.renderer.getRenderTarget()
    this.renderer.setRenderTarget(this.shadowMap)
    this.renderer.clear()
    scene.overrideMaterial = this.depthMaterial
    this.renderer.render(scene, this.shadowCamera)
    scene.overrideMaterial = null
    this.renderer.setRenderTarget(currentRenderTarget)
  }
  getShadowMap(): THREE.Texture {
    return this.shadowMap.texture
  }
  getShadowMatrix(): THREE.Matrix4 {
    return this.shadowMatrix
  }
  dispose(): void {
    this.shadowMap.dispose()
    this.depthMaterial.dispose()
  }
}

/**
 * Cascade (+ optional VSM atlas) shadow runtime.
 * Wire from RadianceFrameWire with Law XV budget — never allocates 4×2048 on GT730.
 */
export class CascadeVsmShadowRuntime {
  private cascades: THREE.WebGLRenderTarget[] = []
  private cascadeCameras: THREE.OrthographicCamera[] = []
  private vsmAtlas: THREE.WebGLRenderTarget | null = null
  private depthMaterial: THREE.MeshDepthMaterial
  private shadowMatrices: THREE.Matrix4[] = []
  private config: CascadeShadowConfig
  private framesRendered = 0

  constructor(
    private renderer: THREE.WebGLRenderer,
    config: CascadeShadowConfig,
  ) {
    this.config = { ...config }
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    })
    this.rebuildTargets()
  }

  static fromBudget(renderer: THREE.WebGLRenderer, budget: RadianceCapabilityBudget): CascadeVsmShadowRuntime | null {
    if (budget.shadowTechnique === 'off') return null
    const technique: ShadowTechnique =
      budget.shadowTechnique === 'cascade-vsm-hybrid' ? 'cascade-vsm-hybrid' : 'cascade'
    return new CascadeVsmShadowRuntime(renderer, {
      cascades: Math.max(1, budget.shadowCascades),
      mapSize: budget.shadowMapSize,
      vsmAtlasSize: budget.vsmAtlasSize,
      technique,
    })
  }

  private rebuildTargets(): void {
    this.disposeTargets()
    const n = Math.max(1, Math.min(4, this.config.cascades))
    for (let i = 0; i < n; i++) {
      this.cascades.push(
        new THREE.WebGLRenderTarget(this.config.mapSize, this.config.mapSize, {
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          format: THREE.RGBAFormat,
          type: THREE.FloatType,
        }),
      )
      // Near cascades tighter frustum → less serration without huge maps.
      const half = 20 * Math.pow(2, i)
      this.cascadeCameras.push(new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 500))
      this.shadowMatrices.push(new THREE.Matrix4())
    }
    if (this.config.technique === 'cascade-vsm-hybrid' && this.config.vsmAtlasSize > 0) {
      this.vsmAtlas = new THREE.WebGLRenderTarget(this.config.vsmAtlasSize, this.config.vsmAtlasSize, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
      })
    }
  }

  applyBudget(budget: RadianceCapabilityBudget): void {
    const next: CascadeShadowConfig = {
      cascades: Math.max(1, budget.shadowCascades),
      mapSize: budget.shadowMapSize,
      vsmAtlasSize: budget.vsmAtlasSize,
      technique: budget.shadowTechnique === 'cascade-vsm-hybrid' ? 'cascade-vsm-hybrid' : 'cascade',
    }
    if (
      next.cascades !== this.config.cascades ||
      next.mapSize !== this.config.mapSize ||
      next.vsmAtlasSize !== this.config.vsmAtlasSize ||
      next.technique !== this.config.technique
    ) {
      this.config = next
      this.rebuildTargets()
    }
  }

  render(scene: THREE.Scene, light: THREE.DirectionalLight): void {
    const current = this.renderer.getRenderTarget()
    scene.overrideMaterial = this.depthMaterial
    for (let i = 0; i < this.cascades.length; i++) {
      const cam = this.cascadeCameras[i]
      cam.position.copy(light.position)
      cam.lookAt(light.target.position)
      cam.updateMatrixWorld()
      const m = this.shadowMatrices[i]
      m.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      m.multiply(cam.projectionMatrix)
      m.multiply(cam.matrixWorldInverse)
      this.renderer.setRenderTarget(this.cascades[i])
      this.renderer.clear()
      this.renderer.render(scene, cam)
    }
    if (this.vsmAtlas) {
      // Atlas page 0 mirrors cascade 0 (soft filter path). Full virtual paging HELD.
      this.renderer.setRenderTarget(this.vsmAtlas)
      this.renderer.clear()
      this.renderer.render(scene, this.cascadeCameras[0])
    }
    scene.overrideMaterial = null
    this.renderer.setRenderTarget(current)
    this.framesRendered += 1
  }

  getCascadeTexture(index: number): THREE.Texture | null {
    return this.cascades[index]?.texture ?? null
  }

  getVsmAtlasTexture(): THREE.Texture | null {
    return this.vsmAtlas?.texture ?? null
  }

  getShadowMatrix(index: number): THREE.Matrix4 | null {
    return this.shadowMatrices[index] ?? null
  }

  getFramesRendered(): number {
    return this.framesRendered
  }

  getHonesty(): ShadowMapHonesty {
    const vram = estimateShadowVramMb(
      this.cascades.length,
      this.config.mapSize,
      this.vsmAtlas ? this.config.vsmAtlasSize : 0,
    )
    return {
      technique: this.config.technique,
      cascades: this.cascades.length,
      mapSize: this.config.mapSize,
      vsmAtlasSize: this.vsmAtlas ? this.config.vsmAtlasSize : 0,
      estimatedVramMb: vram,
      serrationMitigated: this.cascades.length >= 2,
      vsmPaged: false, // conceptual atlas only — full VT paging HELD
      notes: [
        this.config.technique === 'cascade-vsm-hybrid'
          ? 'cascade+VSM hybrid atlas (page-0 soft); full virtual paging HELD'
          : 'cascade-only — VSM atlas disabled for VRAM honesty',
        `estimated shadow VRAM ~${vram.toFixed(2)} MiB`,
      ],
    }
  }

  private disposeTargets(): void {
    for (const rt of this.cascades) rt.dispose()
    this.cascades = []
    this.cascadeCameras = []
    this.shadowMatrices = []
    this.vsmAtlas?.dispose()
    this.vsmAtlas = null
  }

  dispose(): void {
    this.disposeTargets()
    this.depthMaterial.dispose()
  }
}
