// @aethel-heavy-async-boundary Studio geometry serialization helpers.
import * as THREE from 'three';
import type { GeometrySerialized } from './types';

export function serializeGeometry(geometry: THREE.BufferGeometry): GeometrySerialized {
  const params = (geometry as unknown as { parameters?: Record<string, number> }).parameters || {};

  if ('width' in params && 'height' in params && 'depth' in params) {
    return { type: 'box', parameters: params };
  }

  if ('radius' in params && 'widthSegments' in params && 'heightSegments' in params) {
    return { type: 'sphere', parameters: params };
  }

  if ('radiusTop' in params && 'radiusBottom' in params && 'height' in params) {
    return { type: 'cylinder', parameters: params };
  }

  if ('radius' in params && 'height' in params && 'radialSegments' in params && !('widthSegments' in params)) {
    return { type: 'cone', parameters: params };
  }

  if ('radius' in params && 'tube' in params && 'radialSegments' in params) {
    return { type: 'torus', parameters: params };
  }

  if ('width' in params && 'height' in params && !('depth' in params)) {
    return { type: 'plane', parameters: params };
  }

  const positionAttr = geometry.getAttribute('position');
  const normalAttr = geometry.getAttribute('normal');
  const uvAttr = geometry.getAttribute('uv');
  const indexAttr = geometry.getIndex();

  return {
    type: 'custom',
    parameters: {},
    vertices: positionAttr ? Array.from(positionAttr.array) : undefined,
    normals: normalAttr ? Array.from(normalAttr.array) : undefined,
    uvs: uvAttr ? Array.from(uvAttr.array) : undefined,
    indices: indexAttr ? Array.from(indexAttr.array) : undefined,
  };
}

export function deserializeGeometry(data: GeometrySerialized): THREE.BufferGeometry {
  switch (data.type) {
    case 'box':
      return new THREE.BoxGeometry(
        data.parameters.width || 1,
        data.parameters.height || 1,
        data.parameters.depth || 1,
        data.parameters.widthSegments || 1,
        data.parameters.heightSegments || 1,
        data.parameters.depthSegments || 1
      );
    case 'sphere':
      return new THREE.SphereGeometry(
        data.parameters.radius || 1,
        data.parameters.widthSegments || 32,
        data.parameters.heightSegments || 16
      );
    case 'cylinder':
      return new THREE.CylinderGeometry(
        data.parameters.radiusTop || 1,
        data.parameters.radiusBottom || 1,
        data.parameters.height || 1,
        data.parameters.radialSegments || 32
      );
    case 'cone':
      return new THREE.ConeGeometry(
        data.parameters.radius || 1,
        data.parameters.height || 1,
        data.parameters.radialSegments || 32
      );
    case 'torus':
      return new THREE.TorusGeometry(
        data.parameters.radius || 1,
        data.parameters.tube || 0.4,
        data.parameters.radialSegments || 16,
        data.parameters.tubularSegments || 48
      );
    case 'plane':
      return new THREE.PlaneGeometry(
        data.parameters.width || 1,
        data.parameters.height || 1
      );
    case 'capsule':
      return new THREE.CapsuleGeometry(
        data.parameters.radius || 0.5,
        data.parameters.length || 1,
        data.parameters.capSegments || 4,
        data.parameters.radialSegments || 8
      );
    case 'custom': {
      const geometry = new THREE.BufferGeometry();
      if (data.vertices) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices, 3));
      }
      if (data.normals) {
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
      }
      if (data.uvs) {
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
      }
      if (data.indices) {
        geometry.setIndex(data.indices);
      }
      return geometry;
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}
