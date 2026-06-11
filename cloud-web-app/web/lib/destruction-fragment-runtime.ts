import * as THREE from 'three';
import type { FragmentData } from './destruction-contracts';

const FRAGMENT_GRAVITY = new THREE.Vector3(0, -9.81, 0);

export function updateDestructionFragment(input: {
  fragment: FragmentData;
  deltaTime: number;
  enablePhysics: boolean;
  currentTime: number;
  deactivate: (fragment: FragmentData) => void;
}): void {
  const { fragment, deltaTime, enablePhysics, currentTime, deactivate } = input;
  if (!fragment.active) return;

  const age = currentTime - fragment.spawnTime;
  if (age > fragment.lifetime) {
    deactivate(fragment);
    return;
  }

  if (enablePhysics) {
    applyFragmentPhysics(fragment, deltaTime);
  }

  fadeFragmentNearLifetimeEnd(fragment, age);
}

export function deactivateDestructionFragment(input: {
  fragment: FragmentData;
  scene: THREE.Scene;
}): void {
  input.fragment.active = false;
  input.scene.remove(input.fragment.mesh);
  input.fragment.mesh.geometry.dispose();
  (input.fragment.mesh.material as THREE.Material).dispose();
}

export function spawnDestructionDust(scene: THREE.Scene, position: THREE.Vector3): void {
  const particleCount = 50;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x888888,
    size: 0.5,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  setTimeout(() => {
    scene.remove(particles);
    geometry.dispose();
    material.dispose();
  }, 2000);
}

function applyFragmentPhysics(fragment: FragmentData, deltaTime: number): void {
  fragment.velocity.addScaledVector(FRAGMENT_GRAVITY, deltaTime);
  fragment.velocity.multiplyScalar(0.99);
  fragment.angularVelocity.multiplyScalar(0.98);
  fragment.mesh.position.addScaledVector(fragment.velocity, deltaTime);
  fragment.mesh.rotation.x += fragment.angularVelocity.x * deltaTime;
  fragment.mesh.rotation.y += fragment.angularVelocity.y * deltaTime;
  fragment.mesh.rotation.z += fragment.angularVelocity.z * deltaTime;

  if (fragment.mesh.position.y < 0) {
    fragment.mesh.position.y = 0;
    fragment.velocity.y *= -0.3;
    fragment.velocity.x *= 0.7;
    fragment.velocity.z *= 0.7;
    fragment.angularVelocity.multiplyScalar(0.5);
  }
}

function fadeFragmentNearLifetimeEnd(fragment: FragmentData, age: number): void {
  const fadeStart = fragment.lifetime * 0.7;
  if (age <= fadeStart) return;

  const fadeProgress = (age - fadeStart) / (fragment.lifetime - fadeStart);
  const material = fragment.mesh.material as THREE.MeshStandardMaterial;
  if (material.transparent !== true) {
    material.transparent = true;
  }
  material.opacity = 1 - fadeProgress;
}
