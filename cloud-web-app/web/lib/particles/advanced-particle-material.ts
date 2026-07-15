// @aethel-heavy-async-boundary Particle shader setup belongs to Studio/runtime, never public route shells.
import * as THREE from 'three';
import type { BlendMode, ParticleSystemSettings } from './advanced-particle-system-types';

const PARTICLE_VERTEX_SHADER = `
  attribute vec4 color;
  attribute float size;
  attribute float rotation;

  varying vec4 vColor;
  varying float vRotation;

  void main() {
    vColor = color;
    vRotation = rotation;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  uniform sampler2D pointTexture;
  uniform float uTime;

  varying vec4 vColor;
  varying float vRotation;

  void main() {
    vec2 center = gl_PointCoord - 0.5;

    float c = cos(vRotation);
    float s = sin(vRotation);
    vec2 rotated = vec2(
      center.x * c - center.y * s,
      center.x * s + center.y * c
    ) + 0.5;

    vec4 texColor = texture2D(pointTexture, rotated);

    float dist = length(center) * 2.0;
    float alpha = 1.0 - smoothstep(0.8, 1.0, dist);

    gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
  }
`;

const BLEND_MODES: Record<BlendMode, THREE.Blending> = {
  additive: THREE.AdditiveBlending,
  normal: THREE.NormalBlending,
  multiply: THREE.MultiplyBlending,
  screen: THREE.CustomBlending,
};

export function createParticleMaterial(settings: ParticleSystemSettings): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: null },
      uTime: { value: 0 },
    },
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: BLEND_MODES[settings.particle.blendMode],
  });

  if (settings.particle.texture) {
    new THREE.TextureLoader().load(settings.particle.texture, (texture) => {
      material.uniforms.pointTexture.value = texture;
    });
  }

  return material;
}
