/**
 * Letter bt — Radiance frame wire into AAARenderer / ScalableRenderGraph path.
 * Letter by — CLOUD-001 depth blend + god-rays in atmosphere composite (post-composer).
 * Letter cf — RT/shadow/god-rays composite into visible frame when capability allows;
 *             real enable callers live in radiance-viewport-enable.ts.
 *
 * Wires RayTracingManager (BVH + Denoiser), CascadeVsmShadowRuntime,
 * and VolumetricCloudRenderer into the live frame with Law XV degrade.
 * Fail-closed on weak GPU (webgl2: no RT / no god-rays beauty).
 */

// @aethel-heavy-async-boundary

import * as THREE from 'three'
import { RayTracingManager } from '@/lib/ray-tracing'
import { CascadeVsmShadowRuntime } from '@/lib/pbr-shadow-runtime'
import {
  VolumetricCloudRenderer,
  VOLUMETRIC_CLOUDS_SHIP_STATUS,
  MARKETING_FULL_VOLUMETRIC_AAA_ALLOWED,
} from '@/lib/volumetric-clouds'
import {
  resolveRadianceCapabilityBudget,
  type RadianceCapabilityBudget,
} from '@/lib/radiance/radiance-capability-budget'
import {
  RadianceRtCompositePass,
  createRadianceRtCompositePass,
  shouldCompositeRtToFrame,
} from '@/lib/radiance/radiance-rt-composite'

export const RADIANCE_FRAME_WIRED = true as const

export interface RadianceFrameWireOptions {
  capabilityScore: number
  /** Explicit opt-in for software RT (project setting). Default false on weak GPU. */
  rayTracingOptIn?: boolean
  cloudsOptIn?: boolean
  shadowsOptIn?: boolean
}

export interface RadianceFrameTickResult {
  budget: RadianceCapabilityBudget
  rtRendered: boolean
  cloudsRendered: boolean
  shadowsRendered: boolean
  depthBlendUsed: boolean
  godRaysUsed: boolean
  /** Letter cf — software RT blitted onto visible framebuffer. */
  rtComposited: boolean
  rtTexture: THREE.Texture | null
  frameHooksReal: boolean
}

