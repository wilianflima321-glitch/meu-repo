import type { SFXParameters } from './ai-audio-engine-contracts'

export function generateSfxChannels(
  left: Float32Array,
  right: Float32Array,
  params: SFXParameters,
  sampleRate: number,
): void {
  switch (params.category) {
    case 'footstep':
      generateFootstepSFX(left, right, params, sampleRate);
      break;
    case 'impact':
      generateImpactSFX(left, right, params, sampleRate);
      break;
    case 'explosion':
      generateExplosionSFX(left, right, params, sampleRate);
      break;
    case 'ambient':
      generateAmbientSFX(left, right, params, sampleRate);
      break;
    case 'weapon':
      generateWeaponSFX(left, right, params, sampleRate);
      break;
    case 'magic':
      generateMagicSFX(left, right, params, sampleRate);
      break;
    default:
      generateGenericSFX(left, right, params, sampleRate);
  }
}

function generateFootstepSFX(left: Float32Array, right: Float32Array, params: SFXParameters, sampleRate: number): void {
  const length = left.length;
  let attack = 0.005;
  let decay = 0.1;
  let frequency = 200;
  let noiseAmount = 0.5;

  switch (params.material) {
    case 'wood':
      attack = 0.002;
      decay = 0.08;
      frequency = 300;
      noiseAmount = 0.3;
      break;
    case 'metal':
      attack = 0.001;
      decay = 0.15;
      frequency = 800;
      noiseAmount = 0.2;
      break;
    case 'stone':
      attack = 0.003;
      decay = 0.05;
      frequency = 400;
      noiseAmount = 0.6;
      break;
    case 'grass':
      attack = 0.01;
      decay = 0.1;
      frequency = 100;
      noiseAmount = 0.8;
      break;
    case 'water':
      attack = 0.01;
      decay = 0.2;
      frequency = 150;
      noiseAmount = 0.9;
      break;
    case 'snow':
      attack = 0.02;
      decay = 0.15;
      frequency = 80;
      noiseAmount = 0.7;
      break;
  }

  const intensityMod = params.intensity || 0.5;
  decay *= 1 + intensityMod;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let envelope = 0;
    if (t < attack) {
      envelope = t / attack;
    } else if (t < attack + decay) {
      envelope = 1 - (t - attack) / decay;
    }
    envelope = Math.pow(envelope, 2);

    const tonal = Math.sin(2 * Math.PI * frequency * t) * (1 - noiseAmount);
    const noise = (Math.random() * 2 - 1) * noiseAmount;
    const pitchVar = 1 + (Math.random() - 0.5) * params.pitchVariation;
    const sample = (tonal + noise) * envelope * intensityMod * pitchVar;
    left[i] = sample;
    right[i] = sample * (0.9 + Math.random() * 0.2);
  }
}

function generateImpactSFX(left: Float32Array, right: Float32Array, params: SFXParameters, sampleRate: number): void {
  const length = left.length;
  const intensityMod = params.intensity || 0.5;
  const sizeMultiplier = sizeToMultiplier(params.size);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp((-t * 20) / sizeMultiplier) * intensityMod;
    const low = Math.sin(2 * Math.PI * 60 * sizeMultiplier * t);
    const mid = Math.sin(2 * Math.PI * 200 * t) * 0.5;
    const high = Math.sin(2 * Math.PI * 800 * t) * 0.3;
    const transient = i < sampleRate * 0.01 ? (Math.random() * 2 - 1) * 0.5 : 0;
    const sample = (low + mid + high + transient) * envelope;
    left[i] = sample;
    right[i] = sample;
  }
}

function generateExplosionSFX(left: Float32Array, right: Float32Array, params: SFXParameters, sampleRate: number): void {
  const length = left.length;
  const intensityMod = params.intensity || 0.8;
  const sizeMultiplier = sizeToMultiplier(params.size);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = t < 0.02 ? t / 0.02 : Math.exp((-(t - 0.02) * 3) / sizeMultiplier);
    const rumble = Math.sin(2 * Math.PI * 30 * sizeMultiplier * t) * 0.6;
    const crackle = (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.4;
    const debris = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.3;
    const sample = (rumble + crackle + debris) * envelope * intensityMod;
    left[i] = sample;
    right[i] = sample * (0.95 + Math.random() * 0.1);
  }
}

function generateAmbientSFX(left: Float32Array, right: Float32Array, params: SFXParameters, sampleRate: number): void {
  const length = left.length;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const lfo = Math.sin(2 * Math.PI * 0.1 * t) * 0.5 + 0.5;
    const noise = (Math.random() * 2 - 1) * 0.3;
    let envelope = 1;
    const fadeTime = 0.5;
    if (t < fadeTime) {
      envelope = t / fadeTime;
    } else if (t > params.duration - fadeTime) {
      envelope = (params.duration - t) / fadeTime;
    }
    const sample = noise * lfo * envelope * (params.intensity || 0.5);
    left[i] = sample;
    right[i] = sample * (0.8 + Math.random() * 0.4);
  }
}

function generateWeaponSFX(left: Float32Array, right: Float32Array, params: SFXParameters, sampleRate: number): void {
  const length = left.length;
  const intensityMod = params.intensity || 0.9;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 30) * intensityMod;
    const crack = i < sampleRate * 0.002 ? Math.random() * 2 - 1 : 0;
    const body = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t * 15);
    const tail = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.2;
    const sample = (crack + body + tail) * envelope;
    left[i] = sample;
    right[i] = sample;
  }
}

function generateMagicSFX(left: Float32Array, right: Float32Array, params: SFXParameters, sampleRate: number): void {
  const length = left.length;
  const intensityMod = params.intensity || 0.7;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * t) / params.duration) * intensityMod;
    const pitchSweep = 200 + Math.sin((Math.PI * t) / params.duration) * 600;
    const tone1 = Math.sin(2 * Math.PI * pitchSweep * t);
    const tone2 = Math.sin(2 * Math.PI * pitchSweep * 1.5 * t) * 0.5;
    const tone3 = Math.sin(2 * Math.PI * pitchSweep * 2 * t) * 0.25;
    const shimmer = Math.sin(2 * Math.PI * 2000 * t) * Math.sin(2 * Math.PI * 5 * t) * 0.1;
    const sample = (tone1 + tone2 + tone3 + shimmer) * envelope;
    const spread = Math.sin(2 * Math.PI * 2 * t) * 0.5;
    left[i] = sample * (1 - spread * 0.3);
    right[i] = sample * (1 + spread * 0.3);
  }
}

function generateGenericSFX(left: Float32Array, right: Float32Array, params: SFXParameters, sampleRate: number): void {
  const length = left.length;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 5) * (params.intensity || 0.5);
    const noise = Math.random() * 2 - 1;
    const sample = noise * envelope;
    left[i] = sample;
    right[i] = sample;
  }
}

function sizeToMultiplier(size: SFXParameters['size']): number {
  switch (size) {
    case 'tiny':
      return 0.3;
    case 'small':
      return 0.6;
    case 'medium':
      return 1;
    case 'large':
      return 1.5;
    case 'huge':
      return 2.5;
  }
}
