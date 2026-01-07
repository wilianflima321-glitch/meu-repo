import React from 'react';
import { EffectComposer, Bloom, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { BlendFunction } from 'postprocessing';

export function AAAPostProcessing() {
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      {/* SMAA: Superior to MSAA for deferred/post-processed pipelines */}
      <SMAA preset={2} /> 

      {/* Bloom: Cinematic Glow */}
      <Bloom 
        luminanceThreshold={0.9}
        luminanceSmoothing={0.025}
        intensity={1.5}
        mipmapBlur 
      />

      {/* Tone Mapping: ACES Filmic is redundant if R3F Canvas uses it, 
          but adding explicitly ensures consistent look regardless of Canvas props */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