export class RadianceFrameWire {
  private budget: RadianceCapabilityBudget
  private rt: RayTracingManager | null = null
  private clouds: VolumetricCloudRenderer | null = null
  private shadows: CascadeVsmShadowRuntime | null = null
  private sun = new THREE.DirectionalLight(0xffffff, 1)
  private framesWithHooks = 0
  private disposed = false
  private opts: RadianceFrameWireOptions
  private lastTick: RadianceFrameTickResult | null = null
  private lastRtTexture: THREE.Texture | null = null
  /** Letter cf — additive RT overlay onto visible frame. */
  private rtComposite: RadianceRtCompositePass | null = null

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    opts: RadianceFrameWireOptions,
  ) {
    this.opts = { ...opts }
    this.budget = resolveRadianceCapabilityBudget(opts.capabilityScore)
    this.sun.position.set(40, 80, 20)
    this.sun.target.position.set(0, 0, 0)
    this.lazyInit()
  }

  private applyCloudBeauty(): void {
    if (!this.clouds) return
    this.clouds.setAdaptiveSteps(this.budget.cloudMaxSteps, this.budget.cloudLightSteps)
    this.clouds.setAdaptiveBeauty({
      depthBlendAllowed: this.budget.depthBlendAllowed,
      godRaysAllowed: this.budget.godRaysAllowed,
      godRaySamples: this.budget.godRaySamples,
      godRayIntensity: this.budget.godRayIntensity,
    })
  }

  private lazyInit(): void {
    const wantRt =
      this.opts.rayTracingOptIn !== false &&
      this.budget.rtInFrameAllowed
    if (wantRt && !this.rt) {
      this.rt = new RayTracingManager(this.renderer, this.scene, this.camera, {
        enabled: true,
        resolution: this.budget.rtResolution,
        samplesPerPixel: this.budget.rtSamplesPerPixel,
        maxBounces: this.budget.rtMaxBounces,
        denoiseEnabled: this.budget.rtDenoiseEnabled,
        enableGI: false,
      })
    }
    if (!wantRt && this.rt) {
      this.rt.dispose()
      this.rt = null
    }

    const wantClouds = this.opts.cloudsOptIn !== false && this.budget.cloudsInFrameAllowed
    if (wantClouds && !this.clouds) {
      this.clouds = new VolumetricCloudRenderer(this.renderer, this.scene, this.camera, {
        godRaysEnabled: true,
        shadowsEnabled: this.budget.tier !== 'webgl2',
      })
    }
    if (this.clouds) {
      this.applyCloudBeauty()
    }

    const wantShadows = this.opts.shadowsOptIn !== false && this.budget.shadowTechnique !== 'off'
    if (wantShadows && !this.shadows) {
      this.shadows = CascadeVsmShadowRuntime.fromBudget(this.renderer, this.budget)
    } else if (this.shadows) {
      this.shadows.applyBudget(this.budget)
    }

    if (this.budget.rtInFrameAllowed && !this.rtComposite) {
      this.rtComposite = createRadianceRtCompositePass()
    }
    if (!this.budget.rtInFrameAllowed && this.rtComposite) {
      this.rtComposite.dispose()
      this.rtComposite = null
    }
  }

  setCapabilityScore(score: number): void {
    this.opts.capabilityScore = score
    this.budget = resolveRadianceCapabilityBudget(score)
    this.lazyInit()
  }

  getBudget(): RadianceCapabilityBudget {
    return this.budget
  }

  async rebuildAccelerationStructure(): Promise<void> {
    if (this.rt) await this.rt.rebuildAccelerationStructure()
  }

  setSunDirection(dir: THREE.Vector3): void {
    this.sun.position.copy(dir).multiplyScalar(100)
    this.rt?.setSunDirection(dir)
    this.clouds?.setSunDirection(dir)
  }

  resize(width: number, height: number): void {
    this.rt?.resize(width, height)
  }

  /** Pre-composer: shadows + software RT (letter bt). */
  tickPre(dt: number): void {
    if (this.disposed) return

    if (this.shadows && this.budget.shadowTechnique !== 'off') {
      this.shadows.render(this.scene, this.sun)
    }

    this.lastRtTexture = null
    if (this.rt && this.budget.rtInFrameAllowed) {
      this.lastRtTexture = this.rt.render()
    }

    if (this.clouds && this.budget.cloudsInFrameAllowed) {
      this.clouds.update(dt)
    }
  }

  /** Post-composer atmosphere: depth-aware clouds + god-rays (by) + RT composite (cf). */
  tickPost(_dt?: number): RadianceFrameTickResult {
    if (this.disposed) {
      return {
        budget: this.budget,
        rtRendered: false,
        cloudsRendered: false,
        shadowsRendered: false,
        depthBlendUsed: false,
        godRaysUsed: false,
        rtComposited: false,
        rtTexture: null,
        frameHooksReal: false,
      }
    }

    const shadowsRendered =
      !!this.shadows &&
      this.budget.shadowTechnique !== 'off' &&
      this.shadows.getFramesRendered() > 0
    const rtRendered = this.lastRtTexture !== null
    const rtTexture = this.lastRtTexture

    let cloudsRendered = false
    let depthBlendUsed = false
    let godRaysUsed = false

    if (this.clouds && this.budget.cloudsInFrameAllowed) {
      const composite = this.clouds.render()
      cloudsRendered = composite.cloudsDrawn
      depthBlendUsed = composite.depthBlendUsed
      godRaysUsed = composite.godRaysUsed
    }

    // Letter cf — software RT into visible frame when budget allows (never HW RT claim).
    let rtComposited = false
    if (
      this.rtComposite &&
      rtTexture &&
      shouldCompositeRtToFrame({
        rtInFrameAllowed: this.budget.rtInFrameAllowed,
        rtTexturePresent: true,
      })
    ) {
      rtComposited = this.rtComposite.composite(this.renderer, rtTexture)
    }

    const frameHooksReal =
      rtRendered || cloudsRendered || shadowsRendered || rtComposited
    if (frameHooksReal) this.framesWithHooks += 1

    this.lastTick = {
      budget: this.budget,
      rtRendered,
      cloudsRendered,
      shadowsRendered,
      depthBlendUsed,
      godRaysUsed,
      rtComposited,
      rtTexture,
      frameHooksReal,
    }
    return this.lastTick
  }

  /**
   * Full tick when caller does not split pre/post (compat).
   * Prefer tickPre → composer → tickPost for depth-correct overlay.
   */
  tick(dt: number): RadianceFrameTickResult {
    this.tickPre(dt)
    return this.tickPost(dt)
  }

  getLastTick(): RadianceFrameTickResult | null {
    return this.lastTick
  }

  getFramesWithHooks(): number {
    return this.framesWithHooks
  }

  getShadowHonesty() {
    return this.shadows?.getHonesty() ?? null
  }

  getCloudShipStatus(): typeof VOLUMETRIC_CLOUDS_SHIP_STATUS {
    return VOLUMETRIC_CLOUDS_SHIP_STATUS
  }

  marketingFullVolumetricAaaAllowed(): boolean {
    return MARKETING_FULL_VOLUMETRIC_AAA_ALLOWED
  }

  isRtActive(): boolean {
    return this.rt !== null && this.budget.rtInFrameAllowed
  }

  isCloudsActive(): boolean {
    return this.clouds !== null && this.budget.cloudsInFrameAllowed
  }

  getRtCompositeFrames(): number {
    return this.rtComposite?.getFramesComposited() ?? 0
  }

  dispose(): void {
    this.disposed = true
    this.rt?.dispose()
    this.rt = null
    this.clouds?.dispose()
    this.clouds = null
    this.shadows?.dispose()
    this.shadows = null
    this.rtComposite?.dispose()
    this.rtComposite = null
  }
}

export function createRadianceFrameWire(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts: RadianceFrameWireOptions,
): RadianceFrameWire {
  return new RadianceFrameWire(renderer, scene, camera, opts)
}

