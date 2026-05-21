'use client';
// @aethel-heavy-async-boundary render-gated post-processing runtime.

import * as THREE from 'three';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BloomPass } from './bloom-pass';
import { ChromaticAberrationPass } from './chromatic-aberration-pass';
import { ColorGradingPass } from './color-grading-pass';
import { EffectComposer } from './effect-composer';
import { FilmGrainPass } from './film-grain-pass';
import { TonemappingPass } from './tonemapping-pass';
import { VignettePass } from './vignette-pass';

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
