// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';

export interface MeshStats {
  triangleCount: number;
  vertexCount: number;
}

export function optimizeMeshes(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      geometry.deleteAttribute('tangent');
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  });
}

export function computeNormals(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.computeVertexNormals();
    }
  });
}

export function centerModel(object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
}

export function normalizeScale(object: THREE.Object3D, targetScale: number): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetScale / maxDim;
  object.scale.multiplyScalar(scale);
}

export function applyTransforms(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.applyMatrix4(child.matrixWorld);
      child.position.set(0, 0, 0);
      child.rotation.set(0, 0, 0);
      child.scale.set(1, 1, 1);
      child.updateMatrix();
    }
  });
}

export function extractMaterials(object: THREE.Object3D): THREE.Material[] {
  const materials = new Set<THREE.Material>();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((material) => materials.add(material));
    }
  });

  return Array.from(materials);
}

export function extractTextures(materials: THREE.Material[]): THREE.Texture[] {
  const textures = new Set<THREE.Texture>();

  for (const material of materials) {
    if (material instanceof THREE.MeshStandardMaterial) {
      if (material.map) textures.add(material.map);
      if (material.normalMap) textures.add(material.normalMap);
      if (material.roughnessMap) textures.add(material.roughnessMap);
      if (material.metalnessMap) textures.add(material.metalnessMap);
      if (material.aoMap) textures.add(material.aoMap);
      if (material.emissiveMap) textures.add(material.emissiveMap);
      if (material.envMap) textures.add(material.envMap);
    }
  }

  return Array.from(textures);
}

export function calculateMeshStats(object: THREE.Object3D): MeshStats {
  let triangleCount = 0;
  let vertexCount = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      const position = geometry.getAttribute('position');
      const index = geometry.getIndex();

      if (position) {
        vertexCount += position.count;
      }

      if (index) {
        triangleCount += index.count / 3;
      } else if (position) {
        triangleCount += position.count / 3;
      }
    }
  });

  return { triangleCount: Math.floor(triangleCount), vertexCount };
}

export function countMeshes(object: THREE.Object3D): number {
  let count = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) count++;
  });
  return count;
}

export async function generateModelThumbnail(model: THREE.Object3D): Promise<string> {
  const width = 256;
  const height = 256;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const clone = model.clone();
  scene.add(clone);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(
    center.x + maxDim * 1.5,
    center.y + maxDim * 0.5,
    center.z + maxDim * 1.5
  );
  camera.lookAt(center);

  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  renderer.dispose();

  return dataURL;
}
