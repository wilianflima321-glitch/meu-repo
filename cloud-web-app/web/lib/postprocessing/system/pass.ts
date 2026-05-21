// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';

export abstract class PostProcessingPass {
  abstract name: string;
  enabled = true;
  needsDepth = false;
  needsNormal = false;

  protected material: THREE.ShaderMaterial | null = null;
  protected renderTarget: THREE.WebGLRenderTarget | null = null;

  abstract getSettings(): Record<string, unknown>;
  abstract updateSettings(settings: Record<string, unknown>): void;
  abstract render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget | null,
    scene: THREE.Scene,
    camera: THREE.Camera,
    deltaTime: number
  ): void;

  dispose(): void {
    this.material?.dispose();
    this.renderTarget?.dispose();
  }
}
