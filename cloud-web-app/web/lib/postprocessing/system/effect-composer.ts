// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';
import { EventEmitter } from 'events';
import { PostProcessingPass } from './pass';
import { type PostProcessingSettings } from './types';

export class EffectComposer extends EventEmitter {
  private renderer: THREE.WebGLRenderer;
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;

  private passes: PostProcessingPass[] = [];
  private enabled = true;

  private depthTexture: THREE.DepthTexture | null = null;
  private normalTarget: THREE.WebGLRenderTarget | null = null;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    super();

    this.renderer = renderer;

    const options: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };

    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, options);
    this.renderTargetB = new THREE.WebGLRenderTarget(width, height, options);
  }

  setSize(width: number, height: number): void {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);

    if (this.normalTarget) {
      this.normalTarget.setSize(width, height);
    }

    this.emit('resize', { width, height });
  }

  addPass(pass: PostProcessingPass): void {
    this.passes.push(pass);

    if (pass.needsDepth && !this.depthTexture) {
      this.setupDepthTexture();
    }

    if (pass.needsNormal && !this.normalTarget) {
      this.setupNormalTarget();
    }

    this.emit('passAdded', { pass });
  }

  removePass(pass: PostProcessingPass): void {
    const index = this.passes.indexOf(pass);
    if (index !== -1) {
      this.passes.splice(index, 1);
      this.emit('passRemoved', { pass });
    }
  }

  getPass<T extends PostProcessingPass>(name: string): T | undefined {
    return this.passes.find((p) => p.name === name) as T | undefined;
  }

  private setupDepthTexture(): void {
    this.depthTexture = new THREE.DepthTexture(
      this.renderTargetA.width,
      this.renderTargetA.height
    );
    this.renderTargetA.depthTexture = this.depthTexture;
  }

  private setupNormalTarget(): void {
    this.normalTarget = new THREE.WebGLRenderTarget(
      this.renderTargetA.width,
      this.renderTargetA.height,
      {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      }
    );
  }

  render(scene: THREE.Scene, camera: THREE.Camera, deltaTime = 0): void {
    if (!this.enabled || this.passes.length === 0) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      return;
    }

    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(scene, camera);

    const enabledPasses = this.passes.filter((p) => p.enabled);

    let readTarget = this.renderTargetA;
    let writeTarget = this.renderTargetB;

    for (let i = 0; i < enabledPasses.length; i++) {
      const pass = enabledPasses[i];
      const isLast = i === enabledPasses.length - 1;

      pass.render(
        this.renderer,
        readTarget.texture,
        isLast ? null : writeTarget,
        scene,
        camera,
        deltaTime
      );

      [readTarget, writeTarget] = [writeTarget, readTarget];
    }

    this.renderer.setRenderTarget(null);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emit('enabledChanged', { enabled });
  }

  dispose(): void {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
    this.depthTexture?.dispose();
    this.normalTarget?.dispose();

    for (const pass of this.passes) {
      pass.dispose();
    }

    this.passes = [];
    this.emit('disposed');
  }
}
