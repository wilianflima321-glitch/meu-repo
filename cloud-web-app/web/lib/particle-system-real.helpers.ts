import THREE from './particle-system-real-runtime';
import type { EmitterShape, ParticleCollider, ParticleData, ParticleForce } from './particle-system-real.types';

export interface ParticleForceDelta {
  fx: number;
  fy: number;
  fz: number;
}

export function sampleEmissionPosition(shape: EmitterShape): THREE.Vector3 {

    switch (shape.type) {
      case 'point':
        return new THREE.Vector3(0, 0, 0);

      case 'sphere': {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random()) * shape.radius;
        return new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }

      case 'box':
        return new THREE.Vector3(
          (Math.random() - 0.5) * shape.size.x,
          (Math.random() - 0.5) * shape.size.y,
          (Math.random() - 0.5) * shape.size.z
        );

      case 'cone': {
        const t = Math.random();
        const r = t * shape.radius;
        const theta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(
          r * Math.cos(theta),
          t * shape.height,
          r * Math.sin(theta)
        );
      }

      case 'circle': {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * shape.radius;
        return new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta));
      }

      case 'mesh': {
        // Pick random triangle and random point on it
        const positions = shape.geometry.getAttribute('position');
        const count = positions.count / 3;
        const triIndex = Math.floor(Math.random() * count) * 3;

        const a = new THREE.Vector3().fromBufferAttribute(positions, triIndex);
        const b = new THREE.Vector3().fromBufferAttribute(positions, triIndex + 1);
        const c = new THREE.Vector3().fromBufferAttribute(positions, triIndex + 2);

        const r1 = Math.random();
        const r2 = Math.random();
        const sqrtR1 = Math.sqrt(r1);

        return a.multiplyScalar(1 - sqrtR1)
          .add(b.multiplyScalar(sqrtR1 * (1 - r2)))
          .add(c.multiplyScalar(sqrtR1 * r2));
      }

      default:
        return new THREE.Vector3();
    }
  }

export function applyParticleForce(
  force: ParticleForce,
  px: number,
  py: number,
  pz: number,
  _deltaTime: number,
): ParticleForceDelta {
    switch (force.type) {
      case 'gravity':
        return {
          fx: (force.direction?.x || 0) * force.strength,
          fy: (force.direction?.y || -1) * force.strength,
          fz: (force.direction?.z || 0) * force.strength,
        };

      case 'wind':
        return {
          fx: (force.direction?.x || 1) * force.strength,
          fy: (force.direction?.y || 0) * force.strength,
          fz: (force.direction?.z || 0) * force.strength,
        };

      case 'vortex': {
        if (!force.position) return { fx: 0, fy: 0, fz: 0 };
        const dx = px - force.position.x;
        const dz = pz - force.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const strength = force.strength / Math.max(dist, 0.1);
        return {
          fx: -dz * strength,
          fy: 0,
          fz: dx * strength,
        };
      }

      case 'turbulence': {
        const freq = force.frequency || 1;
        return {
          fx: (Math.sin(px * freq + py * freq) * 2 - 1) * force.strength,
          fy: (Math.sin(py * freq + pz * freq) * 2 - 1) * force.strength,
          fz: (Math.sin(pz * freq + px * freq) * 2 - 1) * force.strength,
        };
      }

      case 'attractor': {
        if (!force.position) return { fx: 0, fy: 0, fz: 0 };
        const dx = force.position.x - px;
        const dy = force.position.y - py;
        const dz = force.position.z - pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const strength = force.strength / Math.max(dist * dist, 0.01);
        return {
          fx: dx * strength,
          fy: dy * strength,
          fz: dz * strength,
        };
      }

      case 'repulsor': {
        if (!force.position) return { fx: 0, fy: 0, fz: 0 };
        const dx = px - force.position.x;
        const dy = py - force.position.y;
        const dz = pz - force.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const strength = force.strength / Math.max(dist * dist, 0.01);
        return {
          fx: dx * strength,
          fy: dy * strength,
          fz: dz * strength,
        };
      }

      default:
        return { fx: 0, fy: 0, fz: 0 };
    }
  }

