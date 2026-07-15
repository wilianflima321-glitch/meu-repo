'use client';

// @aethel-heavy-async-boundary: VFX Studio runtime is loaded lazily from lib/engine.

import dynamic from 'next/dynamic';

export type {
  ColorGradient,
  EmitterConfig,
  Particle,
  ParticleEmitter,
  ParticleSystemState,
  SizeCurve,
  VelocityCurve,
} from '@aethel/engine/NiagaraVFX.runtime';

const NiagaraVFXRuntime = dynamic(() => import('@aethel/engine/NiagaraVFX.runtime'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
      Loading VFX editor...
    </div>
  ),
});

export default function NiagaraVFX() {
  return <NiagaraVFXRuntime />;
}
