/**
 * Letter cf — Software RT texture composite onto the visible frame.
 * Additive overlay only when Law XV budget allows RT in-frame.
 * Never claims HW RT / Lumen / Radiance GI.
 */

import * as THREE from 'three'

export const RADIANCE_RT_COMPOSITE_LETTER = 'cf' as const
export const RADIANCE_RT_COMPOSITE_WIRED = true as const

const RT_COMPOSITE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const RT_COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tRt;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  vec4 rt = texture2D(tRt, vUv);
  gl_FragColor = vec4(rt.rgb * uIntensity, rt.a * uIntensity);
}
`

/**
 * Fullscreen additive blit of software RT result onto the current framebuffer.
 */
export class RadianceRtCompositePass {
  private material: THREE.ShaderMaterial
  private mesh: THREE.Mesh
  private scene: THREE.Scene
  private ortho: THREE.OrthographicCamera
  private framesComposited = 0

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tRt: { value: null },
        uIntensity: { value: 0.35 },
      },
      vertexShader: RT_COMPOSITE_VERT,
      fragmentShader: RT_COMPOSITE_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    this.scene = new THREE.Scene()
    this.scene.add(this.mesh)
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  /**
   * Composite RT texture onto current render target (usually null = screen).
   * Returns true when a blit ran.
   */
  composite(
    renderer: THREE.WebGLRenderer,
    rtTexture: THREE.Texture,
    intensity = 0.35,
  ): boolean {
    this.material.uniforms.tRt.value = rtTexture
    this.material.uniforms.uIntensity.value = Math.max(0, Math.min(1, intensity))

    const currentTarget = renderer.getRenderTarget()
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.setRenderTarget(currentTarget)
    renderer.render(this.scene, this.ortho)
    renderer.autoClear = autoClear
    this.framesComposited += 1
    return true
  }

  getFramesComposited(): number {
    return this.framesComposited
  }

  dispose(): void {
    this.material.dispose()
    this.mesh.geometry.dispose()
  }
}

export function createRadianceRtCompositePass(): RadianceRtCompositePass {
  return new RadianceRtCompositePass()
}

/** Pure Law XV gate — Vitest without GPU. */
export function shouldCompositeRtToFrame(input: {
  rtInFrameAllowed: boolean
  rtTexturePresent: boolean
}): boolean {
  return input.rtInFrameAllowed === true && input.rtTexturePresent === true
}
