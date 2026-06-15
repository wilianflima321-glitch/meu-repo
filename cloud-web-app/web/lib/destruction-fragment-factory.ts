// @aethel-heavy-async-boundary Three.js runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';
import type { DestructibleConfig, FragmentData } from './destruction-contracts';
import { VoronoiFractureGenerator } from './destruction-fracture-generator';

export function createDestructionFragments(input: {
  id: string;
  mesh: THREE.Mesh;
  material: THREE.Material;
  config: DestructibleConfig;
  impactPoint: THREE.Vector3;
  impactForce: number;
  complete: boolean;
  fractureGenerator: VoronoiFractureGenerator;
}): FragmentData[] {
  input.mesh.geometry.computeBoundingBox();
  const bounds = input.mesh.geometry.boundingBox!.clone();
  bounds.applyMatrix4(input.mesh.matrixWorld);

  const fragmentCount = input.complete
    ? input.config.fragmentCount
    : Math.ceil(input.config.fragmentCount / 2);

  const points = generateBiasedDestructionPoints(bounds, input.impactPoint, fragmentCount);
  const cells = input.fractureGenerator.generateCells(points, bounds);

  return cells.map((cell, index) => {
    const fragmentGeometry = input.fractureGenerator.cellToGeometry(cell);
    fragmentGeometry.computeBoundingBox();

    const center = new THREE.Vector3();
    fragmentGeometry.boundingBox!.getCenter(center);
    fragmentGeometry.translate(-center.x, -center.y, -center.z);

    const fragmentMesh = new THREE.Mesh(fragmentGeometry, input.material.clone());
    fragmentMesh.position.copy(center);
    fragmentMesh.castShadow = input.mesh.castShadow;
    fragmentMesh.receiveShadow = input.mesh.receiveShadow;

    const toFragment = center.clone().sub(input.impactPoint).normalize();
    const velocityMagnitude = input.impactForce * (0.5 + Math.random() * 0.5);

    return {
      id: `${input.id}_frag_${index}`,
      mesh: fragmentMesh,
      velocity: toFragment.multiplyScalar(velocityMagnitude),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      ),
      mass: 1,
      lifetime: input.config.debrisLifetime,
      spawnTime: Date.now() / 1000,
      active: true,
    };
  });
}

function generateBiasedDestructionPoints(
  bounds: THREE.Box3,
  impactPoint: THREE.Vector3,
  count: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [impactPoint.clone()];
  const size = new THREE.Vector3();
  bounds.getSize(size);

  for (let i = 1; i < count; i++) {
    const bias = Math.random() < 0.6 ? 0.3 : 1.0;
    const point = new THREE.Vector3(
      bounds.min.x + Math.random() * size.x,
      bounds.min.y + Math.random() * size.y,
      bounds.min.z + Math.random() * size.z
    );

    point.lerp(impactPoint, 1 - bias);
    points.push(point);
  }

  return points;
}
