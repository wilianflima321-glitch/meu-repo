/**
 * Post-Processing System - Sistema de Pós-Processamento
 * 
 * Sistema completo de efeitos visuais com:
 * - Bloom, DOF, SSAO, SSR
 * - Color grading/LUT
 * - Motion blur
 * - Vignette, Film Grain
 * - Chromatic aberration
 * - Tonemapping
 * - Effect composer/stack
 * 
 * @module lib/postprocessing/post-processing-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';
import { useState, useCallback, useRef, useEffect } from 'react';

export type {
  BloomSettings,
  ChromaticAberrationSettings,
  ColorGradingSettings,
  DOFSettings,
  FilmGrainSettings,
  LensDistortionSettings,
  MotionBlurSettings,
  PostProcessingSettings,
  SSAOSettings,
  SSRSettings,
  TonemappingMode,
  VignetteSettings,
} from './post-processing-types';

import {
  BloomPass,
  ChromaticAberrationPass,
  ColorGradingPass,
  FilmGrainPass,
  PostProcessingPass,
  TonemappingPass,
  VignettePass,
} from './post-processing-passes';
export {
  BloomPass,
  ChromaticAberrationPass,
  ColorGradingPass,
  FilmGrainPass,
  PostProcessingPass,
  TonemappingPass,
  VignettePass,
} from './post-processing-passes';

// ============================================================================
// EFFECT COMPOSER
// ============================================================================

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
      // Direct render without post-processing
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      return;
    }
    
    // Render scene to first target
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(scene, camera);
    
    // Get enabled passes
    const enabledPasses = this.passes.filter((p) => p.enabled);
    
    // Ping-pong between targets
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
      
      // Swap targets
      [readTarget, writeTarget] = [writeTarget, readTarget];
    }
    
    // Reset render target
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

// ============================================================================
// REACT HOOK
// ============================================================================

export function usePostProcessing(
  renderer: THREE.WebGLRenderer | null,
  width: number,
  height: number
) {
  const composerRef = useRef<EffectComposer | null>(null);
  const [enabled, setEnabled] = useState(true);
  
  useEffect(() => {
    if (renderer) {
      const composer = new EffectComposer(renderer, width, height);
      composerRef.current = composer;
      
      // Add default passes
      composer.addPass(new BloomPass(width, height));
      composer.addPass(new ColorGradingPass());
      composer.addPass(new VignettePass());
      composer.addPass(new FilmGrainPass());
      composer.addPass(new ChromaticAberrationPass());
      composer.addPass(new TonemappingPass());
      
      return () => {
        composer.dispose();
        composerRef.current = null;
      };
    }
  }, [renderer, width, height]);
  
  useEffect(() => {
    composerRef.current?.setSize(width, height);
  }, [width, height]);
  
  const render = useCallback((scene: THREE.Scene, camera: THREE.Camera, deltaTime?: number) => {
    composerRef.current?.render(scene, camera, deltaTime);
  }, []);
  
  const updatePass = useCallback(<T extends Record<string, unknown>>(
    passName: string,
    settings: T
  ) => {
    const pass = composerRef.current?.getPass(passName);
    if (pass) {
      pass.updateSettings(settings);
    }
  }, []);
  
  const togglePass = useCallback((passName: string, enabled: boolean) => {
    const pass = composerRef.current?.getPass(passName);
    if (pass) {
      pass.enabled = enabled;
    }
  }, []);
  
  return {
    composer: composerRef.current,
    enabled,
    setEnabled: (e: boolean) => {
      setEnabled(e);
      composerRef.current?.setEnabled(e);
    },
    render,
    updatePass,
    togglePass,
    getPass: (name: string) => composerRef.current?.getPass(name),
  };
}

const __defaultExport = {
  EffectComposer,
  BloomPass,
  ColorGradingPass,
  VignettePass,
  FilmGrainPass,
  ChromaticAberrationPass,
  TonemappingPass,
};

export default __defaultExport;