export function resolveParticleCollisions(
  index: number,
  particleData: ParticleData,
  colliders: ParticleCollider[],
): void {
  const i3 = index * 3;

  const px = particleData.position[i3];
  const py = particleData.position[i3 + 1];
  const pz = particleData.position[i3 + 2];

    for (const collider of colliders) {
      switch (collider.type) {
        case 'plane': {
          const normal = collider.normal || new THREE.Vector3(0, 1, 0);
          const d = (px - collider.position.x) * normal.x +
                    (py - collider.position.y) * normal.y +
                    (pz - collider.position.z) * normal.z;

          if (d < 0) {
            // Move particle back to surface
            particleData.position[i3] -= d * normal.x;
            particleData.position[i3 + 1] -= d * normal.y;
            particleData.position[i3 + 2] -= d * normal.z;

            // Reflect velocity
            const vn = particleData.velocity[i3] * normal.x +
                       particleData.velocity[i3 + 1] * normal.y +
                       particleData.velocity[i3 + 2] * normal.z;

            particleData.velocity[i3] -= (1 + collider.bounce) * vn * normal.x;
            particleData.velocity[i3 + 1] -= (1 + collider.bounce) * vn * normal.y;
            particleData.velocity[i3 + 2] -= (1 + collider.bounce) * vn * normal.z;

            // Apply friction
            particleData.velocity[i3] *= (1 - collider.friction);
            particleData.velocity[i3 + 1] *= (1 - collider.friction);
            particleData.velocity[i3 + 2] *= (1 - collider.friction);
          }
          break;
        }

        case 'sphere': {
          const dx = px - collider.position.x;
          const dy = py - collider.position.y;
          const dz = pz - collider.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < (collider.radius || 1)) {
            // Push particle out
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            particleData.position[i3] = collider.position.x + nx * (collider.radius || 1);
            particleData.position[i3 + 1] = collider.position.y + ny * (collider.radius || 1);
            particleData.position[i3 + 2] = collider.position.z + nz * (collider.radius || 1);

            // Reflect velocity
            const vn = particleData.velocity[i3] * nx +
                       particleData.velocity[i3 + 1] * ny +
                       particleData.velocity[i3 + 2] * nz;

            particleData.velocity[i3] -= (1 + collider.bounce) * vn * nx;
            particleData.velocity[i3 + 1] -= (1 + collider.bounce) * vn * ny;
            particleData.velocity[i3 + 2] -= (1 + collider.bounce) * vn * nz;
          }
          break;
        }

        case 'box': {
          const size = collider.size || new THREE.Vector3(1, 1, 1);
          const halfSize = size.clone().multiplyScalar(0.5);

          const local = new THREE.Vector3(
            px - collider.position.x,
            py - collider.position.y,
            pz - collider.position.z
          );

          if (Math.abs(local.x) < halfSize.x &&
              Math.abs(local.y) < halfSize.y &&
              Math.abs(local.z) < halfSize.z) {
            // Inside box - find closest face and push out
            const distX = halfSize.x - Math.abs(local.x);
            const distY = halfSize.y - Math.abs(local.y);
            const distZ = halfSize.z - Math.abs(local.z);

            if (distX < distY && distX < distZ) {
              const sign = Math.sign(local.x);
              particleData.position[i3] = collider.position.x + sign * halfSize.x;
              particleData.velocity[i3] *= -collider.bounce;
            } else if (distY < distZ) {
              const sign = Math.sign(local.y);
              particleData.position[i3 + 1] = collider.position.y + sign * halfSize.y;
              particleData.velocity[i3 + 1] *= -collider.bounce;
            } else {
              const sign = Math.sign(local.z);
              particleData.position[i3 + 2] = collider.position.z + sign * halfSize.z;
              particleData.velocity[i3 + 2] *= -collider.bounce;
            }
          }
          break;
        }
      }
    }
  }
